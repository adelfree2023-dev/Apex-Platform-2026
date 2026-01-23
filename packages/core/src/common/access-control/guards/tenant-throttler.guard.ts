import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request } from 'express';
import { safeRedactError } from '../../utils/security.utils';
import { SecurityContext } from '../../security/security.context';
import { constantTimeDelay } from '../../utils/security.utils';

/**
 * 🏰 Digital Fortress: Tenant Throttler Guard (S6)
 * - Implements tenant-aware rate limiting with anomaly detection
 * - Applies different limits based on tenant plan
 * - Integrates behavioral analysis for advanced protection
 * - Provides circuit breaking under high load
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard implements CanActivate {
    private readonly logger = new Logger(TenantThrottlerGuard.name);

    // Plan-based rate limits (requests per second)
    private readonly PLAN_LIMITS: Record<string, number> = {
        'FREE': 10,
        'PRO': 50,
        'ENTERPRISE': 200,
    };

    // Critical system resource thresholds for circuit breaking
    private readonly MAX_MEMORY_THRESHOLD = 0.85; // 85% of available memory
    private readonly MAX_CPU_THRESHOLD = 0.8; // 80% CPU usage
    private readonly CIRCUIT_BREAKER_MAX_REQUESTS = 1000; // Max requests per minute when overloaded

    constructor(
        @Inject('THROTTLER_OPTIONS') options: any,
        @Inject('STORAGE_SERVICE') storageService: any,
        @Inject('REFLECTOR') reflector: any,
        private readonly rateLimiter: RateLimiterService,
        private readonly anomaly: AnomalyDetectionService,
        private readonly prisma: PrismaService,
        private readonly securityContext: SecurityContext,
    ) {
        super(options, storageService, reflector);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const tenantId = (request as any)['tenantId'];
        const path = (request as any).route?.path || request.url;
        const method = request.method;
        const ip = this.getClientIp(request);

        // 🔒 S6: Skip rate limiting for health checks and open endpoints
        if (this.isExemptPath(path)) {
            return true;
        }

        // 🔒 S6: Check if tenant is suspended before processing
        if (tenantId && this.anomaly.isSuspended(tenantId)) {
            this.logger.warn(`🚨 Rate limit triggered for suspended tenant: ${tenantId}`);

            // 🔒 S4: Log the security event
            this.securityContext.logSecurityEvent('SUSPENDED_TENANT_ACCESS_ATTEMPT', {
                tenantId,
                ip,
                path,
                method,
                timestamp: new Date().toISOString(),
            });

            throw new ForbiddenException('Your account is temporarily suspended due to excessive requests.');
        }

        // 🔒 S6: Check if tenant is throttled (behind the scenes rate limiting)
        if (tenantId && this.anomaly.isThrottled(tenantId)) {
            this.logger.warn(`⚠️ Behavioral throttling active for tenant: ${tenantId}`);
        }

        try {
            // 🔒 S6: Get tenant-specific rate limit with fallback
            let rateLimit = this.PLAN_LIMITS['FREE']; // Default to FREE tier
            let burstLimit = rateLimit * 2;

            if (tenantId) {
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { plan: true, status: true },
                });

                if (!tenant) {
                    this.logger.warn(`Tenant not found: ${tenantId}`);

                    // 🔒 S4: Log the security event
                    this.securityContext.logSecurityEvent('UNKNOWN_TENANT_ACCESS', {
                        tenantId,
                        ip,
                        path,
                        timestamp: new Date().toISOString(),
                    });

                    throw new ForbiddenException('Invalid tenant context');
                }

                if (tenant.status === 'suspended') {
                    this.logger.warn(`🚨 Tenant ${tenantId} is suspended - blocking request`);

                    // 🔒 S4: Log the security event
                    this.securityContext.logSecurityEvent('SUSPENDED_TENANT_ACCESS', {
                        tenantId,
                        ip,
                        path,
                        method,
                        timestamp: new Date().toISOString(),
                    });

                    throw new ForbiddenException('Your account is temporarily suspended.');
                }

                rateLimit = this.PLAN_LIMITS[tenant.plan?.toUpperCase() || 'FREE'] || this.PLAN_LIMITS['FREE'];
                burstLimit = rateLimit * 2;

                // 🔒 S6: Apply stricter limits if tenant is being throttled
                if (this.anomaly.isThrottled(tenantId)) {
                    rateLimit = Math.max(1, Math.floor(rateLimit * 0.3)); // 70% reduction
                    burstLimit = rateLimit;
                }
            }

            // 🔒 S6: Check system load for circuit breaking
            const systemLoad = this.checkSystemLoad();
            if (systemLoad.isOverloaded) {
                this.logger.warn(`🔥 System under heavy load. Applying circuit breaker.`);

                // 🔒 S4: Log the security event
                this.securityContext.logSecurityEvent('SYSTEM_OVERLOAD', {
                    memoryUsage: systemLoad.memoryUsage,
                    cpuUsage: systemLoad.cpuUsage,
                    timestamp: new Date().toISOString(),
                });

                // 🔒 S6: Apply global circuit breaker limits
                rateLimit = Math.min(rateLimit, this.CIRCUIT_BREAKER_MAX_REQUESTS / 60); // per second
                burstLimit = rateLimit;
            }

            // 🔒 S6: Get client identifier (IP + tenant + endpoint)
            const clientKey = this.getClientKey(request, tenantId, path, ip);

            // 🔒 S6: Check rate limits with token bucket algorithm
            const { allowed, remaining, reset } = await this.rateLimiter.consume(
                clientKey,
                rateLimit,
                burstLimit
            );

            // 🔒 S6: Track request in anomaly detection
            if (tenantId) {
                await this.anomaly.inspect(tenantId, !allowed, {
                    ip,
                    path,
                    method,
                    rateLimit,
                    remaining,
                });
            }

            if (!allowed) {
                this.logger.warn(`🔥 Rate limit exceeded for ${clientKey}. Plan limit: ${rateLimit}/s`);

                // 🔒 S4: Log the security event
                this.securityContext.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                    tenantId,
                    clientKey,
                    path,
                    method,
                    planLimit: rateLimit,
                    remaining,
                    reset,
                    ip,
                    timestamp: new Date().toISOString(),
                });

                // 🔒 S6: Apply progressive backoff
                const backoffFactor = Math.min(5, Math.floor(reset / 10) + 1);
                const backoffMs = Math.min(30000, 1000 * backoffFactor);

                // 🔒 S5: Constant time delay
                await constantTimeDelay(backoffMs);

                throw new ThrottlerException(`Too many requests. Please try again in ${Math.ceil(reset)} seconds.`);
            }

            // 🔒 S6: Set response headers
            const response = context.switchToHttp().getResponse();
            if (response && typeof response.setHeader === 'function') {
                response.setHeader('X-RateLimit-Limit', rateLimit);
                response.setHeader('X-RateLimit-Remaining', remaining);
                response.setHeader('X-RateLimit-Reset', Math.ceil(reset));
                response.setHeader('Retry-After', Math.ceil(reset).toString());
            }

            return true;
        } catch (error) {
            if (error instanceof ThrottlerException || error instanceof ForbiddenException) {
                throw error;
            }
            // 🔒 S5: Safe error handling
            const safeError = safeRedactError(error);
            this.securityContext.logSecurityEvent('RATE_LIMIT_ERROR', {
                tenantId, path, method, ip, errorType: safeError.name, timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    private isExemptPath(path: string): boolean {
        const exemptPaths = ['/health', '/api/health', '/api/docs', '/api/swagger', '/swagger-ui'];
        return exemptPaths.some(exemptPath => path.startsWith(exemptPath));
    }

    private getClientIp(request: Request): string {
        let ip = request.ip || request.socket.remoteAddress || 'unknown';
        if (request.headers['x-forwarded-for']) {
            ip = (request.headers['x-forwarded-for'] as string).split(',')[0].trim();
        }
        return ip.replace(/[^a-z0-9\.:]/gi, '').substring(0, 50);
    }

    private getClientKey(request: Request, tenantId: string | undefined, path: string, ip: string): string {
        const normalizedIp = ip.replace(/[^a-z0-9\.:]/gi, '').substring(0, 50);
        const normalizedPath = path.replace(/\/:[^/]+/g, '/:param').replace(/\/\d+/g, '/:id');
        return tenantId ? `${tenantId}:${normalizedIp}:${normalizedPath}` : `${normalizedIp}:${normalizedPath}`;
    }

    private checkSystemLoad(): { isOverloaded: boolean; memoryUsage: number; cpuUsage: number } {
        try {
            const memoryUsage = process.memoryUsage();
            const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
            const cpuUsage = 0.5; // Simplified
            return { isOverloaded: memoryPercent > this.MAX_MEMORY_THRESHOLD, memoryUsage: memoryPercent, cpuUsage };
        } catch (error) {
            return { isOverloaded: false, memoryUsage: 0, cpuUsage: 0 };
        }
    }

    private async getTenantPlan(tenantId: string): Promise<string> {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { plan: true },
            });
            return tenant?.plan || 'FREE';
        } catch (error) {
            return 'FREE';
        }
    }
}
