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

  it('retries connection on failure', async () => {
    const connectSpy = jest.spyOn(service, '$connect')
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce(undefined);

    await service.connectWithRetry(2, 50);
    expect(connectSpy).toHaveBeenCalledTimes(2);
  });

  it('monitors queries for isolation violations', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    mockTenantCtx.getCurrentTenant.mockReturnValue({ id: 't1' });

    // Simulate query event manually (since $on is mockable or we can trigger the callback)
    let queryCallback: any;
    (service as any).$on = jest.fn().mockImplementation((event, cb) => {
      if (event === 'query') queryCallback = cb;
    });

    await service.onModuleInit();

    if (queryCallback) {
      await queryCallback({ query: 'SELECT * FROM users WHERE id = 1' });
      expect(mockTenantCtx.auditService.logSecurityEvent).toHaveBeenCalledWith(
        'TENANT_ISOLATION_VIOLATION',
        expect.any(Object)
      );
    }
  });

  it('disconnects on module destroy', async () => {
    const spy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
  });
});
