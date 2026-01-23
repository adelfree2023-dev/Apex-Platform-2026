import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 🏰 Digital Fortress: License Guard (S5)
 * - Enforces Feature Gating based on Tenant commercial tier
 * - Tiers: FREE | PRO | ENTERPRISE
 */
export const LICENSE_KEY = 'license_requirements';

export const DEFAULT_LICENSE_REQUIREMENTS: Record<string, string[]> = {
    'loyalty': ['PRO', 'ENTERPRISE'],
    'b2b-portal': ['ENTERPRISE'],
    'analytics': ['PRO', 'ENTERPRISE'],
    'marketing': ['PRO', 'ENTERPRISE'],
    'ai': ['ENTERPRISE'],
    'social-commerce': ['PRO', 'ENTERPRISE'],
    'marketplace': ['ENTERPRISE'],
    'shipping': ['PRO', 'ENTERPRISE'],
    'advanced-analytics': ['ENTERPRISE'],
    'unified-inbox': ['PRO', 'ENTERPRISE'],
    'workflow': ['ENTERPRISE'],
};

@Injectable()
export class LicenseGuard implements CanActivate {
    private readonly logger = new Logger(LicenseGuard.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId || request.headers['x-tenant-id'];

        if (!tenantId) return true; // Handled by TenantScopedGuard

        // 1. Check Decorator-based Requirements (High Precision)
        let requiredTiers = this.reflector.getAllAndOverride<string[]>(LICENSE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 2. Fallback to Path-based Requirements
        if (!requiredTiers || requiredTiers.length === 0) {
            const path = request.route?.path || request.path;
            const segments = path.split('/').filter(Boolean);
            const moduleName = segments.find((s: string) =>
                Object.keys(DEFAULT_LICENSE_REQUIREMENTS).includes(s)
            );
            if (moduleName) {
                requiredTiers = DEFAULT_LICENSE_REQUIREMENTS[moduleName];
            }
        }

        if (!requiredTiers || requiredTiers.length === 0) {
            return true;
        }

        // 3. Fetch current tenant plan with caching
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    id: true,
                    plan: true,
                    name: true,
                }
            });

            if (!tenant) {
                throw new ForbiddenException('Invalid tenant license context.');
            }

            const currentPlan = (tenant.plan || 'FREE').toUpperCase();

            // 4. Check license tier requirements
            if (!requiredTiers.includes(currentPlan)) {
                const path = request.route?.path || request.path;
                this.logger.warn(`🚫 License Block: Tenant ${tenant.name} (${tenantId}) (${currentPlan}) tried to access protected feature at ${path}. Required one of: ${requiredTiers.join(', ')}`);
                throw new ForbiddenException(`Upgrade required. This feature requires a ${requiredTiers[0]} plan or higher.`);
            }

            return true;
        } catch (error) {
            this.logger.error(`License check failed for tenant ${tenantId}: ${error.message}`);
            if (error instanceof ForbiddenException) {
                throw error;
            }
            // Fallback to allow access if license check fails (fail-open for availability)
            return true;
        }
    }
}
