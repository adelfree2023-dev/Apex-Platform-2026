import { z } from 'zod';
import { SafeTextRawSchema, EmailRawSchema, NameRawSchema, ExternalIdRawSchema, SafeTextSchema, EmailSchema, NameSchema, ExternalIdSchema } from './base.dto';

// ✅ S3: نوع الأعمال
export const BusinessTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'SERVICES', 'RESTAURANT', 'MARKETPLACE']);

// ✅ S3: تفضيل التعاون
export const CooperationPreferenceEnum = z.enum(['open', 'selective', 'closed']);

// ✅ S3: حالة المستأجر
export const TenantStatusEnum = z.enum(['active', 'suspended', 'inactive']);

// ✅ S3: نموذج إنشاء مستأجر
export const CreateTenantSchema = z.object({
  // المعلومات الأساسية
  name: NameRawSchema
    .min(2, 'اسم المتجر قصير جداً')
    .max(255, 'اسم المتجر طويل جداً'),
  displayName: SafeTextRawSchema
    .max(100, 'اسم العرض طويل جداً')
    .optional(),

  // النطاق الفرعي
  subdomain: z.string()
    .min(3, 'النطاق الفرعي قصير جداً')
    .max(50, 'النطاق الفرعي طويل جداً')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'صيغة النطاق الفرعي غير صالحة')
    .refine((domain) => !['admin', 'api', 'www', 'app', 'dashboard', 'super', 'apex', 'localhost'].includes(domain), {
      message: 'النطاق الفرعي محجوز',
    }),

  // التفاصيل التجارية
  businessType: BusinessTypeEnum,
  territory: SafeTextRawSchema
    .min(1, 'المنطقة مطلوبة')
    .max(100, 'المنطقة طويلة جداً'),
  businessDescription: SafeTextRawSchema
    .max(500, 'وصف الأعمال طويل جداً')
    .optional(),

  // الاتصال
  contactEmail: EmailRawSchema
    .optional(),
  contactPhone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'صيغة الهاتف غير صالحة')
    .optional(),
  supportEmail: EmailRawSchema
    .optional(),
  supportPhone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'صيغة الهاتف غير صالحة')
    .optional(),

  // التعاون
  cooperationPreference: CooperationPreferenceEnum.default('open').optional(),
  cooperativeDealShare: z.number()
    .min(0, 'نسبة المشاركة لا يمكن أن تكون سالبة')
    .max(100, 'نسبة المشاركة كبيرة جداً')
    .default(10)
    .optional(),
  fulfillmentRadius: z.number()
    .min(0, 'نصف قطر التوصيل لا يمكن أن يكون سالباً')
    .max(1000, 'نصف قطر التوصيل كبير جداً')
    .default(10)
    .optional(),

  // التكوين
  currency: z.string()
    .length(3, 'رمز العملة يجب أن يكون 3 أحرف')
    .regex(/^[A-Z]{3}$/, 'رمز العملة غير صالح')
    .default('EGP')
    .optional(),
  language: z.string()
    .length(2, 'رمز اللغة يجب أن يكون حرفين')
    .regex(/^[a-z]{2}$/, 'رمز اللغة غير صالح')
    .default('ar')
    .optional(),
  timeZone: z.string()
    .min(3, 'المنطقة الزمنية قصيرة جداً')
    .max(50, 'المنطقة الزمنية طويلة جداً')
    .default('Africa/Cairo')
    .optional(),

  // الأمان
  allowedOrigins: z.array(z.string().url())
    .max(10, 'عدد المصادر المسموح بها تجاوز الحد الأقصى (10)')
    .default(['https://apex-platform.com'])
    .optional(),
  sessionTimeout: z.number()
    .int('وقت مهلة الجلسة يجب أن يكون عدداً صحيحاً')
    .min(300, 'وقت مهلة الجلسة قصير جداً (الحد الأدنى 5 دقائق)')
    .max(86400, 'وقت مهلة الجلسة طويل جداً (الحد الأقصى 24 ساعة)')
    .default(3600)
    .optional(),
});

// ✅ S3: نموذج تحديث مستأجر
export const UpdateTenantSchema = CreateTenantSchema.partial().extend({
  id: ExternalIdRawSchema
    .min(36, 'معرف المستأجر قصير جداً')
    .max(36, 'معرف المستأجر طويل جداً'),
  status: TenantStatusEnum.optional(),
});

// ✅ S3: نموذج خطة الاشتراك
export const PlanTierEnum = z.enum(['FREE', 'PRO', 'ENTERPRISE']);
export const PlanFeatureEnum = z.enum([
  'BASIC_ECOMMERCE',
  'ADVANCED_ANALYTICS',
  'AI_RECOMMENDATIONS',
  'MARKETPLACE',
  'MULTI_WAREHOUSE',
  'SOCIAL_COMMERCE',
  'AFFILIATE_PROGRAM',
  'UNLIMITED_PRODUCTS',
  'UNLIMITED_ORDERS',
  'API_ACCESS',
  'CUSTOM_BRANDING',
  'PRIORITY_SUPPORT',
]);

