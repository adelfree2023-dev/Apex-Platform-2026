import { z } from 'zod';
// @ts-ignore
import sanitizeHtml from 'sanitize-html';

/**
 * ✅ S3: المخطط الأساسي لجميع المدخلات
 */
export const BaseSchema = {
  // ✅ S3: التحقق من معرف المستأجر
  tenantId: z.string()
    .uuid('معرف المستأجر يجب أن يكون بصيغة UUID صالحة')
    .min(36, 'معرف المستأجر قصير جداً')
    .max(36, 'معرف المستأجر طويل جداً')
    .trim(),

  // ✅ S3: التحقق من معرف المستخدم
  userId: z.string()
    .uuid('معرف المستخدم يجب أن يكون بصيغة UUID صالحة')
    .min(36, 'معرف المستخدم قصير جداً')
    .max(36, 'معرف المستخدم طويل جداً')
    .trim()
    .optional(),

  // ✅ S3: التحقق من الطلب الأساسي
  baseRequest: z.object({
    tenantId: z.string()
      .uuid('معرف المستأجر يجب أن يكون بصيغة UUID صالحة')
      .min(36, 'معرف المستأجر قصير جداً')
      .max(36, 'معرف المستأجر طويل جداً')
      .trim(),
    userId: z.string()
      .uuid('معرف المستخدم يجب أن يكون بصيغة UUID صالحة')
      .min(36, 'معرف المستخدم قصير جداً')
      .max(36, 'معرف المستخدم طويل جداً')
      .trim()
      .optional(),
  }).strict('بيانات الطلب تحتوي على حقول غير متوقعة'),

  // ✅ S3: التحقق من الاستجابة الأساسية
  baseResponse: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    message: z.string().max(500, 'الرسالة طويلة جداً').optional(),
  }),
};

/**
 * ✅ S3: التحقق من النص الآمن (الخام)
 */
export const SafeTextRawSchema = z.string()
  .min(1, 'النص لا يمكن أن يكون فارغاً')
  .max(1000, 'النص طويل جداً - الحد الأقصى 1000 حرف');

/**
 * ✅ S3: التحقق من النص الآمن (المحول)
 */
export const SafeTextSchema = SafeTextRawSchema
  .transform((val) => val.replace(/[\x00-\x1f]/g, ''))
  .refine((val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), {
    message: 'محتوى غير آمن - تم اكتشاف محاولات حقن JavaScript',
  })
  .refine((val) => !/javascript\s*:/i.test(val), {
    message: 'محتوى غير آمن - تم اكتشاف محاولات حقن JavaScript في الروابط',
  })
  .refine((val) => !/^(\s*({|}|\[|\])\s*)+$/.test(val), {
    message: 'محتوى غير آمن - تم اكتشاف هيكل JSON مشبوه',
  });

/**
 * ✅ S3: التحقق من البريد الإلكتروني (الخام)
 */
export const EmailRawSchema = z.string()
  .email('صيغة البريد الإلكتروني غير صالحة')
  .min(5, 'البريد الإلكتروني قصير جداً')
  .max(255, 'البريد الإلكتروني طويل جداً');

/**
 * ✅ S3: التحقق من البريد الإلكتروني (المحول)
 */
export const EmailSchema = EmailRawSchema
  .transform((email) => email.toLowerCase().trim()
    .replace(/[^\w.@+-]/g, '')
    .replace(/\.{2,}/g, '.')
  )
  .refine((email) => !/[\x00-\x1f]/.test(email), {
    message: 'البريد الإلكتروني يحتوي على أحرف تحكم غير آمنة',
  })
  .refine((email) => !/@(\w+\.)+\w+$/.test(email), { // اكتشاف الحقول المتعددة
    message: 'البريد الإلكتروني يحتوي على معلومات إضافية غير آمنة',
  });

/**
 * ✅ S3: التحقق من كلمات المرور
 */
export const PasswordSchema = z.string()
  .min(12, 'كلمة المرور قصيرة جداً - الحد الأدنى 12 حرفاً')
  .max(128, 'كلمة المرور طويلة جداً')
  .refine((password) => /[A-Z]/.test(password), 'يجب أن تحتوي على حرف كبير')
  .refine((password) => /[a-z]/.test(password), 'يجب أن تحتوي على حرف صغير')
  .refine((password) => /[0-9]/.test(password), 'يجب أن تحتوي على رقم')
  .refine((password) => /[^A-Za-z0-9]/.test(password), 'يجب أن تحتوي على رمز خاص')
  .refine((password) => !/password|123456|admin|qwerty|letmein/i.test(password), 'كلمة مرور ضعيفة')
  .refine((password) => !/(\w)\1{2,}/.test(password), 'كلمة المرور تحتوي على أحرف متكررة')
  .transform((password) => password.replace(/[\x00-\x1f]/g, ''))
  .refine((password) => password.length >= 12, 'كلمة المرور قصيرة جداً بعد إزالة الأحرف غير الآمنة');

