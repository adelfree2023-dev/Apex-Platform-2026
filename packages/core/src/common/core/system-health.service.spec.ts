import { Test, TestingModule } from '@nestjs/testing';
import { SystemHealthService } from './system-health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnomalyDetectionService } from '../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../access-control/services/rate-limiter.service';
import { EncryptedFieldService } from '../security/encryption/encrypted-field.service';
import { createMockPrisma } from '../../../test/test-utils';

describe('SystemHealthService', () => {
    let service: SystemHealthService;
    let mockPrisma: any;

    beforeEach(async () => {
        mockPrisma = createMockPrisma();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SystemHealthService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: AnomalyDetectionService, useValue: {} },
                { provide: RateLimiterService, useValue: {} },
                { provide: EncryptedFieldService, useValue: {} },
            ],
        }).compile();

        service = module.get<SystemHealthService>(SystemHealthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return healthy status when db is up', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([1]);
        const health = await service.checkHealth();
        expect(health.status).toBe('healthy');
        expect(health.components.database.status).toBe('up');
    });

    it('should return degraded status when db is down', async () => {
        mockPrisma.$queryRaw.mockRejectedValue(new Error('DB connection failed'));
        const health = await service.checkHealth();
        expect(health.status).toBe('degraded');
        expect(health.components.database.status).toBe('down');
    });

    it('should detect overload based on memory usage', () => {
        // Mock process.memoryUsage
        const memorySpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
            rss: 0,
            heapTotal: 100,
            heapUsed: 95, // 95% > 90%
            external: 0,
            arrayBuffers: 0,
        });

        expect(service.isOverloaded()).toBe(true);

        memorySpy.mockReturnValue({
            rss: 0,
            heapTotal: 100,
            heapUsed: 50,
            external: 0,
            arrayBuffers: 0,
        });
        expect(service.isOverloaded()).toBe(false);

        memorySpy.mockRestore();
    });
});
