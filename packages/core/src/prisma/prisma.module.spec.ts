import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';
import { getCommonProviders } from '../../test/test-utils';

describe('PrismaModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    })
      .overrideProvider(PrismaService).useValue({}) // Provide basic mock to avoid DB connection
      .compile();
  });

  it('exports PrismaService', () => {
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });
});
