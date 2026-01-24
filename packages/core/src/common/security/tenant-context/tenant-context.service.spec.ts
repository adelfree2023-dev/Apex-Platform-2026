import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;
  const mockTenant = { id: 't-uuid', name: 'Demo' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextService],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  it('stores and retrieves tenant per async context', async () => {
    service.setTenantId(mockTenant.id);
    expect(service.getCurrentTenant()).toBe(mockTenant);
    service.clearTenantId();
    expect(service.getCurrentTenant()).toBeUndefined();
  });
});