/**
 * ✅ S3: التحقق من الأرقام الآمنة (الخام - لدعم الوراثة)
 */
export const SafeNumberRawSchema = z.number()
  .min(0, 'الرقم لا يمكن أن يكون سالباً')
  .max(1000000000, 'الرقم كبير جداً');

/**
 * ✅ S3: التحقق من الأرقام الآمنة (المحول)
 */
export const SafeNumberSchema = SafeNumberRawSchema
  .refine((num) => !isNaN(num), {
    message: 'القيمة ليست رقماً صالحاً',
  })
  .refine((num) => Math.abs(num) < 1000000000000, {
    message: 'الرقم كبير جداً وقد يسبب مشاكل في الأداء',
  });

/**
 * ✅ S3: التحقق من التواريخ الآمنة
 */
export const SafeDateSchema = z.string()
  .datetime({ offset: true })
  .refine((dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    return date <= now && date >= new Date(now.getFullYear() - 100, 0, 1);
  }, 'تاريخ غير صالح - يجب أن يكون تاريخاً معقولاً')
  .refine((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, 'القيمة ليست تاريخاً صالحاً');

/**
 * ✅ S3: التحقق من الأسماء (الخام)
 */
export const NameRawSchema = z.string()
  .min(2, 'الاسم قصير جداً')
  .max(50, 'الاسم طويل جداً')
  .regex(/^[a-zA-Z\u0600-\u06FF\s.'-]+$/, 'يحتوي على أحرف غير صالحة');

/**
 * ✅ S3: التحقق من الأسماء (المحول)
 */
export const NameSchema = NameRawSchema
  .transform((name) => name.trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\w\s.'-]/g, '')
  )
  .refine((name) => name.length >= 2, 'الاسم قصير جداً بعد التنظيف');

/**
 * ✅ S3: التحقق من المعرفات الخارجية (الخام)
 */
export const ExternalIdRawSchema = z.string()
  .min(1, 'المعرف الخارجي لا يمكن أن يكون فارغاً')
  .max(255, 'المعرف الخارجي طويل جداً')
  .regex(/^[a-zA-Z0-9_-]+$/, 'يحتوي على أحرف غير صالحة');

/**
 * ✅ S3: التحقق من المعرفات الخارجية (المحول)
 */
export const ExternalIdSchema = ExternalIdRawSchema
  .transform((id) => id.trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
  )
  .refine((id) => id.length >= 1, 'المعرف الخارجي فارغ بعد التنظيف');

/**
 * ✅ S3: التحقق من طلبات البحث
 */
export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'طلب البحث لا يمكن أن يكون فارغاً').max(100, 'طلب البحث طويل جداً'),
  page: z.number().min(1, 'رقم الصفحة غير صالح').max(1000, 'رقم الصفحة كبير جداً').default(1),
  limit: z.number().min(1, 'حد النتائج غير صالح').max(100, 'الحد كبير جداً').default(10),
});

/**
 * ✅ S3: التحقق من طلبات التصفية
 */
export const FilterSchema = z.object({
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  sort: z.record(z.string(), z.enum(['asc', 'desc'])).optional(),
});

/**
 * ✅ S3: دالة التحقق الشاملة
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 📝 تسجيل محاولة إدخال غير صالح
      console.warn('Security Alert: Invalid input detected', {
        errors: error.errors,
        input: JSON.stringify(data).substring(0, 200) // تحديد الطول لمنع DoS
      });
    }
    throw new Error('بيانات الإدخال غير صالحة - تم رفض الطلب لأسباب أمنية');
  }
}

/**
 * ✅ S3: دالة التحقق الآمن من المدخلات مع تسجيل
 */
export async function secureValidate(input: unknown, schema: z.ZodSchema, context: {
  tenantId: string;
  userId?: string;
  operation: string;
}): Promise<unknown> {
  try {
    const validated = schema.parse(input);

    // 📝 تسجيل التحقق الناجح للأغراض الأمنية
    if (process.env.NODE_ENV === 'production') {
      console.log('AUDIT: Input validation successful', {
        tenantId: context.tenantId,
        userId: context.userId,
        operation: context.operation,
        timestamp: new Date().toISOString()
      });
    }

    return validated;
  } catch (error) {
    // 🚨 تسجيل محاولة اختراق محتملة
    console.error('SECURITY ALERT: Failed input validation attempt', {
      tenantId: context.tenantId,
      userId: context.userId || 'unknown',
      operation: context.operation,
      errors: error instanceof z.ZodError ? error.errors : [error.message],
      rawInput: JSON.stringify(input).substring(0, 200) // تحديد الطول لمنع DoS
    });

    // 🛡️ إرجاع خطأ عام دون تفاصيل تقنية
    throw new Error('تم رفض الطلب - البيانات غير آمنة');
  }
}
