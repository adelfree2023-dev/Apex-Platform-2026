import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, ServiceUnavailableException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Observable, throwError, delay, tap, timeout } from 'rxjs';
import { AnomalyDetectionService } from '../../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../../access-control/services/rate-limiter.service';
import { SecurityContext } from '../../security/security.context';
import { safeRedactError } from '../../utils/security.utils';
import { Request, Response } from 'express';

/**
 * 🏰 Digital Fortress: Defense Interceptor (S6 + S8)
 * - S8: Anomaly Detection (Behavioral Defense & Suspensions)
 * - S6: Resource Quota & Normalization (Timing Attack Protection)
 * - S6: Rate limiting protection
 * - S8: Circuit breaker for system protection
 */
@Injectable()
export class DefenseInterceptor implements NestInterceptor {
    private readonly logger = new Logger(DefenseInterceptor.name);

    // System resource thresholds
    private readonly MAX_MEMORY_THRESHOLD = 0.85; // 85% of available memory
    private readonly MAX_CPU_THRESHOLD = 0.8; // 80% CPU usage
    private readonly MIN_RESPONSE_TIME = 50; // milliseconds
    private readonly MAX_CIRCUIT_BREAKER_TIME = 300000; // 5 minutes
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

    constructor(
        @Inject(AnomalyDetectionService) private readonly anomaly: AnomalyDetectionService,
        @Inject(RateLimiterService) private readonly rateLimiter: RateLimiterService,
        @Inject(SecurityContext) @Optional() private readonly securityContext: SecurityContext,
    ) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest<Request>();
        const tenantId = (request as any)['tenantId'];
        const path = (request as any).route?.path || request.url;
        const method = request.method;
        const ip = this.getClientIp(request);

        if (!tenantId) {
            this.securityContext?.logSecurityEvent?.('MISSING_TENANT_CONTEXT', { path, method, ip, timestamp: new Date().toISOString() });
            return next.handle();
        }

        // 🛡️ S8: Behavioral Check - Blocking / Throttling (Suspension)
        if (this.anomaly.isSuspended(tenantId)) {
            this.logger.error(`🚨 [S8] BLOCKING REQUEST: Suspended tenant ${tenantId} - Path: ${path}`);
            this.securityContext?.logSecurityEvent?.('SUSPENDED_TENANT_REQUEST', { tenantId, path, method, ip, timestamp: new Date().toISOString() });
            return throwError(() => new ServiceUnavailableException('Account temporarily suspended due to security concerns. Please contact support.'));
        }

        // 🛡️ S6: Resource Quota Check (Memory Circuit Breaker)
        if (this.isSystemOverloaded() && this.anomaly.isThrottled(tenantId)) {
            this.logger.error(`🔥 [S6] RESOURCE QUOTA EXCEEDED. Blocking throttled tenant ${tenantId}`);
            this.securityContext?.logSecurityEvent?.('SYSTEM_OVERLOAD_BLOCK', { tenantId, path, method, ip, timestamp: new Date().toISOString() });
            return throwError(() => new ServiceUnavailableException('System under heavy load. Please try again later.'));
        }

        // 🛡️ S6: Rate limiting check
        try {
            const result = await this.rateLimiter.consume(tenantId);
            if (!result.allowed) {
                this.logger.warn(`🚫 [S6] RATE LIMIT EXCEEDED: Tenant ${tenantId}`);
                this.securityContext?.logSecurityEvent?.('RATE_LIMIT_EXCEEDED', { tenantId, path, method, ip, remaining: result.remaining, reset: result.reset, timestamp: new Date().toISOString() });
                return throwError(() => new ForbiddenException(`Rate limit exceeded. Please try again in ${Math.ceil(result.reset)} seconds.`));
            }
        } catch (error) {
            const safeError = safeRedactError(error);
            this.securityContext?.logSecurityEvent?.('RATE_LIMITER_ERROR', { tenantId, errorType: safeError.name, errorMessage: safeError.message, timestamp: new Date().toISOString() });
        }

        const isThrottled = this.anomaly.isThrottled(tenantId);
        const minResponseTime = isThrottled ? 500 : this.MIN_RESPONSE_TIME;
        const startTime = Date.now();

        return next.handle().pipe(
            timeout(this.REQUEST_TIMEOUT),
            tap({
                next: (data) => {
                    this.anomaly.inspect(tenantId, false, { path, method, ip });
                },
                error: (error) => {
                    const safeError = safeRedactError(error);
                    this.anomaly.inspect(tenantId, true, { path, method, ip });
                    this.securityContext?.logSecurityEvent?.('REQUEST_ERROR', { tenantId, path, method, ip, errorType: safeError.name, errorMessage: safeError.message, timestamp: new Date().toISOString() });
                }
            }),
            delay(minResponseTime)
        );
    }

    private getClientIp(request: Request): string {
        let ip = request.ip || request.socket.remoteAddress || 'unknown';
        if (request.headers['x-forwarded-for']) {
            ip = (request.headers['x-forwarded-for'] as string).split(',')[0].trim();
        }
        return ip.replace(/[^a-z0-9\.:]/gi, '').substring(0, 50);
    }

    private isSystemOverloaded(): boolean {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = 0.5; // Simplified
            return (memUsage.heapUsed / memUsage.heapTotal) > this.MAX_MEMORY_THRESHOLD || cpuUsage > this.MAX_CPU_THRESHOLD;
        } catch (error) {
            return false;
        }
    }
}
