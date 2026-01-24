import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AuditService } from '../../monitoring/audit/audit.service';
import { mockAudit } from '../../../../test/test-utils';

describe('AnomalyDetectionService', () => {
    let service: AnomalyDetectionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnomalyDetectionService,
                { provide: AuditService, useValue: mockAudit },
            ],
        }).compile();

        service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should track and suspend tenants after enough failed attempts', () => {
        const tenantId = 'suspicious-tenant';

        // Initial state
        expect(service.isSuspended(tenantId)).toBe(false);

        // Multiple failures
        for (let i = 0; i < 6; i++) {
            service.inspectFailedEvent(tenantId, 'test-event');
        }

        expect(service.isSuspended(tenantId)).toBe(true);
    });

    it('should track and throttle tenants', () => {
        const tenantId = 'chatty-tenant';

        expect(service.isThrottled(tenantId)).toBe(false);

        for (let i = 0; i < 11; i++) {
            service.inspectAnomalousRequest(tenantId, 'too-many-requests');
        }

        expect(service.isThrottled(tenantId)).toBe(true);
    });

    it('should handle failed logins separately', () => {
        const tenantId = 'login-brute-forcer';
        service.inspectFailedLogin(tenantId, 'user1', '127.0.0.1');
        expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('FAILED_LOGIN_ANOMALY', expect.any(Object));
    });

    it('should handle generic inspect signals', () => {
        const tenantId = 'inspect-target';
        service.inspect(tenantId, true); // true means critical
        expect(service.isSuspended(tenantId)).toBe(true);
    });
});
