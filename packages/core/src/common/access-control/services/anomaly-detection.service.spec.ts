import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityContext } from '../../security/security.context';
import { createMockPrisma } from '../../../../test/test-utils';

describe('AnomalyDetectionService', () => {
    let service: AnomalyDetectionService;
    let mockPrisma: any;
    let mockSecurityContext: any;

    beforeEach(async () => {
        mockPrisma = createMockPrisma();
        mockSecurityContext = {
            logSecurityEvent: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnomalyDetectionService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: SecurityContext, useValue: mockSecurityContext },
            ],
        }).compile();

        service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should track and throttle tenants after enough failed attempts', () => {
        const tenantId = 'suspicious-tenant';

        // Initial state
        expect(service.isThrottled(tenantId)).toBe(false);

        // Multiple failures
        for (let i = 0; i < 21; i++) {
            service.inspectFailedEvent(tenantId, 'test-event', new Error('test'));
        }

        expect(service.isThrottled(tenantId)).toBe(true);
    });

    it('should track and report anomalous requests', () => {
        const tenantId = 'chatty-tenant';

        service.inspect(tenantId, true, { path: '/test' });

        const status = service.getStatus(tenantId);
        expect(status.failureCount).toBe(1);
    });

    it('should handle failed logins separately', () => {
        const tenantId = 'login-brute-forcer';
        service.inspectFailedLogin(tenantId, 'user1', '127.0.0.1');
        expect(mockSecurityContext.logSecurityEvent).toHaveBeenCalledWith('ANOMALY_LOGIN_FAILURE', expect.any(Object));
    });

    it('should handle generic inspect signals', () => {
        const tenantId = 'inspect-target';
        service.inspect(tenantId, true); // true means critical
        expect(service.isSuspended(tenantId)).toBe(true);
    });
});
