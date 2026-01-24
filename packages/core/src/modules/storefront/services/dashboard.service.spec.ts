import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../common/caching/cache.service';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;
  let mockCache: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        ...getCommonProviders([DashboardService]),
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
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should compute overview when no cache', async () => {
      mockCache.get.mockResolvedValueOnce(undefined);

      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000 } });
      mockPrisma.order.count.mockResolvedValue(20);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.customer.count.mockResolvedValue(30);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const overview = await service.getOverview('tenant-1');

      expect(overview).toMatchObject({
        sales: expect.objectContaining({ totalSales: 1000 }),
      });
      expect(mockCache.set).toHaveBeenCalled();
    });
  });
});
