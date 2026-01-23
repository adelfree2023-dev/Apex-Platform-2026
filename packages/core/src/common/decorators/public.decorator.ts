import { SetMetadata } from '@nestjs/common';

/*** 🏰 ASMP: Public Route Decorator
* - Marks endpoints as public (no tenant context required)
* - Used for health checks, registration, and system endpoints
* - TenantScopedGuard respects this decorator*/
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/*** 🏰 ASMP: Internal System Route Decorator
* - Marks endpoints as internal system routes
* - Only accessible from trusted IPs or internal services
* - Requires additional security verification*/
export const IS_INTERNAL_KEY = 'isInternal';
export const Internal = () => SetMetadata(IS_INTERNAL_KEY, true);

/*** 🏰 ASMP: Bypass Security Decorator (استخدم بحذر)
* - For exceptional cases that require bypassing security checks
* - Must be approved by security team and documented
* - Audit logs are mandatory for any bypass usage*/
export const BYPASS_SECURITY_KEY = 'bypassSecurity';
export const BypassSecurity = (reason: string) => SetMetadata(BYPASS_SECURITY_KEY, reason);
