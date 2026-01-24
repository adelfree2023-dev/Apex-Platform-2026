import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';
import { PrismaService } from '../../../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        ...getCommonProviders([DashboardService]),
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getOverview', () => {
    it('should compute overview when no cache', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000 } });
      mockPrisma.order.count.mockResolvedValue(20);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.customer.count.mockResolvedValue(50);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getOverview('t1', '2026-01-01', '2026-01-31');
      expect(result.sales.totalSales).toBe(1000);
      expect(result.inventory.totalProducts).toBe(100);
    });

    it('should return cached data if available', async () => {
      const cached = { sales: { totalSales: 5000 } };
      const cacheService = (service as any).cacheService;
      jest.spyOn(cacheService, 'get').mockResolvedValue(cached);

      const result = await service.getOverview('t1');
      expect(result).toEqual(cached);
    });

    it('should log and throw error on failure', async () => {
      const cacheService = (service as any).cacheService;
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      mockPrisma.order.aggregate.mockRejectedValue(new Error('DB Fail'));
      await expect(service.getOverview('t1')).rejects.toThrow('DB Fail');
    });
  });

  describe('getInventoryStatus', () => {
    it('should return correct inventory metrics', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', stock: 5 }]);
      mockPrisma.product.count.mockResolvedValueOnce(100).mockResolvedValueOnce(5);

      const result = await (service as any).getInventoryStatus('t1');
      expect(result.totalProducts).toBe(100);
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.lowStockPercentage).toBe(1);
    });
  });

  describe('getDashboardAlerts', () => {
    it('should generate alerts for low stock and pending orders', async () => {
      // Low stock count > 0
      mockPrisma.product.count.mockResolvedValue(10);
      // Pending orders count > 0
      mockPrisma.order.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
      // Sales comparison (stable)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 100 } });

      const alerts = await service.getDashboardAlerts('t1');
      expect(alerts).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'مخزون منخفض' }),
        expect.objectContaining({ title: 'طلبات متأخرة' })
      ]));
    });

    it('should generate alert for sales decline', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      // Last week: 50, Previous week: 100 (50% decline > 30% threshold)
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 50 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 100 } });

      const alerts = await service.getDashboardAlerts('t1');
      expect(alerts).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'انخفاض المبيعات' })
      ]));
    });

    it('should generate alert for cancelled orders', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValueOnce(0).mockResolvedValueOnce(10); // cancelled count
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const alerts = await service.getDashboardAlerts('t1');
      expect(alerts).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'طلبات ملغاة' })
      ]));
    });

    it('should handle errors gracefully and return empty array', async () => {
      mockPrisma.product.count.mockRejectedValue(new Error('Fail'));
      const alerts = await service.getDashboardAlerts('t1');
      expect(alerts).toEqual([]);
    });
  });

  describe('Real reports (S10)', () => {
    it('should return sales report with real data', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ period: 'Jan', total_sales: 1000, order_count: 5 }]);
      const result = await service.getSalesReport('t1', 'MONTH');
      expect(result.period).toBe('MONTH');
      expect(result.salesData).toBeDefined();
      expect(result.salesData[0].total_sales).toBe(1000);
    });

    it('should return products report (using performance logic)', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'p1', total_sold: 10 }]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      const result = await service.getProductsReport('t1');
      expect(result.topProducts).toBeDefined();
    });

    it('should return customers report (using performance logic)', async () => {
      mockPrisma.customer.count.mockResolvedValue(10);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
      const result = await service.getCustomersReport('t1');
      expect(result.newCustomers).toBeDefined();
    });
  });
});
