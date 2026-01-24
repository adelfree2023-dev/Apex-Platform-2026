import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        ...getCommonProviders([AuditService]),
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    service.setIsSystemReady(true);
  });

  it('logs activities', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

    await service.logActivity({
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-1',
      action: 'TEST',
      details: { foo: 'bar' },
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('logs security events', async () => {
    await service.logSecurityEvent('SECURITY_EVENT', { ip: '1.2.3.4' });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('falls back to console when system is not ready', async () => {
    service.setIsSystemReady(false);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.log('t1', { action: 'FAIL_TEST', details: {} });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_FALLBACK]'));
    consoleSpy.mockRestore();
  });

  it('falls back to local file on database error (S4)', async () => {
    service.setIsSystemReady(true);
    mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DB connection lost'));

    // Mock fs.appendFileSync to avoid creating actual files
    const fs = require('fs');
    const appendSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation();
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation();
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    await service.log('t1', { action: 'DB_FAIL_ACTION', severity: 'error' });

    expect(appendSpy).toHaveBeenCalled();

    appendSpy.mockRestore();
    mkdirSpy.mockRestore();
    existsSpy.mockRestore();
  });

  it('handles missing audit table schema gracefully', async () => {
    service.setIsSystemReady(true);
    // Table check returns false
    mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.log('t1', { action: 'MISSING_TABLE_ACTION' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_FALLBACK_MISSING_TABLE]'));
    consoleSpy.mockRestore();
  });
});
