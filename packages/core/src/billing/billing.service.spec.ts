
import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
    let service: BillingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BillingService,
                { provide: PrismaService, useValue: {} },
            ],
        }).compile();

        service = module.get<BillingService>(BillingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should record transaction', async () => {
        const result = await service.recordTransaction('tenant-1', 100, 'USD', 'ref-123');
        expect(result.status).toBe('SUCCESS');
        expect(result.amount).toBe(100);
    });

    it('should generate revenue dashboard', async () => {
        const result = await service.getRevenueDashboard('tenant-1', new Date(), new Date());
        expect(result.summary.totalRevenue).toBe(5000);
        expect(result.chartData.length).toBeGreaterThan(0);
    });

    it('should create invoice', async () => {
        const items = [{ description: 'Plan', amount: 99 }];
        const result = await service.createInvoice('tenant-1', items);
        expect(result.total).toBe(99);
        expect(result.status).toBe('PENDING');
    });
});
