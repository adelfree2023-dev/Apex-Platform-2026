import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { getCommonProviders } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    // In Nest integration tests, when importing a module, we must provide all its dependencies
    // if THEY ARE NOT part of that module's own providers.
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should be defined', () => {
    expect(module.get<EventsModule>(EventsModule)).toBeDefined();
  });
});
