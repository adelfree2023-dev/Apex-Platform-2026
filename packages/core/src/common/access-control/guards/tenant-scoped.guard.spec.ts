import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';

import { commonProviders, mockTenantContext } from '../../../../test/test-utils';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantScopedGuard,
        ...commonProviders,
      ],
    }).compile();

    guard = module.get<TenantScopedGuard>(TenantScopedGuard);
  });

  it('allows request when tenant present', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    const { mockPrisma } = require('../../../../test/test-utils');
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: '123', status: 'active' });

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when tenant missing', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
