import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';
import { getCommonProviders } from '../../../../test/test-utils';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        ...getCommonProviders([TenantContextService]),
      ],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  it('stores and retrieves tenant per async context', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    service.setTenantId(tenantId);
    expect(service.getTenantId()).toBe(tenantId);
    service.clearTenantId();
    expect(service.getTenantId()).toBeNull();
  });
});
