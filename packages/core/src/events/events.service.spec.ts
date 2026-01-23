import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { SecurityContext } from '../common/security/security.context';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { EmitEventSchema } from './events.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('EventsService', () => {
  let service: EventsService;
  const mockPrisma = {
    tenant: { findUnique: jest.fn() },
    $executeRawUnsafe: jest.fn(),
  };
  const mockTenantCtx = { getTenantSchema: jest.fn().mockResolvedValue('public') };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockAnomaly = { detect: jest.fn() };
  const mockValidator = {
    secureValidate: jest.fn((schema, data) => Promise.resolve(data)),
  };
  const mockCache: Partial<Cache> = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantCtx },
        { provide: SecurityContext, useValue: mockSecurity },
        { provide: AnomalyDetectionService, useValue: mockAnomaly },
        { provide: InputValidatorService, useValue: mockValidator },
        { provide: 'CACHE_MANAGER', useValue: mockCache },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should emit a valid event', async () => {
    // simulate tenant exists & active
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', status: 'active' });

    const payload = {
      type: 'order.created',
      territory: 'US',
      businessType: 'RETAIL',
      payload: { foo: 'bar' },
    };
    const result = await service.emit('tenant-1', payload);
    expect(result).toEqual({ id: 'mocked-uuid', status: 'queued' });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    expect(mockValidator.secureValidate).toHaveBeenCalledWith(
      EmitEventSchema,
      payload,
      'events.emit',
    );
  });

  it('throws ForbiddenException for inactive tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', status: 'suspended' });
    const payload = { type: 'x', territory: 'US', businessType: 'RETAIL', payload: {} };
    await expect(service.emit('tenant-1', payload)).rejects.toThrow('ForbiddenException');
  });

  it('fails validation → throws BadRequestException', async () => {
    mockValidator.secureValidate.mockRejectedValueOnce(new Error('Bad schema'));
    const payload = { type: '', territory: 'U', businessType: '???', payload: {} };
    await expect(service.emit('tenant-1', payload)).rejects.toThrow();
  });
});
