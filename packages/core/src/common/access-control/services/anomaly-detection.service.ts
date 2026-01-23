import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityContext } from '../../security/security.context';

@Injectable()
export class AnomalyDetectionService {
    private readonly logger = new Logger(AnomalyDetectionService.name);
    private readonly failedLogins = new Map<string, { count: number; lastAttempt: Date }>();
    private readonly failedEvents = new Map<string, { count: number; lastEvent: Date }>();
    private readonly suspendedTenants = new Map<string, { reason: string; expiry: Date }>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly securityContext: SecurityContext,
    ) { }

    isSuspended(tenantId: string): boolean {
        const suspension = this.suspendedTenants.get(tenantId);
        if (!suspension) return false;
        if (suspension.expiry < new Date()) {
            this.suspendedTenants.delete(tenantId);
            return false;
        }
        return true;
    }

    /**
     * 🛡️ S3: Anomaly Inspection Protocol
     */
    inspect(tenantId: string, isFailure: boolean, context?: {
        ip?: string;
        path?: string;
        method?: string;
        rateLimit?: number;
        remaining?: number;
    }): void {
        const key = `${tenantId}:request_flow`;
        const current = this.failedEvents.get(key) || { count: 0, lastEvent: new Date() };

        if (isFailure) {
            current.count++;
            current.lastEvent = new Date();
            this.failedEvents.set(key, current);

            if (context) {
                this.securityContext.logSecurityEvent('ANOMALY_DETECTED', {
                    tenantId,
                    ...context,
                    failureCount: current.count
                });
            }
        }
    }

    isThrottled(tenantId: string): boolean {
        const key = `${tenantId}:request_flow`;
        const current = this.failedEvents.get(key);
        return current ? current.count > 20 : false;
    }

    inspectFailedLogin(tenantId: string, email: string, ip: string): void {
        const key = `${tenantId}:login_failure`;
        const current = this.failedLogins.get(key) || { count: 0, lastAttempt: new Date() };
        current.count++;
        current.lastAttempt = new Date();
        this.failedLogins.set(key, current);
        this.securityContext.logSecurityEvent('ANOMALY_LOGIN_FAILURE', { tenantId, email, count: current.count, ip });
    }

    inspectFailedEvent(tenantId: string, type: string, error: any): void {
        this.inspect(tenantId, true, { path: type });
        this.logger.warn(`Potential event anomaly: ${type}`, { tenantId, error: error.message });
    }

    getStatus(tenantId: string): any {
        return {
            isSuspended: this.isSuspended(tenantId),
            isThrottled: this.isThrottled(tenantId),
            failureCount: this.failedEvents.get(`${tenantId}:request_flow`)?.count || 0
        };
    }
}
