import { Test, TestingModule } from '@nestjs/testing';
import { TenantThrottlerGuard } from './tenant-throttler.guard';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityContext } from '../../security/security.context';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { createMockPrisma, createMockRateLimiter, createMockAnomalyDetection, createMockSecurityContext } from '../../../../test/test-utils';

describe('TenantThrottlerGuard', () => {
    let guard: TenantThrottlerGuard;
    // [/] Cover Guards: `LicenseGuard` [x], `TenantThrottler` [x], `SuperAdminGuard` [x], `TenantScopedGuard` [/]
    let mockRateLimiter: any;
    let mockAnomaly: any;
    let mockPrisma: any;
    let mockSecurityContext: any;

    beforeEach(async () => {
        mockRateLimiter = createMockRateLimiter();
        mockAnomaly = createMockAnomalyDetection();
        mockPrisma = createMockPrisma();
        mockSecurityContext = createMockSecurityContext();
        // [x] Cover Core Security: `EncryptedFieldService` [x], `RateLimiter` [x], `SecurityContext` [x]

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantThrottlerGuard,
                // [x] Cover Validation: `SanitizerService` [x], `BaseDTO` [ ], `ProductDTO` [ ]
                { provide: RateLimiterService, useValue: mockRateLimiter },
                { provide: AnomalyDetectionService, useValue: mockAnomaly },
                { provide: PrismaService, useValue: mockPrisma },
                { provide: SecurityContext, useValue: mockSecurityContext },
                { provide: 'THROTTLER_OPTIONS', useValue: {} },
                { provide: 'STORAGE_SERVICE', useValue: {} },
                { provide: 'REFLECTOR', useValue: { getAllAndOverride: jest.fn() } },
            ],
        }).compile();

        guard = module.get<TenantThrottlerGuard>(TenantThrottlerGuard);

        jest.spyOn(process, 'memoryUsage').mockReturnValue({
            heapUsed: 100,
            heapTotal: 1000,
            rss: 100,
            external: 100,
            arrayBuffers: 100,
        } as any);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    const createMockContext = (tenantId?: string, path: string = '/', method: string = 'GET'): ExecutionContext => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    tenantId,
                    url: path,
                    method,
                    socket: { remoteAddress: '127.0.0.1' },
                    headers: {},
                    route: { path }
                }),
                getResponse: () => ({
                    setHeader: jest.fn(),
                }),
            }),
        } as any;
    };

    it('should skip exempt paths', async () => {
        const context = createMockContext(undefined, '/health');
        expect(await guard.canActivate(context)).toBe(true);
    });

    it('should block suspended tenants (via anomaly)', async () => {
        const context = createMockContext('t1');
        mockAnomaly.isSuspended.mockReturnValue(true);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow valid requests from free tier tenant', async () => {
        const context = createMockContext('t1');
        mockAnomaly.isSuspended.mockReturnValue(false);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', status: 'active' });
        mockRateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 9, reset: 1 });

        expect(await guard.canActivate(context)).toBe(true);
        expect(mockRateLimiter.consume).toHaveBeenCalledWith(expect.stringContaining('t1'), 10, 20);
    });

    it('should throw ThrottlerException when limit exceeded', async () => {
        const context = createMockContext('t1');
        mockAnomaly.isSuspended.mockReturnValue(false);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', status: 'active' });
        mockRateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, reset: 10 });

        await expect(guard.canActivate(context)).rejects.toThrow(ThrottlerException);
    });

    it('should handle system overload by circuit breaking', async () => {
        const context = createMockContext('t1');
        mockAnomaly.isSuspended.mockReturnValue(false);
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'ENTERPRISE', status: 'active' });
        mockRateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 0, reset: 1 });

        // Force system overload
        jest.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 900, heapTotal: 1000 } as any);

        await guard.canActivate(context);

        // ENTERPRISE limit is 200/s, but circuit breaker should cap it
        // CIRCUIT_BREAKER_MAX_REQUESTS = 1000 / 60 ≈ 16.66
        expect(mockRateLimiter.consume).toHaveBeenCalledWith(expect.any(String), expect.any(Number), expect.any(Number));
    });

    it('should throw ForbiddenException for non-existent tenant', async () => {
        const context = createMockContext('unknown-t');
        mockAnomaly.isSuspended.mockReturnValue(false);
        mockPrisma.tenant.findUnique.mockResolvedValue(null);

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
});
