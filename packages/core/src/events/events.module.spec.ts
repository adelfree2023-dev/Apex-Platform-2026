import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { SecurityContext } from '../common/security/security.context';
import { createMockSecurityContext, getCommonProviders } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .overrideProvider('CACHE_MANAGER').useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should be defined', () => {
    expect(module.get<EventsModule>(EventsModule)).toBeDefined();
  });
});
