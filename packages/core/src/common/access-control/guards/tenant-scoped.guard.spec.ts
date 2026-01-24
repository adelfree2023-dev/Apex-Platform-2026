import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../monitoring/audit/audit.service';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { createMockPrisma, createMockTenantContext, createMockAudit } from '../../../../test/test-utils';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;
  let mockReflector: any;
  let mockTenantContext: any;
  let mockPrisma: any;
  let mockAudit: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    mockTenantContext = createMockTenantContext();
    mockPrisma = createMockPrisma();
    mockAudit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantScopedGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    guard = module.get<TenantScopedGuard>(TenantScopedGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (headers: any = {}, query: any = {}, body: any = {}, isPublic: boolean = false): ExecutionContext => {
    mockReflector.getAllAndOverride.mockReturnValue(isPublic);
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          query,
          body,
          url: '/test',
          method: 'GET',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow public routes', async () => {
    const context = createMockContext({}, {}, {}, true);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow active tenant with valid UUID', async () => {
    const context = createMockContext({ 'x-tenant-id': tenantId });
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'ACTIVE' });
    // Mock schema check
    mockPrisma.$queryRaw.mockResolvedValue([{ schema_name: `tenant_00000000_0000_0000_0000_000000000001` }]);

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockTenantContext.setTenantId).toHaveBeenCalledWith(tenantId);
  });

  it('should throw ForbiddenException for invalid UUID format', async () => {
    const context = createMockContext({ 'x-tenant-id': 'invalid-uuid' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for inactive tenant', async () => {
    const context = createMockContext({ 'x-tenant-id': tenantId });
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'SUSPENDED' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if schema isolation fails (missing schema)', async () => {
    const context = createMockContext({ 'x-tenant-id': tenantId });
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'ACTIVE' });
    mockPrisma.$queryRaw.mockResolvedValue([]); // Schema list empty

    await expect(guard.canActivate(context)).rejects.toThrow('فشل عزل بيانات المستأجر');
  });

  it('should extract tenantId from body or query if header is missing', async () => {
    const context = createMockContext({}, { tenantId }, {});
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'ACTIVE' });
    mockPrisma.$queryRaw.mockResolvedValue([{ schema_name: `tenant_00000000_0000_0000_0000_000000000001` }]);

    expect(await guard.canActivate(context)).toBe(true);
  });
});
