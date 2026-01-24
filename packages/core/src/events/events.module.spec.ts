import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityContext } from '../common/security/security.context';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { createMockPrisma, createMockSecurityContext, createMockAudit, createMockTenantContext, createMockAnomalyDetection, createMockInputValidator } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(PrismaService).useValue(createMockPrisma())
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .overrideProvider(AuditService).useValue(createMockAudit())
      .overrideProvider(TenantContextService).useValue(createMockTenantContext())
      .overrideProvider(AnomalyDetectionService).useValue(createMockAnomalyDetection())
      .overrideProvider(InputValidatorService).useValue(createMockInputValidator())
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should be defined', () => {
    expect(module.get<EventsModule>(EventsModule)).toBeDefined();
  });
});
