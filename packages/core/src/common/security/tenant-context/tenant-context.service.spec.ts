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
    service.setCurrentTenant(mockTenant);
    expect(service.getCurrentTenant()).toBe(mockTenant);
    service.clearCurrentTenant();
    expect(service.getCurrentTenant()).toBeUndefined();
  });
});
