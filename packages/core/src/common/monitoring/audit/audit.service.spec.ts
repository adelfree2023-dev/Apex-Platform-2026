import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { InputValidatorService } from '../../security/validation/input-validator.service';

describe('AuditService', () => {
  let service: AuditService;
  const mockPrisma = {
    auditMetric: { create: jest.fn() },
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ count: 0 }]),
    $on: jest.fn()
  };
  const mockTenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1'), getCurrentTenant: jest.fn() };
  const mockValidator = { secureValidate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: InputValidatorService, useValue: mockValidator },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('logs activities', async () => {
    await service.logActivity({
      tenantId: 't-uuid',
      userId: 'user-1',
      action: 'TEST',
      details: { foo: 'bar' },
    });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
  });

  it('logs security events', async () => {
    await service.logSecurityEvent('SECURITY_EVENT', { ip: '1.2.3.4' });
    // Verify it calls log or something internal
  });
});
