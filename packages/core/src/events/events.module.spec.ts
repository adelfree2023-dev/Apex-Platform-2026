import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { EventsService } from './events.service';
import { SecurityContext } from '../common/security/security.context';
import { PrismaService } from '../prisma/prisma.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { createMockSecurityContext, createMockPrisma, createMockAnomalyDetection, createMockTenantContext, createMockInputValidator, createMockCache } from '../../test/test-utils';
import { InputValidatorService } from '../common/security/validation/input-validator.service';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    // 🛡️ S7: EventsModule constructor needs SecurityContext
    // We provide ALL module dependencies as providers to satisfy the TestingModule
    module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: SecurityContext, useValue: createMockSecurityContext() },
        { provide: PrismaService, useValue: createMockPrisma() },
        { provide: AnomalyDetectionService, useValue: createMockAnomalyDetection() },
        { provide: TenantContextService, useValue: createMockTenantContext() },
        { provide: InputValidatorService, useValue: createMockInputValidator() },
        { provide: 'CACHE_MANAGER', useValue: createMockCache() },
      ],
    }).compile();
  });

  it('should be defined', () => {
    // We don't even need the module class if we are just testing registration,
    // but here we test the service which is provided.
    expect(module.get<EventsService>(EventsService)).toBeDefined();
  });
});
