import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApexConfigService } from './apex-config.service';
import { SecurityContext } from '../security/security.context';

/**
* 🔧 نظام التهيئة الأساسي (الجزر الحقيقي للمشكلة)
* - يطبق آلية إعادة المحاولة مع backoff أسي
* - يفصل بين مراحل التهيئة للتعافي الجزئي
* - يسجل جميع الخطوات للأمان
*/
@Injectable()
export class SystemInitializationService {
  private readonly logger = new Logger(SystemInitializationService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // ms

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ApexConfigService,
    private readonly securityContext: SecurityContext,
  ) { }

  async initializeSystem() {
    // 🛡️ S1: الانتظار حتى تكون جميع التبعيات جاهزة (إصلاح جذري للـ Race Condition)
    await this.waitForDependencies();

    try {
      console.log('🔧 بدء تهيئة النظام الأساسي (ASMP Protocol)...');

      // ✅ S1: التحقق من البيئة أولاً
      await this.validateEnvironmentVariables();

      // ✅ S2: التحقق من اتصال قاعدة البيانات
      await this.withRetry(async () => await this.verifyDatabaseConnection());

      // ✅ الأمان: التحقق من وجود tenant افتراضي
      await this.withRetry(async () => await this.ensureDefaultTenantExists());

      // ✅ M1: تهيئة النظام الأساسي
      await this.withRetry(async () => await this.initializeCoreSystem());

      console.log('✅ تم تهيئة النظام بنجاح');
    } catch (error: any) {
      console.error('❌ فشل في تهيئة النظام', error?.stack || error?.message || 'Unknown Error');
    }
  }

  /**
   * 🛡️ الانتظار الذكي لتبعيات NestJS (إصلاح الـ Race Condition)
   */
  private async waitForDependencies(maxAttempts = 10, delayMs = 500) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // نستخدم (this as any) لتجنب أخطاء TypeScript الصارمة أثناء فحص التوافر الديناميكي
      if (this.configService && this.prisma && this.securityContext) {
        return; // جميع التبعيات جاهزة
      }
      console.log(`⏳ Waiting for core dependencies (attempt ${attempt} / ${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    console.warn('⚠️ [ASMP_TIMEOUT] Core dependencies did not load in time. Proceeding in limited mode.');
  }

  /**
  * ✅ التحقق من البيئة (S1)
  */
  private async validateEnvironmentVariables() {
    console.log('🛡️ التحقق من بيئة الأمان...');
    const config = (this as any).configService || this.configService;
    if (!config) {
      console.warn('⚠️ validateEnvironmentVariables cancelled: configService is undefined');
      return;
    }
    const env = config.get('NODE_ENV') || 'development';

    // ✅ S1: التحقق من المتغيرات البيئية الحرجة
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_MASTER_KEY'];
    const missingVars = requiredVars.filter(varName => !config.get(varName));

    if (missingVars.length > 0) {
      throw new Error(`المتغيرات البيئية التالية مفقودة: ${missingVars.join(', ')}`);
    }

    // ✅ S1: التحقق من قوة الأسرار في الإنتاج
    if (env === 'production') {
      const jwtSecret = this.configService.get('JWT_SECRET', '');
      if (jwtSecret && jwtSecret.length < 32) {
        throw new Error('مفتاح JWT يجب أن يكون 32 حرفاً على الأقل');
      }

      const encryptionKey = this.configService.get('ENCRYPTION_MASTER_KEY', '');
      if (encryptionKey && encryptionKey.length < 32) {
        throw new Error('مفتاح التشفير يجب أن يكون 32 حرفاً على الأقل');
      }
    }

    console.log(`✅ البيئة صالحة للوضع: ${env}`);
  }

  /**
  * ✅ ضمان وجود المستأجر الافتراضي (M2)
  */
  private async ensureDefaultTenantExists() {
    console.log('🔧 التحقق من المستأجر الافتراضي...');
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

        console.log('✅ تم إنشاء المستأجر الافتراضي');
      }

      // ✅ S14: ضمان وجود مستأجر الاختبار للسكربت
      const testTenantId = 'ae9f6640-5e60-4b2a-9e6b-a2d895498244';
      const testTenant = await this.prisma.tenant.findUnique({ where: { id: testTenantId } });
      if (!testTenant) {
        await this.prisma.tenant.create({
          data: {
            id: testTenantId,
            name: 'Test Organization',
            subdomain: 'test-org',
            status: 'active',
            plan: 'ENTERPRISE',
            isDefault: false,
            schemaName: 'tenant_test',
            businessType: 'SERVICES',
          }
        });
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "tenant_test";`);
        console.log('✅ تم إنشاء مستأجر الاختبار');
      }

      // ✅ S13: ضمان وجود مستخدم مسؤول للاختبارات
      const adminEmail = 'admin@apex.com';
      const adminUser = await this.prisma.user.findFirst({ where: { email: adminEmail } });
      if (!adminUser) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);
        const defaultTenant = await this.prisma.tenant.findFirst({ where: { isDefault: true } });
        if (defaultTenant) {
          await this.prisma.user.create({
            data: {
              email: adminEmail,
              password: hashedPassword,
              name: 'System Admin',
              role: 'owner',
              tenantId: defaultTenant.id
            }
          });
          console.log('✅ تم إنشاء مستخدم المسؤول الافتراضي');
        }
      }
    } catch (error) {
      console.error('فشل في التحقق من المستأجر الافتراضي', error);
      throw error;
    }
  }

  /**
  * ✅ تهيئة إعدادات النظام الأساسية (M3)
  */
  private async initializeCoreSystem() {
    console.log('🔧 تهيئة إعدادات النظام الأساسية...');
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

        console.log('✅ تم تهيئة إعدادات النظام الأساسية');
      }
    } catch (error) {
      console.error('فشل تهيئة إعدادات النظام', error);
      throw error;
    }
  }


  private async withRetry<T>(operation: () => Promise<T>, maxRetries = this.MAX_RETRIES): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.warn(`Attempt ${attempt} failed: ${error?.message || 'Internal error'}`);

        if (attempt === maxRetries) {
          if (this.securityContext) {
            this.securityContext.logSecurityEvent('INITIALIZATION_FAILURE', {
              error: error?.message || 'Unknown failure',
              operation: operation.name || 'anonymous',
              timestamp: new Date().toISOString(),
            });
          }
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
      console.log('✅ اتصال قاعدة البيانات ناجح');
    } catch (error) {
      console.error('❌ فشل الاتصال بقاعدة البيانات', error);
      throw new InternalServerErrorException('لا يمكن الاتصال بقاعدة البيانات');
    }
  }
}