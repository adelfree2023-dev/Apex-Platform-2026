import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ApexConfigService } from '../../core/apex-config.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

/**
 * 🏰 Digital Fortress: Rate Limiter Service (S6)
 */
@Injectable()
export class RateLimiterService {
    private readonly logger = new Logger(RateLimiterService.name);

    private readonly PLAN_LIMITS: Record<string, {
        requestsPerSecond: number;
        burstFactor: number;
        circuitBreakerThreshold: number
    }>;

    private readonly TOKEN_BUCKETS: Map<string, {
        tokens: number;
        lastRefill: number;
        plan: string;
        requestsSinceRefill: number
    }> = new Map();

    constructor(
        private readonly configService: ApexConfigService,
        private readonly tenantContext: TenantContextService,
        private readonly prisma: PrismaService,
        private readonly anomalyService: AnomalyDetectionService,
    ) {
        // ✅ STAGE 2: Load from environment or use secure defaults
        this.PLAN_LIMITS = {
            'FREE': {
                requestsPerSecond: this.configService.getNumber('RATE_LIMIT_FREE_RPS', 10) || 10,
                burstFactor: this.configService.getNumber('RATE_LIMIT_FREE_BURST', 1.5) || 1.5,
                circuitBreakerThreshold: this.configService.getNumber('RATE_LIMIT_FREE_CIRCUIT', 100) || 100,
            },
            'PRO': {
                requestsPerSecond: this.configService.getNumber('RATE_LIMIT_PRO_RPS', 50) || 50,
                burstFactor: this.configService.getNumber('RATE_LIMIT_PRO_BURST', 2) || 2,
                circuitBreakerThreshold: this.configService.getNumber('RATE_LIMIT_PRO_CIRCUIT', 500) || 500,
            },
            'ENTERPRISE': {
                requestsPerSecond: this.configService.getNumber('RATE_LIMIT_ENTERPRISE_RPS', 200) || 200,
                burstFactor: this.configService.getNumber('RATE_LIMIT_ENTERPRISE_BURST', 3) || 3,
                circuitBreakerThreshold: this.configService.getNumber('RATE_LIMIT_ENTERPRISE_CIRCUIT', 2000) || 2000,
            },
            'SUPER_ADMIN': {
                requestsPerSecond: this.configService.getNumber('RATE_LIMIT_SUPER_ADMIN_RPS', 500) || 500,
                burstFactor: this.configService.getNumber('RATE_LIMIT_SUPER_ADMIN_BURST', 5) || 5,
                circuitBreakerThreshold: this.configService.getNumber('RATE_LIMIT_SUPER_ADMIN_CIRCUIT', 5000) || 5000,
            },
            'ADMIN': {
                requestsPerSecond: this.configService.getNumber('RATE_LIMIT_ADMIN_RPS', 1000) || 1000,
                burstFactor: this.configService.getNumber('RATE_LIMIT_ADMIN_BURST', 5) || 5,
                circuitBreakerThreshold: this.configService.getNumber('RATE_LIMIT_ADMIN_CIRCUIT', 10000) || 10000,
            },
        };
        setInterval(() => this.cleanupBuckets(), 3600000);
    }

    async consume(tenantId: string, limit?: number, burst?: number): Promise<any> {
        // ✅ S6: Integrated Behavioral Tracking
        if (this.anomalyService.isSuspended(tenantId)) {
            return { allowed: false, remaining: 0, reset: 3600 };
        }

        const now = Date.now();
        let bucket = this.TOKEN_BUCKETS.get(tenantId);

        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { plan: true, status: true },
            });

            if (!tenant || tenant.status === 'SUSPENDED') {
                return { allowed: false, remaining: 0, reset: 60 };
            }

            const plan = tenant.plan?.toUpperCase() || 'FREE';
            const planConfig = this.PLAN_LIMITS[plan] || this.PLAN_LIMITS['FREE'];
            const reqLimit = limit || planConfig.requestsPerSecond;
            const burstLimit = burst || (reqLimit * planConfig.burstFactor);

            if (!bucket) {
                bucket = { tokens: burstLimit, lastRefill: now, plan: plan, requestsSinceRefill: 0 };
                this.TOKEN_BUCKETS.set(tenantId, bucket);
            } else {
                const elapsedSeconds = (now - bucket.lastRefill) / 1000;
                bucket.tokens = Math.min(bucket.tokens + (elapsedSeconds * reqLimit), burstLimit);
                bucket.lastRefill = now;
                bucket.requestsSinceRefill++;
            }

            if (bucket.requestsSinceRefill > planConfig.circuitBreakerThreshold) {
                // ✅ S6: Signal anomaly on circuit breaker trip
                this.anomalyService.inspect(tenantId, true);
                return { allowed: false, remaining: 0, reset: 300 };
            }

            if (bucket.tokens >= 1) {
                bucket.tokens -= 1;
                return { allowed: true, remaining: Math.floor(bucket.tokens), reset: 0 };
            }

            return { allowed: false, remaining: 0, reset: 1 };
        } catch (error) {
            this.logger.error(`Rate limiter error: ${error.message}`);
            return { allowed: true, remaining: 5, reset: 0 };
        }
    }

    private readonly GENERIC_LIMITS: Map<string, { count: number; expiresAt: number }> = new Map();

    async checkLimit(key: string, options: { maxRequests: number; windowMs: number }): Promise<{ allowed: boolean; currentRequests: number; maxRequests: number }> {
        const now = Date.now();
        let record = this.GENERIC_LIMITS.get(key);

        if (!record || now > record.expiresAt) {
            record = { count: 0, expiresAt: now + options.windowMs };
            this.GENERIC_LIMITS.set(key, record);
        }

        record.count++;

        if (record.count > options.maxRequests) {
            return { allowed: false, currentRequests: record.count, maxRequests: options.maxRequests };
        }

        return { allowed: true, currentRequests: record.count, maxRequests: options.maxRequests };
    }

    private cleanupBuckets(): void {
        const now = Date.now();
        for (const [tenantId, bucket] of this.TOKEN_BUCKETS.entries()) {
            if (now - bucket.lastRefill > 86400000) this.TOKEN_BUCKETS.delete(tenantId);
        }
        for (const [key, record] of this.GENERIC_LIMITS.entries()) {
            if (now > record.expiresAt) this.GENERIC_LIMITS.delete(key);
        }
    }
}
