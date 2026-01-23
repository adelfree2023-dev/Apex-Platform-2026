import { Test, TestingModule } from '@nestjs/testing';
import { TenantsModule } from './tenants.module';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';

describe('TenantsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantsModule],
    }).compile();
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
