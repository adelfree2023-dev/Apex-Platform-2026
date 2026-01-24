import { Test, TestingModule } from '@nestjs/testing';
import { LicenseGuard, LICENSE_KEY } from './license.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { createMockPrisma } from '../../../../test/test-utils';

describe('LicenseGuard', () => {
    let guard: LicenseGuard;
    let mockPrisma: any;
    let mockReflector: any;

    beforeEach(async () => {
        mockPrisma = createMockPrisma();
        mockReflector = {
            getAllAndOverride: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LicenseGuard,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: Reflector, useValue: mockReflector },
            ],
        }).compile();

        guard = module.get<LicenseGuard>(LicenseGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    const createMockContext = (tenantId?: string, path: string = '/', handler?: any, clazz?: any): ExecutionContext => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    tenantId,
                    path,
                    headers: tenantId ? {} : { 'x-tenant-id': 'header-tenant' },
                    route: { path }
                }),
            }),
            getHandler: () => handler || (() => { }),
            getClass: () => clazz || class { },
        } as any;
    };

    it('should allow if no tenantId is present', async () => {
        const context = createMockContext();
        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should allow if no requirements are specified', async () => {
        const context = createMockContext('t1', '/some/path');
        mockReflector.getAllAndOverride.mockReturnValue(null);
        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should allow if tenant has required plan (Enterprise)', async () => {
        const context = createMockContext('t1', '/analytics');
        mockReflector.getAllAndOverride.mockReturnValue(['ENTERPRISE']);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'ENTERPRISE', name: 'Big Corp' });

        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if plan is insufficient', async () => {
        const context = createMockContext('t1', '/analytics');
        mockReflector.getAllAndOverride.mockReturnValue(['PRO', 'ENTERPRISE']);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', name: 'Free Tier User' });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should fallback to path-based requirements', async () => {
        const context = createMockContext('t1', '/analytics'); // 'analytics' is in DEFAULT_LICENSE_REQUIREMENTS
        mockReflector.getAllAndOverride.mockReturnValue(null);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', name: 'Fail' });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should fail-open on generic database errors', async () => {
        const context = createMockContext('t1', '/analytics');
        mockReflector.getAllAndOverride.mockReturnValue(['PRO']);
        mockPrisma.tenant.findUnique.mockRejectedValue(new Error('DB Down'));

        expect(await guard.canActivate(context)).toBe(true);
    });
});
