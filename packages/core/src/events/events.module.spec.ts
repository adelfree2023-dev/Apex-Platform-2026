import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityContext } from '../common/security/security.context';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { getCommonProviders, createMockPrisma, createMockSecurityContext } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    // EventsModule constructor depends on SecurityContext
    // EventsService depends on many things.
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .overrideProvider(PrismaService).useValue(createMockPrisma())
      // Ensure all providers are satisfied
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should be defined', () => {
    expect(module.get<EventsModule>(EventsModule)).toBeDefined();
  });
});
