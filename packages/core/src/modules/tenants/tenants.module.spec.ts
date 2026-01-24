import { Test, TestingModule } from '@nestjs/testing';
import { TenantsModule } from './tenants.module';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';

import { commonProviders } from '../../../test/test-utils';

describe('TenantsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantsModule],
    })
      .overrideProvider(PrismaModule).useValue({ providers: commonProviders })
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
