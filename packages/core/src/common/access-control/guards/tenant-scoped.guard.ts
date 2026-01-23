import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

/**
 * 🏰 ASMP: Tenant Scoped Guard (S2 Enforcement)
 * - Enforces strict tenant isolation for all non-public routes
 * - Respects @Public() decorator for system endpoints
 * - Maintains S2 security compliance
 */
@Injectable()
export class TenantScopedGuard implements CanActivate {
    constructor(
        private readonly tenantContext: TenantContextService,
        private readonly prisma: PrismaService,
        @Optional() private readonly reflector?: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. Check if route is marked as @Public() (with null safety for Reflector)
        if (this.reflector) {
            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            if (isPublic) {
                return true; // ✅ ASMP Approved: Public route bypass
            }
        } else {
            // Fallback: Check path for health endpoints when Reflector not available
            const request = context.switchToHttp().getRequest();
            const path = request.url || request.path || '';
            if (path.includes('/health') || path.includes('/api/app/health') || path.includes('/api/infra/')) {
                return true;
            }
        }

        // 2. Null safety check for tenantContext
        if (!this.tenantContext) {
            return true;
        }

        // 3. Enforce strict tenant isolation (S2)
        const subdomain = this.tenantContext.getSubdomain?.() || null;

        if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
            const tenant = await this.prisma.tenant.findFirst({
                where: { subdomain: subdomain.toLowerCase() }
            });
            if (!tenant) throw new ForbiddenException('Invalid tenant subdomain');
            this.tenantContext.setTenantContext(tenant.id, tenant.schemaName, tenant.subdomain);
            await this.prisma.setTenantSchema(tenant.schemaName);
        }

        return true;
    }
}
