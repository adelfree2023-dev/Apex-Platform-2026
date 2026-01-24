import { z } from 'zod';
import * as sanitizeHtml from 'sanitize-html';

/*** ✅ S3: المخطط الأساسي لجميع المدخلات - النسخة المطورة*/
export const BaseSchema = {
  // ✅ S3: التحقق من معرف المستأجر مع حماية إضافية
  tenantId: z.string()
    .uuid('معرف المستأجر يجب أن يكون بصيغة UUID صالحة')
    .min(36, 'معرف المستأجر قصير جداً')
    .max(36, 'معرف المستأجر طويل جداً')
    .trim()
    .refine(val => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
      message: 'صيغة معرف المستأجر غير صالحة'
    }),

  // ✅ S3: التحقق من معرف المستخدم
  userId: z.string()
    .uuid('معرف المستخدم يجب أن يكون بصيغة UUID صالحة')
    .min(36, 'معرف المستخدم قصير جداً')
    .max(36, 'معرف المستخدم طويل جداً')
    .trim(),

  // ✅ S3: حقل آمن من حقن HTML والـ XSS
  safeText: z.string()
    .min(1, 'النص مطلوب')
    .max(500, 'النص طويل جداً')
    .trim()
    .transform(text => sanitizeHtml(text, {
      allowedTags: [],
      allowedAttributes: {}
    })),

  // ✅ S3: بريد إلكتروني آمن
  emailAddress: z.string()
    .email('صيغة البريد الإلكتروني غير صالحة')
    .min(5, 'البريد الإلكتروني قصير جداً')
    .max(255, 'البريد الإلكتروني طويل جداً')
    .transform(email => email.toLowerCase().trim()),

  // ✅ S3: رقم هاتف آمن
  phoneNumber: z.string()
    .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'صيغة رقم الهاتف غير صالحة')
    .min(10, 'رقم الهاتف قصير جداً')
    .max(20, 'رقم الهاتف طويل جداً')
    .transform(phone => phone.replace(/\D/g, '')),

  // ✅ S3: اسم آمن
  name: z.string()
    .min(2, 'الاسم قصير جداً')
    .max(100, 'الاسم طويل جداً')
    .trim(),

  // ✅ S3: رقم آمن
  number: z.coerce.number()
};

// ✅ S3: المخططات المصدرة للتوافق مع DTOs الأخرى
export const SafeTextRawSchema = z.string().trim();
export const SafeTextSchema = BaseSchema.safeText;
export const EmailRawSchema = z.string().email();
export const EmailSchema = BaseSchema.emailAddress;
export const NameRawSchema = BaseSchema.name;
export const NameSchema = BaseSchema.name;
export const SafeNumberRawSchema = z.coerce.number();
export const SafeNumberSchema = BaseSchema.number;
export const ExternalIdRawSchema = z.string().trim();
export const ExternalIdSchema = ExternalIdRawSchema;

// ✅ S3: مخطط التحقق الأساسي لجميع المدخلات
export const BaseInputSchema = z.object({
  tenantId: BaseSchema.tenantId,
  userId: BaseSchema.userId,
  timestamp: z.number()
    .int('الطابع الزمني يجب أن يكون رقماً صحيحاً')
    .min(Date.now() - 60000, 'الطابع الزمني قديم جداً')
    .max(Date.now() + 60000, 'الطابع الزمني في المستقبل').optional(), // Optional to avoid strict time sync issues during dev
  requestId: z.string()
    .uuid('معرف الطلب يجب أن يكون بصيغة UUID صالحة')
    .min(36, 'معرف الطلب قصير جداً')
    .max(36, 'معرف الطلب طويل جداً')
    .trim().optional()
}).transform(data => {
  // تنقية جميع الحقول النصية (Extra Safety Layer)
  return Object.keys(data).reduce((cleanData: any, key: string) => {
    if (typeof (data as any)[key] === 'string') {
      cleanData[key] = (data as any)[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/javascript:/gi, '') // Remove js proto
        .replace(/on\w+=/gi, ''); // Remove event handlers
    } else {
      cleanData[key] = (data as any)[key];
    }
    return cleanData;
  }, {} as any);
});

// ✅ S3: دالة التحقق الآمن
export function secureValidate<T>(schema: z.ZodType<T>, data: any): T {
  try {
    // ✅ S3: إضافة معلومات إضافية للسياق إذا لم تكن موجودة
    if (!data.timestamp) data.timestamp = Date.now();
    if (!data.requestId) data.requestId = require('crypto').randomBytes(16).toString('hex');

    return schema.parse(data);
  } catch (error: any) {
    // ✅ S3: تسجيل محاولات التحقق الفاشلة
    console.error('S3 Validation Failed:', {
      error: error.message,
      data: JSON.stringify(data, null, 2).substring(0, 200) + '...' // تحديد الطول لتجنب تسريب البيانات
    });
    throw new Error('فشل التحقق من صحة المدخلات');
  }
}
