import { z } from 'zod';
import {
  SafeTextRawSchema,
  SafeTextSchema,
  SafeNumberRawSchema,
  SafeNumberSchema,
  EmailRawSchema,
  EmailSchema,
  NameRawSchema,
  NameSchema,
  ExternalIdRawSchema,
  ExternalIdSchema
} from './base.dto';

// ✅ S3: نموذج المنتج الأساسي (Raw Object for chaining)
const ProductObject = {
  id: z.number().int().positive().optional(),
  sku: ExternalIdRawSchema
    .min(3, 'SKU قصير جداً')
    .max(50, 'SKU طويل جداً')
    .optional(),
  barcode: z.string()
    .max(50, 'الباركود طويل جداً')
    .regex(/^[a-zA-Z0-9-]*$/, 'الباركود يحتوي على أحرف غير صالحة')
    .optional(),
  name: NameRawSchema
    .min(2, 'اسم المنتج قصير جداً')
    .max(255, 'اسم المنتج طويل جداً'),
  slug: z.string()
    .min(2, 'الرابط القصير قصير جداً')
    .max(255, 'الرابط القصير طويل جداً')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'صيغة الرابط القصير غير صالحة')
    .optional(),
  description: SafeTextRawSchema
    .max(10000, 'الوصف طويل جداً - الحد الأقصى 10,000 حرف')
    .optional(),
  price: SafeNumberRawSchema
    .min(1, 'السعر يجب أن يكون موجباً')
    .max(999999999, 'السعر كبير جداً'),
  compareAtPrice: SafeNumberRawSchema
    .min(1, 'سعر المقارنة يجب أن يكون موجباً')
    .max(999999999, 'سعر المقارنة كبير جداً')
    .optional(),
  costPrice: SafeNumberRawSchema
    .min(0, 'سعر التكلفة لا يمكن أن يكون سالباً')
    .max(999999999, 'سعر التكلفة كبير جداً')
    .optional(),
  stock: z.number()
    .int('المخزون يجب أن يكون عدداً صحيحاً')
    .min(0, 'المخزون لا يمكن أن يكون سالباً')
    .max(1000000, 'المخزون كبير جداً')
    .default(0)
    .optional(),
  weight: z.number().min(0).max(10000).optional(),
  dimensions: z.object({
    width: z.number().min(0).max(1000).optional(),
    height: z.number().min(0).max(1000).optional(),
    depth: z.number().min(0).max(1000).optional(),
  }).optional(),
  categoryId: z.number().int().positive().optional(),
  brand: NameRawSchema.max(100).optional(),
  tags: z.array(SafeTextRawSchema.max(50)).max(20).optional(),
  cooperativeEligible: z.boolean().default(false).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  replenishmentLeadTime: z.number().int().min(0).max(365).optional(),
  specializationTags: z.array(SafeTextRawSchema.max(50)).max(10).optional(),
  isActive: z.boolean().default(true).optional(),
  isVisible: z.boolean().default(true).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
};

export const ProductSchema = z.object(ProductObject).superRefine((data: any, ctx) => {
  if (data.compareAtPrice && data.price && data.compareAtPrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'سعر المقارنة يجب أن يكون أكبر من السعر الأساسي',
    });
  }
});

// ✅ S3: Use the raw object for partial/omit to avoid ZodEffects issues
export const UpdateProductSchema = z.object(ProductObject).partial().extend({
  id: z.number().int().positive(),
});

// ✅ S3: Variant Schema
const VariantObject = {
  id: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  name: NameRawSchema.max(255).optional(),
  sku: ExternalIdRawSchema.min(3).max(50).optional(),
  price: SafeNumberRawSchema.min(1).max(999999999),
  compareAtPrice: SafeNumberRawSchema.min(1).max(999999999).optional(),
  stock: z.number().int().min(0).max(1000000).default(0),
  weight: z.number().min(0).max(10000).optional(),
  options: z.record(z.string().max(50), z.string().max(100)).optional(),
};

export const ProductVariantSchema = z.object(VariantObject).superRefine((data: any, ctx) => {
  if (data.compareAtPrice && data.price && data.compareAtPrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'سعر المقارنة يجب أن يكون أكبر من السعر الأساسي',
    });
  }
});

export const BulkCreateVariantsSchema = z.object({
  productId: z.number().int().positive(),
  variants: z.array(z.object(VariantObject).omit({ productId: true })).min(1).max(50),
});

export const ProductSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  brand: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  minPrice: SafeNumberRawSchema.min(0).optional(),
  maxPrice: SafeNumberRawSchema.min(0).optional(),
  inStock: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['price', 'name', 'createdAt', 'popularity']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

// Category, Image, Review
const CategoryObject = {
  id: z.number().int().positive().optional(),
  name: NameRawSchema.min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: SafeTextRawSchema.max(1000).optional(),
  parentId: z.number().int().positive().optional(),
  imageUrl: z.string().url().max(500).optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0).optional(),
  isActive: z.boolean().default(true).optional(),
};

export const CategorySchema = z.object(CategoryObject);
export const CreateCategorySchema = z.object(CategoryObject).omit({ id: true }).extend({
  children: z.array(z.object(CategoryObject).omit({ id: true, parentId: true })).max(10).optional(),
});

export const ProductImageSchema = z.object({
  id: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  url: z.string().url().max(500),
  altText: SafeTextRawSchema.max(255).optional(),
  sortOrder: z.number().int().min(0).default(0).optional(),
  isPrimary: z.boolean().default(false).optional(),
});
export const CreateProductImageSchema = ProductImageSchema.omit({ id: true });

export const ReviewSchema = z.object({
  id: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  rating: z.number().min(1).max(5),
  title: SafeTextRawSchema.min(2).max(100).optional(),
  comment: SafeTextRawSchema.max(1000).optional(),
  isVerified: z.boolean().default(false).optional(),
  isApproved: z.boolean().default(true).optional(),
});
export const CreateReviewSchema = ReviewSchema.omit({ id: true, isVerified: true, isApproved: true });

export type ProductDto = z.infer<typeof ProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type ProductVariantDto = z.infer<typeof ProductVariantSchema>;
export type BulkCreateVariantsDto = z.infer<typeof BulkCreateVariantsSchema>;
export type ProductSearchDto = z.infer<typeof ProductSearchSchema>;
export type CategoryDto = z.infer<typeof CategorySchema>;
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type ProductImageDto = z.infer<typeof ProductImageSchema>;
export type CreateProductImageDto = z.infer<typeof CreateProductImageSchema>;
export type ReviewDto = z.infer<typeof ReviewSchema>;
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
