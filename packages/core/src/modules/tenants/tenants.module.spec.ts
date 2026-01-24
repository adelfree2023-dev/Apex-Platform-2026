import { Test, TestingModule } from '@nestjs/testing';
import { TenantsModule } from './tenants.module';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/monitoring/audit/audit.service';
import { TenantContextService } from '../../common/security/tenant-context/tenant-context.service';
import { commonProviders } from '../../../test/test-utils';

describe('TenantsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    const { mockPrisma, mockAudit, mockTenantContext } = require('../../../test/test-utils');
    module = await Test.createTestingModule({
      imports: [TenantsModule],
    })
      .overrideProvider(PrismaService).useValue(mockPrisma)
      .overrideProvider(AuditService).useValue(mockAudit)
      .overrideProvider(TenantContextService).useValue(mockTenantContext)
      .compile();
  });

  it('provides TenantsService', () => {
    const svc = module.get<TenantsService>(TenantsService);
    expect(svc).toBeInstanceOf(TenantsService);
  });

  it('imports PrismaModule', () => {
    const imports = (module as any).imports.map((i: any) => i?.metatype?.name);
    expect(imports).toContain('PrismaModule');
  });
});
