import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
  });

  it('exports PrismaService', () => {
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeInstanceOf(PrismaService);
  });
});
