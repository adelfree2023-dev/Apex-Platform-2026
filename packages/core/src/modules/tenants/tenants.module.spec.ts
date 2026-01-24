import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { getCommonProviders } from '../../../test/test-utils';

describe('TenantsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        TenantsService,
        ...getCommonProviders([TenantsService]),
      ],
    }).compile();
  });

  it('provides TenantsService', () => {
    expect(module.get<TenantsService>(TenantsService)).toBeDefined();
  });
});
