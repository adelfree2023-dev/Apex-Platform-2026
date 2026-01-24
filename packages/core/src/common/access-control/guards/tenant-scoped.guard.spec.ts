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

  describe('Branch Coverage: Database Isolation', () => {
    const originalEnv = process.env.NODE_ENV;

    it('should attempt schema creation in development mode if missing', async () => {
      process.env.NODE_ENV = 'development';
      const context = createMockContext({ 'x-tenant-id': tenantId });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'ACTIVE' });
      mockPrisma.$queryRaw.mockResolvedValue([]); // Schema missing
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      expect(await guard.canActivate(context)).toBe(true);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false if schema creation fails in development', async () => {
      process.env.NODE_ENV = 'development';
      const context = createMockContext({ 'x-tenant-id': tenantId });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantId, status: 'ACTIVE' });
      mockPrisma.$queryRaw.mockResolvedValue([]); // Schema missing
      mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DDL Fail'));

      await expect(guard.canActivate(context)).rejects.toThrow();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Branch Coverage: Logging & Sanitization', () => {
    it('should redact sensitive headers in unauthorized logs', async () => {
      const context = createMockContext({
        'x-tenant-id': 'invalid',
        'authorization': 'Bearer secret',
        'cookie': 'session=123'
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'UNAUTHORIZED_TENANT_ACCESS',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: '[REDACTED]',
            cookie: '[REDACTED]'
          })
        })
      );
    });

    it('should handle missing audit service without crashing', async () => {
      const guardWithoutAudit = new TenantScopedGuard(mockReflector, mockTenantContext, mockPrisma);
      const context = createMockContext({ 'x-tenant-id': 'invalid' });
      await expect(guardWithoutAudit.canActivate(context)).rejects.toThrow();
    });
  });

  it('should handle general errors in catch block', async () => {
    const context = createMockContext({ 'x-tenant-id': tenantId });
    mockPrisma.tenant.findUnique.mockRejectedValue(new Error('Unexpected DB Error'));

    await expect(guard.canActivate(context)).rejects.toThrow('فشل التحقق من الهوية');
  });
});
