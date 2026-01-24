import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { InputValidatorService } from '../../security/validation/input-validator.service';
import { getCommonProviders } from '../../../../test/test-utils';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(async () => {
    const { getCommonProviders, createMockPrisma } = require('../../../../test/test-utils');
    mockPrisma = createMockPrisma();
    // Default system ready check should pass or be handled
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        ...getCommonProviders(),
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    // Explicitly set ready for tests that need DB logging
    service.setIsSystemReady(true);
  });

  it('logs activities', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]); // for table check

    await service.logActivity({
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-1',
      action: 'TEST',
      details: { foo: 'bar' },
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('logs security events', async () => {
    await service.logSecurityEvent('SECURITY_EVENT', { ip: '1.2.3.4' });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });
});
