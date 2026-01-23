import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../common/caching/cache.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const mockPrisma = {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getOverview', () => {
    it('should return cached overview if present', async () => {
      const cached = { sales: { totalSales: 1000 }, inventory: {} };
      mockCache.get.mockResolvedValueOnce(cached);

      const result = await service.getOverview('tenant-1');

      expect(result).toBe(cached);
      expect(mockCache.get).toHaveBeenCalledWith('dashboard:overview:tenant-1:all:all');
      expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
    });

    it('should compute overview when no cache', async () => {
      mockCache.get.mockResolvedValueOnce(undefined);

      // Setup all required Prisma responses
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } }) // totalSales
        .mockResolvedValueOnce({ _sum: { totalAmount: 800 } }); // previous period for comparison

      mockPrisma.order.count
        .mockResolvedValueOnce(20) // orderCount
        .mockResolvedValueOnce(15); // completed orders

      mockPrisma.product.count
        .mockResolvedValueOnce(50) // totalProducts
        .mockResolvedValueOnce(5); // lowStockProducts

      mockPrisma.customer.count
        .mockResolvedValueOnce(30) // total customers
        .mockResolvedValueOnce(10); // active customers

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ category: 'Electronics', total_sales: 500 }]) // salesByCategory
        .mockResolvedValueOnce([{ id: 'p1', name: 'Product 1', total_sold: 10 }]); // topProducts

      const overview = await service.getOverview('tenant-1');

      expect(overview).toMatchObject({
        sales: expect.objectContaining({
          totalSales: 1000,
          orderCount: 20,
          averageOrderValue: 50
        }),
        inventory: expect.objectContaining({
          totalProducts: 50
        }),
        orders: expect.objectContaining({
          completionRate: expect.any(Number)
        }),
        products: expect.objectContaining({
          topProducts: expect.any(Array)
        }),
        customers: expect.objectContaining({
          newCustomers: expect.any(Number),
          activeCustomers: expect.any(Number)
        })
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        'dashboard:overview:tenant-1:all:all',
        expect.any(Object),
        300
      );
    });

    it('should handle errors gracefully', async () => {
      mockCache.get.mockResolvedValueOnce(undefined);
      mockPrisma.order.aggregate.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getOverview('tenant-1')).rejects.toThrow();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardAlerts', () => {
    it('should return no alerts when everything is normal', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(0) // low stock
        .mockResolvedValueOnce(0); // out of stock

      mockPrisma.order.count
        .mockResolvedValueOnce(0) // pending orders
        .mockResolvedValueOnce(0); // cancelled orders

      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } }) // current week
        .mockResolvedValueOnce({ _sum: { totalAmount: 900 } }); // previous week

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts).toHaveLength(0);
    });

    it('should return alerts for low stock', async () => {
      mockPrisma.product.count.mockResolvedValueOnce(3); // 3 low stock products
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } });

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'WARNING',
        title: 'مخزون منخفض',
        message: '3 منتجات لديها مخزون منخفض (أقل من 5 وحدات)',
        severity: 'MEDIUM'
      });
    });

    it('should generate high severity alert for many low stock items', async () => {
      mockPrisma.product.count.mockResolvedValueOnce(12); // 12 low stock products
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } });

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should return alerts for delayed orders', async () => {
      mockPrisma.product.count.mockResolvedValueOnce(0);
      mockPrisma.order.count.mockResolvedValueOnce(7); // 7 pending orders over 7 days
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } });

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'WARNING',
        title: 'طلبات متأخرة',
        message: '7 طلبات بحالة "قيد المعالجة" لأكثر من 7 أيام',
        severity: 'HIGH'
      });
    });

    it('should return alerts for sales decline', async () => {
      mockPrisma.product.count.mockResolvedValueOnce(0);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 500 } }) // last week: 500
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } }); // previous week: 1000

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('المبيعات انخفضت بنسبة 50.0%');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.product.count.mockRejectedValueOnce(new Error('DB error'));

      const alerts = await service.getDashboardAlerts('tenant-1');

      expect(alerts).toHaveLength(0);
    });
  });

  describe('Reporting methods', () => {
    it('getSalesReport should return placeholder', async () => {
      const result = await service.getSalesReport('tenant-1', 'MONTH');
      expect(result).toEqual({
        message: "Sales report not implemented yet",
        tenantId: 'tenant-1',
        period: 'MONTH'
      });
    });

    it('getProductsReport should return placeholder', async () => {
      const result = await service.getProductsReport('tenant-1', 'SALES');
      expect(result).toEqual({
        message: "Products report not implemented yet",
        tenantId: 'tenant-1',
        sortBy: 'SALES'
      });
    });

    it('getCustomersReport should return placeholder', async () => {
      const result = await service.getCustomersReport('tenant-1', 'ACTIVE');
      expect(result).toEqual({
        message: "Customers report not implemented yet",
        tenantId: 'tenant-1',
        segment: 'ACTIVE'
      });
    });
  });
});
