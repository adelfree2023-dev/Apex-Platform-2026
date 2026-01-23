import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { Logger } from '@nestjs/common';

describe('PrismaService', () => {
  let service: PrismaService;
  const mockConfig = { get: jest.fn() };
  const mockTenantCtx = {
    getCurrentTenant: jest.fn(),
    setTenantId: jest.fn(),
    clearTenantId: jest.fn(),
    auditService: { logSecurityEvent: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: TenantContextService, useValue: mockTenantCtx },
        Logger,
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('connects on module init', async () => {
    const spy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(spy).toHaveBeenCalled();
  });

  it('withTenant sets and clears tenant ID', async () => {
    const result = await service.withTenant('t-uuid', async () => 'ok');
    expect(result).toBe('ok');
    expect(mockTenantCtx.setTenantId).toHaveBeenCalledWith('t-uuid');
    expect(mockTenantCtx.clearTenantId).toHaveBeenCalled();
  });
});
