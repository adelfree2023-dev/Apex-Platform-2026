import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { EventsService } from './events.service';
import { getCommonProviders } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      // Standard providers will take precedence over those in EventsModule due to override or manual provision
      // In Nest integration tests, we provide mocks for external dependencies
      .compile();
  });

  it('should provide EventsService', () => {
    try {
      const svc = module.get<EventsService>(EventsService);
      expect(svc).toBeInstanceOf(EventsService);
    } catch (e) {
      // If compilation failed due to DI, this will show why
      console.error('DI Failure:', e.message);
      throw e;
    }
  });

  it('must export EventsService', () => {
    const exports = (module as any).exports.map((e: any) => e?.name || e);
    expect(exports).toContain('EventsService');
  });
});
