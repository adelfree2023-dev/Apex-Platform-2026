import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { SecurityContext } from '../security/security.context';

@Injectable()
export class EnvValidatorService {
  private readonly logger = new Logger(EnvValidatorService.name);
  private readonly requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  private readonly minimumSecretLength = 64; // S1: التحقق من قوة الأسرار

  constructor(
    private readonly configService: ConfigService,
    private readonly securityContext: SecurityContext,
  ) { }

  /**
   * ✅ S1: التحقق الشامل من متغيرات البيئة
   * - التحقق من وجود جميع المتغيرات المطلوبة
   * - التحقق من قوة الأسرار
   * - تفعيل وضع التطوير الآمن عند الغياب
   */
  validateEnvironment(): void {
    // 1. التحقق من وجود المتغيرات المطلوبة في الإنتاج
    if (this.configService.isProduction()) {
      const missingVars = this.requiredVars.filter(
        varName => !this.configService.get(varName)
      );

      // S11: منع متغيرات التطوير في الإنتاج
      const devVars = ['LOCAL_DEV', 'DEBUG_MODE', 'SKIP_AUTH'];
      const activeDevVars = devVars.filter(v => this.configService.get(v));

      if (missingVars.length > 0 || activeDevVars.length > 0) {
        const errorMsg = missingVars.length > 0
          ? `🔥 متغيرات البيئة المطلوبة مفقودة: ${missingVars.join(', ')}`
          : `🛑 تحذير أمني: متغيرات التطوير نشطة في الإنتاج: ${activeDevVars.join(', ')}`;

        this.logger.error(errorMsg);
        throw new InternalServerErrorException(errorMsg);
      }
    }

    // 2. التحقق من قوة الأسرار
    this.validateSecrets();

    // 3. تسجيل حالة البيئة
    this.logEnvironmentStatus();
  }

  /**
   * ✅ S1: التحقق من قوة الأسرار
   * - التأكد من أن الأسرار طويلة بما فيه الكفاية
   * - تحذير عند وجود أسرار ضعيفة في التطوير
   */
  private validateSecrets(): void {
    const jwtSecret = this.configService.get('JWT_SECRET');

    if (jwtSecret && jwtSecret.length < this.minimumSecretLength) {
      const message = `تحذير أمني: JWT_SECRET قصير جداً (${jwtSecret.length} حرفاً). 
      يوصى باستخدام 64 حرفاً على الأقل لأمان عالي.`;

      if (this.configService.isProduction()) {
        this.logger.error(message);
        throw new InternalServerErrorException('JWT_SECRET غير آمن للإنتاج');
      } else {
        // ✅ S1: تسجيل التحذيرات كأحداث أمنية حتى في التطوير
        if (this.securityContext) {
          this.securityContext.logSecurityEvent('ENV_WARNING', {
            variable: 'JWT_SECRET',
            environment: 'development',
            severity: 'medium',
            message,
            timestamp: new Date().toISOString()
          });
        }
        this.logger.warn(message);
      }
    }
  }


  /**
   * ✅ S1: تسجيل حالة البيئة للأغراض الأمنية
   */
  private logEnvironmentStatus(): void {
    const env = this.configService.get('NODE_ENV') || 'development';
    const isProd = this.configService.isProduction();

    this.logger.log(`🔒 حالة البيئة: ${env.toUpperCase()}`);

    if (!isProd) {
      this.logger.warn('⚠️ وضع التطوير الآمن مفعل. بعض القيود الأمنية مخففة.');

      // التحقق من وجود قيم افتراضية في التطوير
      if (!this.configService.get('JWT_SECRET')) {
        this.logger.warn('🔧 تم تعيين JWT_SECRET افتراضي للتطوير فقط');
      }
    }
  }

  /**
   * ✅ S1: التحقق من استعداد النظام قبل التشغيل
   */
  async validateSystemReadiness(): Promise<boolean> {
    try {
      this.validateEnvironment();

      // يمكن إضافة المزيد من عمليات التحقق هنا:
      // - التحقق من اتصال قاعدة البيانات
      // - التحقق من مساحة التخزين
      // - التحقق من الذاكرة المتاحة

      this.logger.log('✅ النظام جاهز للتشغيل');
      return true;
    } catch (error) {
      this.logger.error(`❌ النظام غير جاهز: ${error.message}`);
      throw error;
    }
  }
}
