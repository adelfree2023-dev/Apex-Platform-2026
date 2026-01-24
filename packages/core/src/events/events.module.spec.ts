import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { SecurityContext } from '../common/security/security.context';
import { PrismaService } from '../prisma/prisma.service';
import { createMockSecurityContext, createMockPrisma } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    // 🛡️ S7: We must provide constructor dependencies for the Module itself
    // when using imports: [EventsModule]
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .overrideProvider(PrismaService).useValue(createMockPrisma())
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should be defined', () => {
    expect(module.get<EventsModule>(EventsModule)).toBeDefined();
  });
});
