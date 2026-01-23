import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextModule } from './tenant-context.module';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantContextModule],
    }).compile();
  });

  it('exports TenantContextService', () => {
    const svc = module.get<TenantContextService>(TenantContextService);
    expect(svc).toBeInstanceOf(TenantContextService);
  });
});
