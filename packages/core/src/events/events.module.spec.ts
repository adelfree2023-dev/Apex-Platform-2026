import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityContext } from '../common/security/security.context';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { commonProviders } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    const { mockPrisma, mockSecurityContext, mockAudit, mockTenantContext } = require('../../test/test-utils');
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(PrismaService).useValue(mockPrisma)
      .overrideProvider(SecurityContext).useValue(mockSecurityContext)
      .overrideProvider(AuditService).useValue(mockAudit)
      .overrideProvider(TenantContextService).useValue(mockTenantContext)
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should provide EventsService', () => {
    const svc = module.get<EventsService>(EventsService);
    expect(svc).toBeInstanceOf(EventsService);
  });

  it('must import PrismaModule', () => {
    const imports = (module as any).imports.map((i: any) => i?.metatype?.name);
    expect(imports).toContain('PrismaModule');
  });

  it('must export EventsService', () => {
    const exports = (module as any).exports.map((e: any) => e?.name);
    expect(exports).toContain('EventsService');
  });
});
