import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
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
    }> = {
            'FREE': { requestsPerSecond: 10, burstFactor: 1.5, circuitBreakerThreshold: 100 },
            'PRO': { requestsPerSecond: 50, burstFactor: 2, circuitBreakerThreshold: 500 },
            'ENTERPRISE': { requestsPerSecond: 200, burstFactor: 3, circuitBreakerThreshold: 2000 },
            'SUPER_ADMIN': { requestsPerSecond: 1000, burstFactor: 5, circuitBreakerThreshold: 10000 },
        };

    private readonly TOKEN_BUCKETS: Map<string, {
        tokens: number;
        lastRefill: number;
        plan: string;
        requestsSinceRefill: number
    }> = new Map();

    constructor(
        private readonly tenantContext: TenantContextService,
        private readonly prisma: PrismaService,
        private readonly anomalyService: AnomalyDetectionService,
    ) {
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

    private cleanupBuckets(): void {
        const now = Date.now();
        for (const [tenantId, bucket] of this.TOKEN_BUCKETS.entries()) {
            if (now - bucket.lastRefill > 86400000) this.TOKEN_BUCKETS.delete(tenantId);
        }
    }
}
