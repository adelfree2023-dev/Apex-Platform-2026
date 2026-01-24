import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { getCommonProviders, createMockPrisma } from '../test/test-utils';

describe('AppService', () => {
  let service: AppService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        ...getCommonProviders([AppService]),
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should compute health without details', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
    const health = await service.getHealth(false);
    expect(health).toMatchObject({
      status: 'ok',
      service: 'apex-core',
    });
  });
});
