import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { getCommonProviders, createMockPrisma } from '../../test/test-utils';

describe('EventsService', () => {
  let service: EventsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        ...getCommonProviders([EventsService]),
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should emit a valid event', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', status: 'active' });

    const payload = {
      type: 'order.created',
      territory: 'US',
      businessType: 'RETAIL',
      payload: { foo: 'bar' },
    };
    const result = await service.emit('tenant-1', payload);
    expect(result).toEqual({ id: expect.any(String), status: 'queued' });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });
});
