/**
 * Product DTOs with Zod Validation
 * Input validation for product endpoints
 */

import { z } from 'zod';

// Product Schema
export const ProductSchema = z.object({
    name: z.string()
        .min(1, 'Product name required')
        .max(255, 'Product name too long'),
    nameAr: z.string()
        .max(255)
        .optional(),
    slug: z.string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens')
        .max(255)
        .optional(),
    description: z.string()
        .max(10000, 'Description too long')
        .optional(),
    descriptionAr: z.string()
        .max(10000)
        .optional(),
    price: z.number()
        .positive('Price must be positive')
        .max(999999999, 'Price too high'),
    compareAtPrice: z.number()
        .positive()
        .max(999999999)
        .optional(),
    sku: z.string()
        .max(100)
        .optional(),
    barcode: z.string()
        .max(50)
        .optional(),
    stock: z.number()
        .int('Stock must be integer')
        .min(0, 'Stock cannot be negative')
        .optional()
        .default(0),
    weight: z.number()
        .min(0)
        .optional(),
    categoryId: z.number()
        .int()
        .positive()
        .optional(),
    images: z.array(z.string().url())
        .max(10, 'Maximum 10 images')
        .optional(),
    isActive: z.boolean()
        .optional()
        .default(true),
    metadata: z.record(z.string(), z.any())
        .optional(),
});

// Update Product Schema (all fields optional)
export const UpdateProductSchema = ProductSchema.partial();

// Product Query Schema
export const ProductQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(255).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['price', 'name', 'createdAt', 'stock']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    inStock: z.coerce.boolean().optional(),
});

// Type exports
export type ProductDto = z.infer<typeof ProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type ProductQueryDto = z.infer<typeof ProductQuerySchema>;
