/**
 * Tenant DTOs with Zod Validation
 * Input validation for tenant/store endpoints
 */

import { z } from 'zod';

// Tenant ID Schema (for URL params)
export const TenantIdSchema = z.string()
    .regex(/^[a-z0-9_]+$/, 'Tenant ID must be lowercase alphanumeric with underscores')
    .min(3, 'Tenant ID too short')
    .max(50, 'Tenant ID too long');

// Tenant Schema Name (for DB schema)
export const TenantSchemaSchema = z.string()
    .regex(/^tenant_[a-z0-9_]+$/, 'Invalid tenant schema format')
    .min(8)
    .max(60);

// Business Types
export const BusinessTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'SERVICES', 'RESTAURANT', 'MARKETPLACE']);

// Create Tenant Schema
export const CreateTenantSchema = z.object({
    name: z.string()
        .min(1, 'Store name required')
        .max(255, 'Store name too long'),
    subdomain: z.string()
        .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase with hyphens only')
        .min(3, 'Subdomain too short')
        .max(50, 'Subdomain too long'),
    businessType: BusinessTypeEnum,
    territory: z.string()
        .min(1, 'Territory required')
        .max(100, 'Territory too long'),
    email: z.string()
        .email('Invalid email')
        .optional(),
    phone: z.string()
        .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone')
        .optional(),
});

// Update Tenant Schema
export const UpdateTenantSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
    logo: z.string().url().optional(),
    settings: z.record(z.any()).optional(),
});

// Type exports
export type TenantId = z.infer<typeof TenantIdSchema>;
export type TenantSchema = z.infer<typeof TenantSchemaSchema>;
export type BusinessType = z.infer<typeof BusinessTypeEnum>;
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;
