import { SetMetadata } from '@nestjs/common';

/**
 * 🏰 ASMP: Public Route Decorator
 * - Marks endpoints as public (no tenant context required)
 * - Used for health checks, registration, and system endpoints
 * - TenantScopedGuard respects this decorator
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
