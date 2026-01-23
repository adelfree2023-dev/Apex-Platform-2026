import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;
  const mockTenantCtx = {
    getCurrentTenant: jest.fn().mockReturnValue({ id: 't-uuid' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantScopedGuard,
        { provide: TenantContextService, useValue: mockTenantCtx },
      ],
    }).compile();

    guard = module.get<TenantScopedGuard>(TenantScopedGuard);
  });

  it('allows request when tenant present', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when tenant missing', () => {
    mockTenantCtx.getCurrentTenant.mockReturnValueOnce(undefined);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
