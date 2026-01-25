import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.validateEnvironment();
  }

  /**
   * ✅ S1: الحصول على قيمة متغير البيئة
   * - مع القيمة الافتراضية للأمان
   */
  get(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * ✅ S1: التحقق مما إذا كنا في وضع الإنتاج
   */
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * ✅ S1: التحقق مما إذا كان المفتاح يحتوي على سر
   */
  private isSecretKey(key: string): boolean {
    const secretKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'JWT', 'DB_PASS'];
    return secretKeys.some(secret => key.toUpperCase().includes(secret));
  }

  /**
   * ✅ S1: إخفاء جزء من السر لتجنب التسريب
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 4) return '***';
    return `${secret.substring(0, 2)}***${secret.substring(secret.length - 2)}`;
  }

  /**
   * ✅ S1: التحقق من صحة متغيرات البيئة الأساسية
   */
  private validateEnvironment(): void {
    const nodeEnv = this.get('NODE_ENV', 'development') as string;

    if (['development', 'staging', 'production'].includes(nodeEnv)) {
      this.logger.log(`Environment set to: ${nodeEnv}`);
    } else {
      this.logger.warn(`Invalid NODE_ENV value: ${nodeEnv}. Defaulting to 'development'`);
      process.env.NODE_ENV = 'development';
    }

    // ✅ S1 (NEW): Strict Production Checks
    if (this.isProduction()) {
      this.validateProductionSecurity();
    }
  }

  private validateProductionSecurity(): void {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`الوضع الإنتاجي يتطلب المتغيرات التالية: ${missingVars.join(', ')}`);
    }

    // التحقق من قوة أسرار JWT
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('مفتاح JWT يجب أن يكون 32 حرفاً على الأقل في وضع الإنتاج');
    }
  }

  /**
   * ✅ S1: الحصول على رقم من بيئة التشغيل
   */
  getNumber(key: string, defaultValue?: number): number | undefined {
    const value = this.get(key);
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * ✅ S1: الحصول على قيمة منطقية من بيئة التشغيل
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;

    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
}
