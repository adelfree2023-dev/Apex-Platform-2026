import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Extend Express Request to include tenant context
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
            tenantSchema?: string;
            territory?: string;
            businessType?: string;
            tenantName?: string;
        }
    }
}

/**
 * Tenant Middleware
 * 
 * Per APEX_PLATFORM_CONTEXT.md:
 * - Tenant Context is injected automatically from subdomain
 * - No database access is possible without tenant context
 * - Each store = a separate digital nation
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const host = req.headers.host;

        if (!host) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                error: 'Host header missing',
                code: 'MISSING_HOST',
            });
        }

        // Extract subdomain: storename.apex-platform.com → storename
        const subdomain = this.extractSubdomain(host);

        // Skip tenant context for platform routes
        if (this.isMarketingOrAdmin(subdomain)) {
            return next();
        }

        // Strict subdomain validation (security requirement)
        if (!/^[a-z][a-z0-9-]*$/.test(subdomain)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                error: 'Invalid subdomain format',
                code: 'INVALID_SUBDOMAIN',
            });
        }

        try {
            // Find tenant by subdomain
            const tenant = await this.prisma.tenant.findUnique({
                where: { subdomain },
            });

            if (!tenant) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    error: 'Store not found',
                    code: 'TENANT_NOT_FOUND',
                    subdomain,
                });
            }

            // Check if tenant is suspended
            if (tenant.status === 'suspended') {
                return res.status(HttpStatus.FORBIDDEN).json({
                    error: 'This store is currently suspended',
                    code: 'TENANT_SUSPENDED',
                    reason: tenant.suspendedReason || 'Contact support for more information',
                });
            }

            // Inject tenant context into request
            req.tenantId = tenant.id;
            req.tenantSchema = `tenant_${tenant.id.replace(/-/g, '_')}`;
            req.territory = tenant.territory;
            req.businessType = tenant.businessType;
            req.tenantName = tenant.name;

            console.log(`🏪 Tenant context: ${tenant.name} (${subdomain})`);

            next();
        } catch (error) {
            console.error('Tenant middleware error:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to resolve tenant',
                code: 'TENANT_RESOLUTION_ERROR',
            });
        }
    }

    private extractSubdomain(host: string): string {
        // Remove port if present
        const hostWithoutPort = host.split(':')[0];

        // Handle different domain patterns
        const parts = hostWithoutPort.split('.');

        // localhost or single part = no subdomain
        if (parts.length === 1) {
            return parts[0];
        }

        // subdomain.apex-platform.com or subdomain.localhost
        return parts[0];
    }

    private isMarketingOrAdmin(subdomain: string): boolean {
        const skipSubdomains = [
            'apex-platform',
            'www',
            'admin',
            'api',
            'localhost',
            '127',
        ];
        return skipSubdomains.includes(subdomain.toLowerCase());
    }
}
