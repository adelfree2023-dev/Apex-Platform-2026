import { Injectable, OnModuleInit, OnModuleDestroy, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
* 🏰 Digital Fortress: Prisma Service (S3)
* - يمنع حقن SQL عبر التحقق من صحة الاستعلامات
* - يعزل المستأجرين على مستوى قاعدة البيانات
* - يطبق إعدادات الأمان المتطورة
*/
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private currentSchema: string | null = null;
  private isHealthy = false;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // ms

  async onModuleInit() {
    try {
      await this.connectWithRetry(this.MAX_RETRIES, this.BASE_RETRY_DELAY);
      this.isHealthy = true;
      this.logger.log('✅ Connected to database successfully');
      await this.applySecurityHardening();
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw new InternalServerErrorException('Failed to connect to database');
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Prisma connection closed gracefully');
    } catch (error) {
      this.logger.error('⚠️ Warning: Failed to close database connection', error);
    }
  }

  /**
  * 🛡️ S3: الاتصال مع إعادة المحاولة مع backoff أسي
  */
  public async connectWithRetry(maxRetries = 3, baseDelayMs = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) {
          this.logger.error('❌ All connection attempts failed');
          throw error;
        }
        // Backoff أسي
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
  * 🛡️ S3: التحقق الآمن من الاستعلامات الخام
  */
  $queryRawUnsafe<T = any>(query: string, ...values: any[]): Prisma.PrismaPromise<T> {
    this.validateRawQuery(query);
    return super.$queryRawUnsafe(query, ...values);
  }

  $executeRawUnsafe(query: string, ...values: any[]): Prisma.PrismaPromise<number> {
    this.validateRawQuery(query);
    return super.$executeRawUnsafe(query, ...values);
  }

  private validateRawQuery(query: any): void {
    const queryString = typeof query === 'string' ? query : (query as any).sql;

    // 1. الكشف عن أنماط خطيرة
    const dangerousPatterns = [
      /;\s*drop\s+table\s+/i,
      /;\s*drop\s+schema\s+/i,
      /;\s*delete\s+from\s+/i,
      /;\s*truncate\s+/i,
      /union\s+select/i,
      /information_schema/i,
      /pg_catalog/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(queryString)) {
        this.logger.warn('🚨 Detected potentially dangerous SQL operation', { query: queryString });
        throw new InternalServerErrorException('Potentially dangerous SQL operation blocked');
      }
    }

    // 2. التحقق من عزل المستأجر
    const currentSchema = this.currentSchema;
    if (currentSchema && !queryString.includes(`"${currentSchema}"`) && !queryString.includes(`${currentSchema}`)) {
      this.logger.warn('🚨 SQL query does not target current tenant schema', {
        currentSchema,
        query: queryString.substring(0, 200)
      });
      throw new InternalServerErrorException('SQL query must target current tenant schema');
    }
  }

  /**
  * 🛡️ S2: تغيير مخطط قاعدة البيانات للمستأجر بشكل آمن
  */
  async setTenantSchema(schemaName: string): Promise<void> {
    if (!schemaName) throw new InternalServerErrorException('Schema name is required');

    // التحقق من سلامة اسم المخطط
    const safeSchemaName = schemaName.replace(/[^a-zA-Z0-9_]/g, '');
    if (safeSchemaName !== schemaName) {
      this.logger.warn(`Unsafe schema name detected: ${schemaName}`);
    }

    try {
      // Use super to bypass local validation for system commands and use plain string
      await super.$executeRawUnsafe(`SET search_path TO "${safeSchemaName}"`);
      this.currentSchema = safeSchemaName;
      this.logger.debug(`Schema set to: ${safeSchemaName}`);
    } catch (error) {
      this.logger.error(`Failed to set schema ${safeSchemaName}:`, error);
      throw new InternalServerErrorException('Database schema error');
    }
  }

  async isSchemaReady(schemaName: string): Promise<boolean> {
    try {
      const exists = await super.$queryRawUnsafe<any>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = $1
        ) AS exists`,
        schemaName
      );
      return (exists as any)[0]?.exists || false;
    } catch (error) {
      this.logger.error(`Schema readiness check failed for ${schemaName}:`, error);
      return false;
    }
  }

  /**
  * 🛡️ ASMP: Security Hardening
  */
  async applySecurityHardening(): Promise<void> {
    try {
      // تعيين مهلة للعبارات لمنع الهجمات
      await this.$executeRawUnsafe(`SET statement_timeout = '10000'`);
      // منع عمليات COPY غير المصرح بها
      await this.$executeRawUnsafe(`REVOKE EXECUTE ON FUNCTION pg_catalog.pg_read_file(text) FROM PUBLIC`);
      // منع الوصول إلى نظام الملفات
      await this.$executeRawUnsafe(`REVOKE EXECUTE ON FUNCTION pg_catalog.pg_ls_dir(text) FROM PUBLIC`);
      this.logger.log('🛡️ Security hardening applied to Prisma Service');
    } catch (error) {
      this.logger.warn('⚠️ Warning: Failed to apply security hardening', error);
    }
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      currentSchema: this.currentSchema,
      lastChecked: new Date().toISOString(),
    };
  }
}