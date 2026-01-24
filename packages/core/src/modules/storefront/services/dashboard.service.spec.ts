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

      const result = await service.getOverview('t1');
      expect(result.sales.totalSales).toBe(1000);
    });
  });
});
