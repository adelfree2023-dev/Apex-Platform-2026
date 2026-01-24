import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantScopedGuard,
        ...getCommonProviders(),
        { provide: PrismaService, useValue: mockPrisma },
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

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE'
    });
    // Database isolation check
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

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
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
