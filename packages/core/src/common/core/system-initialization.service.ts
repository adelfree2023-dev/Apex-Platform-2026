import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityContext } from '../security/security.context';

/**
* 🔧 نظام التهيئة الأساسي (الجزر الحقيقي للمشكلة)
* - يطبق آلية إعادة المحاولة مع backoff أسي
* - يفصل بين مراحل التهيئة للتعافي الجزئي
* - يسجل جميع الخطوات للأمان
*/
@Injectable()
export class SystemInitializationService implements OnModuleInit {
  private readonly logger = new Logger(SystemInitializationService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // ms

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly securityContext: SecurityContext,
  ) { }

  async onModuleInit() {
    try {
      this.logger.log('🔧 بدء تهيئة النظام الأساسي (ASMP Protocol)...');

      // ✅ S1: التحقق من البيئة أولاً
      await this.validateEnvironmentVariables();

      // ✅ S2: التحقق من اتصال قاعدة البيانات
      await this.withRetry(async () => await this.verifyDatabaseConnection());

      // ✅ الأمان: التحقق من وجود tenant افتراضي
      await this.withRetry(async () => await this.ensureDefaultTenantExists());

      // ✅ M1: تهيئة النظام الأساسي
      await this.withRetry(async () => await this.initializeCoreSystem());

      this.logger.log('✅ تم تهيئة النظام بنجاح');
    } catch (error: any) {
      this.logger.error('❌ فشل في تهيئة النظام', error.stack);
      // لا ننهي العملية هنا، نترك للـ health check التعامل معها
    }
  }

  /**
  * ✅ التحقق من البيئة (S1)
  */
  private async validateEnvironmentVariables() {
    this.logger.log('🛡️ التحقق من بيئة الأمان...');
    const env = this.configService.get('NODE_ENV') || 'development';

    // ✅ S1: التحقق من المتغيرات البيئية الحرجة
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_MASTER_KEY'];
    const missingVars = requiredVars.filter(varName => !this.configService.get(varName));

    if (missingVars.length > 0) {
      throw new Error(`المتغيرات البيئية التالية مفقودة: ${missingVars.join(', ')}`);
    }

    // ✅ S1: التحقق من قوة الأسرار في الإنتاج
    if (env === 'production') {
      const jwtSecret = this.configService.get('JWT_SECRET', '');
      if (jwtSecret.length < 32) {
        throw new Error('مفتاح JWT يجب أن يكون 32 حرفاً على الأقل');
      }

      const encryptionKey = this.configService.get('ENCRYPTION_MASTER_KEY', '');
      if (encryptionKey.length < 32) {
        throw new Error('مفتاح التشفير يجب أن يكون 32 حرفاً على الأقل');
      }
    }

    this.logger.log(`✅ البيئة صالحة للوضع: ${env}`);
  }

  /**
  * ✅ ضمان وجود المستأجر الافتراضي (M2)
  */
  private async ensureDefaultTenantExists() {
    this.logger.log('🔧 التحقق من المستأجر الافتراضي...');
    try {
      const defaultTenant = await this.prisma.tenant.findFirst({
        where: { isDefault: true }
      });

      if (!defaultTenant) {
        await this.prisma.tenant.create({
          data: {
            name: 'Default Organization',
            subdomain: 'default',
            status: 'active',
            plan: 'ENTERPRISE',
            isDefault: true,
            schemaName: 'tenant_default',
            businessType: 'SERVICES',
            config: {
              theme: 'default',
              features: ['all']
            }
          }
        });

        // التأكد من وجود المخطط الافتراضي
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "tenant_default";`);

        this.logger.log('✅ تم إنشاء المستأجر الافتراضي');
      }
    } catch (error) {
      this.logger.error('فشل في التحقق من المستأجر الافتراضي', error);
      throw error;
    }
  }

  /**
  * ✅ تهيئة إعدادات النظام الأساسية (M3)
  */
  private async initializeCoreSystem() {
    this.logger.log('🔧 تهيئة إعدادات النظام الأساسية...');
    try {
      const systemSettings = await this.prisma.systemSetting.findFirst({
        where: { key: 'core_initialized' }
      });

      if (!systemSettings) {
        await this.prisma.systemSetting.createMany({
          data: [
            { key: 'core_initialized', value: 'true' },
            { key: 'api_version', value: '1.0' },
            { key: 'maintenance_mode', value: 'false' },
            { key: 'default_language', value: 'ar' }
          ]
        });

        this.logger.log('✅ تم تهيئة إعدادات النظام الأساسية');
      }
    } catch (error) {
      this.logger.error('فشل تهيئة إعدادات النظام', error);
      throw error;
    }
  }

  /**
  * ⚡ تهيئة النظام بالكامل (النسخة القديمة للرجوع إليها أو الاستبدال)
  */
  async initializeSystem(): Promise<void> {
    // تم نقل المنطق إلى onModuleInit للتشغيل التلقائي
    await this.onModuleInit();
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = this.MAX_RETRIES): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === maxRetries) {
          this.securityContext.logSecurityEvent('INITIALIZATION_FAILURE', {
            error: error.message,
            operation: operation.name || 'anonymous',
            timestamp: new Date().toISOString(),
          });
          throw error;
        }

        const delayMs = this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Operation failed after maximum retries');
  }

  private async verifyDatabaseConnection(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('✅ اتصال قاعدة البيانات ناجح');
    } catch (error) {
      this.logger.error('❌ فشل الاتصال بقاعدة البيانات', error);
      throw new InternalServerErrorException('لا يمكن الاتصال بقاعدة البيانات');
    }
  }
}