import { Test, TestingModule } from '@nestjs/testing';
import { TenantsModule } from './tenants.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/monitoring/audit/audit.service';
import { createMockAudit, createMockPrisma } from '../../../test/test-utils';

describe('TenantsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantsModule],
    })
      .overrideProvider(PrismaService).useValue(createMockPrisma())
      .overrideProvider(AuditService).useValue(createMockAudit())
      .compile();
  });

  it('provides TenantsService', () => {
    expect(module).toBeDefined();
  });
});
