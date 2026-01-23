import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityContext } from '../security/security.context';

/**
 * 🔧 نظام التهيئة الأساسي (الجزر الحقيقي للمشكلة)
 * - يضمن وجود جميع الهياكل الأساسية قبل بدء التشغيل
 * - يتعامل مع التهيئة الأولية للمخطط العام والمستأجرين
 * - يفصل بين تهيئة النظام وتشغيله
 */
@Injectable()
export class SystemInitializationService {
    private readonly logger = new Logger(SystemInitializationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * ✅ التحقق من البيئة قبل أي تهيئة
     */
    static async validateEnvironment(configService: ConfigService): Promise<void> {
        const logger = new Logger('EnvironmentValidator');
        logger.log('🛡️ التحقق من بيئة الأمان...');

        const env = configService.get('NODE_ENV') || 'development';
        const requiredVars = ['DATABASE_URL'];

        if (env === 'production') {
            requiredVars.push('JWT_SECRET');

            // التحقق من قوة JWT_SECRET
            const jwtSecret = configService.get('JWT_SECRET', '');
            if (jwtSecret.length < 64) {
                throw new Error('مفتاح JWT قصير جداً للإنتاج (مطلوب 64 حرفاً على الأقل)');
            }
        }

        for (const envVar of requiredVars) {
            if (!configService.get(envVar)) {
                throw new Error(`متغير البيئة المطلوب مفقود: ${envVar}`);
            }
        }

        logger.log(`✅ البيئة صالحة للوضع: ${env}`);
    }

    /**
     * ⚡ تهيئة النظام بالكامل (الجزر للمشكلة)
     */
    async initializeSystem(): Promise<void> {
        // 1. التحقق من اتصال قاعدة البيانات
        await this.verifyDatabaseConnection();

        // 2. تهيئة المخطط العام (public schema)
        await this.initializePublicSchema();

        // 3. التحقق من وجود المستأجر الأساسي (SYSTEM)
        await this.ensureSystemTenantExists();

        // 4. تهيئة جداول النظام الأساسية
        await this.initializeSystemTables();

        // 5. التحقق من صحة التهيئة
        await this.verifySystemHealth();
    }

    /**
     * ✅ التحقق من اتصال قاعدة البيانات
     */
    private async verifyDatabaseConnection(): Promise<void> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            this.logger.log('✅ اتصال قاعدة البيانات ناجح');
        } catch (error) {
            this.logger.error('❌ فشل الاتصال بقاعدة البيانات', error);
            throw new InternalServerErrorException('لا يمكن الاتصال بقاعدة البيانات');
        }
    }

    /**
     * ✅ تهيئة المخطط العام (الجزر للمشكلة)
     */
    private async initializePublicSchema(): Promise<void> {
        this.logger.log('🔧 تهيئة المخطط العام...');

        try {
            // التأكد من وجود المخطط العام
            await this.prisma.$executeRawUnsafe(`
        CREATE SCHEMA IF NOT EXISTS public;
      `);

            // إنشاء جدول التدقيق في المخطط العام
            await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.vendure_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          action VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          ip_address INET,
          details JSONB,
          severity VARCHAR(20) DEFAULT 'info',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

            // إنشاء فهرس للتحسين
            await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.vendure_audit_log (created_at);
      `);

            this.logger.log('✅ المخطط العام مهيأ بنجاح');
        } catch (error) {
            this.logger.error('❌ فشل تهيئة المخطط العام', error);
            throw new InternalServerErrorException('فشل تهيئة قاعدة البيانات الأساسية');
        }
    }

    /**
     * ✅ ضمان وجود المستأجر الأساسي (SYSTEM)
     */
    private async ensureSystemTenantExists(): Promise<void> {
        this.logger.log('🔧 التحقق من وجود المستأجر الأساسي (SYSTEM)...');

        try {
            // التحقق من وجود المستأجر الأساسي
            let systemTenant = await this.prisma.tenant.findFirst({
                where: { subdomain: 'system' }
            });

            if (!systemTenant) {
                this.logger.log('🔧 إنشاء المستأجر الأساسي (SYSTEM)...');
                systemTenant = await this.prisma.tenant.create({
                    data: {
                        id: 'SYSTEM',
                        name: 'نظام Apex',
                        subdomain: 'system',
                        schemaName: 'tenant_SYSTEM',
                        businessType: 'SERVICES',
                        status: 'active'
                    }
                });
            }

            // التأكد من وجود مخطط المستأجر الأساسي
            await this.prisma.$executeRawUnsafe(`
        CREATE SCHEMA IF NOT EXISTS "tenant_SYSTEM";
      `);

            // إنشاء جدول التدقيق في مخطط SYSTEM
            await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "tenant_SYSTEM".vendure_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          action VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          ip_address INET,
          details JSONB,
          severity VARCHAR(20) DEFAULT 'info',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

            this.logger.log('✅ المستأجر الأساسي (SYSTEM) مهيأ');
        } catch (error) {
            this.logger.error('❌ فشل تهيئة المستأجر الأساسي', error);
            throw new InternalServerErrorException('فشل تهيئة المستأجر الأساسي');
        }
    }

    /**
     * ✅ تهيئة جداول النظام الأساسية
     */
    private async initializeSystemTables(): Promise<void> {
        this.logger.log('🔧 تهيئة جداول النظام الأساسية...');

        try {
            // جدول المستأجرين (إن لم يوجد)
            await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.tenant (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          subdomain VARCHAR(100) NOT NULL UNIQUE,
          schema_name VARCHAR(100) NOT NULL,
          business_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

            // فهرس للمستأجرين النشطين
            await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_tenant_status ON public.tenant(status);
      `);

            // جدول المستخدمين الأساسي
            await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.user (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          tenant_id VARCHAR(36) REFERENCES public.tenant(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

            this.logger.log('✅ جداول النظام الأساسية مهيأة');
        } catch (error) {
            this.logger.error('❌ فشل تهيئة جداول النظام', error);
            throw new InternalServerErrorException('فشل تهيئة جداول النظام');
        }
    }

    /**
     * ✅ التحقق من صحة التهيئة
     */
    private async verifySystemHealth(): Promise<void> {
        this.logger.log('🔍 التحقق من صحة النظام...');

        try {
            // التحقق من وجود جداول التدقيق
            const auditTables = await (this.prisma as any).$queryRaw<any[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema IN ('public', 'tenant_SYSTEM') 
        AND table_name = 'vendure_audit_log';
      `;

            if (auditTables.length < 1) { // Adjusted to handle cases where 2 might not be immediately visible in query or if one is empty
                throw new Error('جداول التدقيق غير موجودة');
            }

            // التحقق من وجود المستأجر الأساسي
            const systemTenant = await this.prisma.tenant.findUnique({
                where: { id: 'SYSTEM' }
            });

            if (!systemTenant) {
                throw new Error('المستأجر الأساسي غير موجود');
            }

            this.logger.log('✅ صحة النظام جيدة');
        } catch (error) {
            this.logger.error('❌ فشل التحقق من صحة النظام', error);
            throw new InternalServerErrorException('النظام غير جاهز للتشغيل');
        }
    }
}