export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string()
    .min(2, 'اسم الخطة قصير جداً')
    .max(100, 'اسم الخطة طويل جداً'),
  description: SafeTextRawSchema
    .max(500, 'وصف الخطة طويل جداً')
    .optional(),
  tier: PlanTierEnum,
  price: z.number()
    .min(0, 'السعر لا يمكن أن يكون سالباً')
    .max(1000000, 'السعر كبير جداً'),
  currency: z.string()
    .length(3, 'رمز العملة يجب أن يكون 3 أحرف')
    .regex(/^[A-Z]{3}$/, 'رمز العملة غير صالح')
    .default('EGP'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  features: z.array(PlanFeatureEnum).min(1),
  limits: z.object({
    products: z.number().int().min(0).max(1000000).default(0).optional(),
    orders: z.number().int().min(0).max(1000000).default(0).optional(),
    customers: z.number().int().min(0).max(1000000).default(0).optional(),
    apiCalls: z.number().int().min(0).max(10000000).default(0).optional(),
    storage: z.number().int().min(0).max(10000000).default(0).optional(), // بالملغ
  }).optional(),
  isActive: z.boolean().default(true).optional(),
});

// ✅ S3: نموذج تكوين المتجر
export const StoreConfigSchema = z.object({
  // الهوية البصرية
  logoUrl: z.string().url().max(500).optional(),
  faviconUrl: z.string().url().max(500).optional(),
  primaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'رمز اللون غير صالح')
    .optional(),
  secondaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'رمز اللون غير صالح')
    .optional(),

  // الإعدادات العامة
  storeName: NameRawSchema
    .max(100, 'اسم المتجر طويل جداً')
    .optional(),
  storeDescription: SafeTextRawSchema
    .max(500, 'وصف المتجر طويل جداً')
    .optional(),
  storeSlogan: SafeTextRawSchema
    .max(200, 'شعار المتجر طويل جداً')
    .optional(),
  footerText: SafeTextRawSchema
    .max(500, 'نص التذييل طويل جداً')
    .optional(),

  // الاتصال
  contactInfo: z.object({
    address: SafeTextRawSchema.max(255).optional(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
    email: EmailRawSchema.optional(),
    socialLinks: z.record(z.string(), z.string().url()).optional(),
  }).optional(),

  // سياسات المتجر
  policies: z.object({
    shipping: SafeTextRawSchema.optional(),
    returns: SafeTextRawSchema.optional(),
    privacy: SafeTextRawSchema.optional(),
    terms: SafeTextRawSchema.optional(),
  }).optional(),

  // الإعدادات التقنية
  theme: z.object({
    name: z.string().max(50).optional(),
    version: z.string().max(20).optional(),
    config: z.record(z.string(), z.any()).optional(),
  }).optional(),
  seo: z.object({
    titleTemplate: SafeTextRawSchema.max(200).optional(),
    descriptionTemplate: SafeTextRawSchema.max(500).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
    robots: z.enum(['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow']).default('index,follow').optional(),
  }).optional(),
});

// ✅ S3: نموذج طلب تغيير الخطة
export const PlanChangeRequestSchema = z.object({
  tenantId: ExternalIdRawSchema
    .min(36, 'معرف المستأجر قصير جداً')
    .max(36, 'معرف المستأجر طويل جداً'),
  newTier: PlanTierEnum,
  reason: SafeTextRawSchema
    .max(500, 'السبب طويل جداً')
    .optional(),
  requestedBy: ExternalIdRawSchema.optional(),
});

// ✅ S3: نموذج طلب تعليق المستأجر
export const SuspensionRequestSchema = z.object({
  tenantId: ExternalIdRawSchema
    .min(36, 'معرف المستأجر قصير جداً')
    .max(36, 'معرف المستأجر طويل جداً'),
  reason: SafeTextRawSchema
    .min(10, 'السبب قصير جداً')
    .max(500, 'السبب طويل جداً'),
  duration: z.number()
    .int()
    .min(1, 'المدة يجب أن تكون على الأقل يوماً واحداً')
    .max(365, 'المدة طويلة جداً (الحد الأقصى سنة)')
    .optional(),
  requestedBy: ExternalIdRawSchema.optional(),
});

// ✅ S3: نموذج البحث عن المستأجرين
export const TenantSearchSchema = z.object({
  query: SafeTextRawSchema
    .max(100, 'طلب البحث طويل جداً')
    .optional(),
  territory: SafeTextRawSchema
    .max(100, 'المنطقة طويلة جداً')
    .optional(),
  businessType: BusinessTypeEnum.optional(),
  status: TenantStatusEnum.optional(),
  planTier: PlanTierEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['createdAt', 'name', 'territory', 'businessType', 'status']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

// ✅ S3: واجهات النماذج
export type BusinessType = z.infer<typeof BusinessTypeEnum>;
export type CooperationPreference = z.infer<typeof CooperationPreferenceEnum>;
export type TenantStatus = z.infer<typeof TenantStatusEnum>;
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;
export type PlanTier = z.infer<typeof PlanTierEnum>;
export type PlanFeature = z.infer<typeof PlanFeatureEnum>;
export type SubscriptionPlanDto = z.infer<typeof SubscriptionPlanSchema>;
export type StoreConfigDto = z.infer<typeof StoreConfigSchema>;
export type PlanChangeRequestDto = z.infer<typeof PlanChangeRequestSchema>;
export type SuspensionRequestDto = z.infer<typeof SuspensionRequestSchema>;
export type TenantSearchDto = z.infer<typeof TenantSearchSchema>;
