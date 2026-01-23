import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { Logger } from '@nestjs/common';

describe('AuditService', () => {
  let service: AuditService;
  const mockLogger = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: AuditService, useValue: new AuditService() }],
    }).compile();

    service = module.get<AuditService>(AuditService);
    (service as any).logger = mockLogger;
  });

  it('logs activities', async () => {
    await service.logActivity({
      tenantId: 't-uuid',
      userId: 'user-1',
      action: 'TEST',
      details: { foo: 'bar' },
    });
    expect(mockLogger.log).toHaveBeenCalled();
  });

  it('logs security events', async () => {
    await service.logSecurityEvent({
      eventType: 'SECURITY',
      severity: 'HIGH',
      details: { ip: '1.2.3.4' },
    });
    expect(mockLogger.log).toHaveBeenCalled();
  });
});
