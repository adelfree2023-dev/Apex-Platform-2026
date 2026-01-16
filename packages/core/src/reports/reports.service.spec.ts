
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
    let service: ReportsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: PrismaService, useValue: {} },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should generate tenant report', async () => {
        const result = await service.generateTenantReport('tenant-1', '30d');
        expect(result.metrics.totalSales).toBe(15000);
        expect(result.range).toBe('30d');
    });

    it('should generate platform revenue report', async () => {
        const result = await service.generatePlatformRevenueReport();
        expect(result.totalPlatformRevenue).toBe(500000);
        expect(result.activeTenants).toBe(120);
    });
});
