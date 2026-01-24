import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { getCommonProviders } from '../../test/test-utils';

describe('EventsController (e2e)', () => {
  let controller: EventsController;
  const mockService = {
    emitEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
    getEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: mockService },
        ...getCommonProviders(),
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
