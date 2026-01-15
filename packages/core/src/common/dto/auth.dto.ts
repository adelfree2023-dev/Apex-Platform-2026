/**
 * Auth DTOs with Zod Validation
 * Input validation for authentication endpoints
 */

import { z } from 'zod';

// Login Schema
export const LoginSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .max(255, 'Email too long'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long'),
});

// Register Schema
export const RegisterSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .max(255, 'Email too long'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain uppercase letter')
        .regex(/[a-z]/, 'Password must contain lowercase letter')
        .regex(/[0-9]/, 'Password must contain number'),
    firstName: z.string()
        .min(1, 'First name required')
        .max(100, 'First name too long'),
    lastName: z.string()
        .max(100, 'Last name too long')
        .optional(),
    phone: z.string()
        .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number')
        .optional(),
});

// Forgot Password Schema
export const ForgotPasswordSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .max(255),
});

// Reset Password Schema
export const ResetPasswordSchema = z.object({
    token: z.string().min(1, 'Token required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long'),
});

// Refresh Token Schema
export const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token required'),
});

// Type exports
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

// Validation helper
export function validateDto<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
}
