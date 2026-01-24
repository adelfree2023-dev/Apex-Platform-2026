import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';

import { commonProviders, mockTenantContext } from '../../../../test/test-utils';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        ...commonProviders,
      ],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  it('stores and retrieves tenant per async context', async () => {
    service.setTenantId(mockTenantContext.getTenantId());
    expect(service.getTenantId()).toBe(mockTenantContext.getTenantId());
    service.clearTenantId();
    expect(service.getTenantId()).toBeNull();
  });
});
