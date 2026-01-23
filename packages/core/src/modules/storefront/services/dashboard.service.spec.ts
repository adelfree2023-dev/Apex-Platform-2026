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

  it('should return cached overview if present', async () => {
    const cached = { fake: true };
    mockCache.get.mockResolvedValueOnce(cached);
    const result = await service.getOverview('tenant-1');
    expect(result).toBe(cached);
    expect(mockCache.get).toHaveBeenCalled();
    expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
  });

  it('should compute overview (no cache)', async () => {
    mockCache.get.mockResolvedValueOnce(undefined);
    // mock a few Prisma calls
    mockPrisma.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000 } });
    mockPrisma.order.count.mockResolvedValueOnce(20);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.product.count.mockResolvedValueOnce(50);
    mockPrisma.customer.count.mockResolvedValueOnce(30);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // salesByCategory
      .mockResolvedValueOnce([]); // topProducts

    const overview = await service.getOverview('tenant-1');
    expect(overview).toHaveProperty('sales');
    expect(overview.sales.totalSales).toBe(1000);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should return alerts list (happy path)', async () => {
    mockPrisma.product.count.mockResolvedValueOnce(2);
    mockPrisma.order.count.mockResolvedValueOnce(1);
    mockPrisma.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 200 } });
    mockPrisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 200 } }) // lastWeekSales
      .mockResolvedValueOnce({ _sum: { totalAmount: 400 } }); // previousWeekSales

    const alerts = await service.getDashboardAlerts('tenant-1');
    expect(Array.isArray(alerts)).toBe(true);
    // At least one alert may exist depending on mock data
  });
});
