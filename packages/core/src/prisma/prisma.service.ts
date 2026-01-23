import { Injectable, OnModuleInit, OnModuleDestroy, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private currentSchema: string | null = null;
    private isHealthy = false;

    async onModuleInit() {
        try {
            // محاولة الاتصال مع إعادة المحاولة
            await this.connectWithRetry(3, 2000);
            this.isHealthy = true;
            this.logger.log('✅ Connected to database successfully');

            // تطبيق إعدادات الأمان
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
    * 🛡️ S1: الاتصال مع إعادة المحاولة
    */
    private async connectWithRetry(maxRetries = 3, delayMs = 1000): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.$connect();
                return;
            } catch (error) {
                this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }

    /**
    * 🛡️ S1: التحقق من صحة الاتصال
    */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.$queryRaw`SELECT 1`;
            this.isHealthy = true;
            return true;
        } catch (error) {
            this.isHealthy = false;
            this.logger.error('Database connection verification failed', error);
            return false;
        }
    }

    /**
    * 🛡️ S2: تغيير مخطط قاعدة البيانات للمستأجر
    */
    async setTenantSchema(schemaName: string): Promise<void> {
        if (!schemaName) throw new InternalServerErrorException('Schema name is required');

        // التحقق من سلامة اسم المخطط
        const safeSchemaName = schemaName.replace(/[^a-zA-Z0-9_]/g, '');
        if (safeSchemaName !== schemaName) {
            this.logger.warn(`Unsafe schema name detected: ${schemaName}`);
        }

        try {
            await this.$executeRawUnsafe(`SET search_path TO "${safeSchemaName}"`);
            this.currentSchema = safeSchemaName;
            this.logger.debug(`Schema set to: ${safeSchemaName}`);
        } catch (error) {
            this.logger.error(`Failed to set schema ${safeSchemaName}:`, error);
            throw new InternalServerErrorException('Database schema error');
        }
    }

    getCurrentSchema(): string | null {
        return this.currentSchema;
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

            this.logger.log('🛡️ Security hardening applied to Prisma Service');
        } catch (error) {
            this.logger.warn('⚠️ Warning: Failed to apply security hardening', error);
        }
    }

    /**
    * 🛡️ S5: الحصول على حالة الخدمة
    */
    getHealthStatus() {
        return {
            isHealthy: this.isHealthy,
            currentSchema: this.currentSchema,
            lastChecked: new Date().toISOString(),
        };
    }
}
