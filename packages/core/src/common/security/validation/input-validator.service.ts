import { Injectable, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import { z } from 'zod';
import { SanitizerService } from './sanitizer.service';
@Injectable()
export class InputValidatorService {
  private readonly logger = new Logger(InputValidatorService.name);

  constructor(
    private readonly sanitizer: SanitizerService,
    @Optional() @Inject('SECURITY_LOGGER') private readonly securityLogger?: any,
  ) { }

  /**
  * 🛡️ S3: التحقق الآمن من معرف المستأجر
  * - معالجة خاصة لتجنب الاعتماديات الدائرية
  */
  getTenantIdSchema() {
    return z.object({
      tenantId: z.string()
        .uuid({ message: 'معرف المستأجر غير صالح' })
        .transform(id => id.toLowerCase().trim())
        .refine(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id), {
          message: 'صيغة UUID غير صالحة'
        }),
    });
  }

  /**
  * 🛡️ S5: تسجيل أمان آمن
  */
  private async logValidationFailure(context: string, error: any): Promise<void> {
    try {
      const safeError = {
        name: error.name || 'ValidationError',
        message: error.message || 'فشل التحقق من المدخلات',
        path: error.path || [],
      };

      // استخدام الـ fallback logger
      if (this.securityLogger) {
        this.securityLogger.logEvent('INPUT_VALIDATION_FAILURE', {
          context,
          error: safeError,
          timestamp: new Date().toISOString(),
        });
      }
      // التسجيل الأساسي
      else {
        this.logger.warn(`Validation failure in ${context}: ${JSON.stringify(safeError)}`);
        console.warn(`[SECURITY] Validation failure in ${context}`, safeError);
      }
    } catch (loggingError) {
      this.logger.error('فشل تسجيل حدث التحقق', loggingError);
    }
  }

  /**
  * 🛡️ S3: التحقق الآمن من المدخلات
  * - التحقق ثم التطهير وليس العكس
  * - معالجة موحدة للأخطاء
  */
  async secureValidate<T>(schema: z.ZodSchema<T>, data: unknown, context: string = 'generic'): Promise<T> {
    try {
      // 1. التطهير الأولي
      const sanitizedData = this.sanitizer.sanitizeObject(data);

      // 2. التحقق الصارم
      const validatedData = schema.parse(sanitizedData);

      // 3. تطهير إضافي للبيانات المفحوصة
      return this.sanitizer.sanitizeObject(validatedData) as T;
    } catch (error) {
      await this.logValidationFailure(context, error);
      this.logger.warn(`S3: فشل التحقق في ${context}`);

      throw new BadRequestException({
        statusCode: 400,
        message: 'بيانات الإدخال غير صالحة - تم رفض الطلب لأسباب أمنية',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
