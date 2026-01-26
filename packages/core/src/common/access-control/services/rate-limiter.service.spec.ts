import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { ApexConfigService } from '../../core/apex-config.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { createMockPrisma } from '../../../../test/test-utils';

describe('RateLimiterService', () => {
    let service: RateLimiterService;
    let mockPrisma: any;
    let mockAnomaly: any;
    let mockConfig: any;

    beforeEach(async () => {
        mockPrisma = createMockPrisma();
        mockAnomaly = {
            isSuspended: jest.fn().mockReturnValue(false),
            inspect: jest.fn(),
        };
        mockConfig = {
            get: jest.fn().mockImplementation((key) => process.env[key]),
            getNumber: jest.fn().mockImplementation((key, def) => {
                const val = process.env[key];
                return val ? parseInt(val, 10) : def;
            }),
            getBoolean: jest.fn().mockImplementation((key, def) => {
                const val = process.env[key];
                return val !== undefined ? val === 'true' : def;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RateLimiterService,
                { provide: ApexConfigService, useValue: mockConfig },
                { provide: TenantContextService, useValue: {} },
                { provide: PrismaService, useValue: mockPrisma },
                { provide: AnomalyDetectionService, useValue: mockAnomaly },
            ],
        }).compile();

        service = module.get<RateLimiterService>(RateLimiterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should block requests for suspended tenants', async () => {
        mockAnomaly.isSuspended.mockReturnValue(true);
        const result = await service.consume('tenant1');
        expect(result.allowed).toBe(false);
    });

    it('should block requests if tenant is not found', async () => {
        mockPrisma.tenant.findUnique.mockResolvedValue(null);
        const result = await service.consume('tenant1');
        expect(result.allowed).toBe(false);
    });

    it('should allow requests within limits', async () => {
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'PRO', status: 'ACTIVE' });
        const result = await service.consume('t1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block requests when tokens are exhausted', async () => {
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', status: 'ACTIVE' });

        // Exhaust tokens (FREE has low limit in mockConfig return 100 but plan uses it)
        // We set burst to 1 to test exhaustion
        await service.consume('t1', 1, 1); // consumes 1
        const result = await service.consume('t1', 1, 1); // should be empty
        expect(result.allowed).toBe(false);
    });

    it('should trip circuit breaker on high request volume', async () => {
        mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', plan: 'FREE', status: 'ACTIVE' });

        // Force circuit breaker trip (threshold for FREE is usually 100)
        // We can mock the bucket to simulate high requestsSinceRefill
        const tenantId = 't1';
        (service as any).TOKEN_BUCKETS.set(tenantId, {
            tokens: 10,
            lastRefill: Date.now(),
            plan: 'FREE',
            requestsSinceRefill: 200 // > 100
        });

        const result = await service.consume(tenantId);
        expect(result.allowed).toBe(false);
        expect(mockAnomaly.inspect).toHaveBeenCalledWith(tenantId, true);
    });

    it('should handle generic limits', async () => {
        const key = 'ip-127.0.0.1';
        const options = { maxRequests: 2, windowMs: 1000 };

        expect((await service.checkLimit(key, options)).allowed).toBe(true);
        expect((await service.checkLimit(key, options)).allowed).toBe(true);
        expect((await service.checkLimit(key, options)).allowed).toBe(false);
    });

    it('should handle errors gracefully', async () => {
        mockPrisma.tenant.findUnique.mockRejectedValue(new Error('DB Error'));
        const result = await service.consume('t1');
        expect(result.allowed).toBe(true); // Fails safe
    });
});
