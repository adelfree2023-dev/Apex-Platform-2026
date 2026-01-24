import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { TenantScopedGuard } from '../../access-control/guards/tenant-scoped.guard';

describe('AuditController', () => {
    let controller: AuditController;
    let auditService: any;

    beforeEach(async () => {
        auditService = {
            getAuditLogs: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuditController],
            providers: [
                { provide: AuditService, useValue: auditService },
            ],
        })
            .overrideGuard(TenantScopedGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuditController>(AuditController);
    });

    it('should call getAuditLogs with tenantId from request', async () => {
        const mockReq = { tenantId: 'test-tenant' };
        const mockQuery = { action: 'LOGIN' };

        await controller.getLogs(mockReq, mockQuery);

        expect(auditService.getAuditLogs).toHaveBeenCalledWith('test-tenant', mockQuery);
    });
});
