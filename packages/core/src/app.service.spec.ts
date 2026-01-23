import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityContext } from './common/security/security.context';
import { AuditService } from './common/monitoring/audit/audit.service';

describe('AppService', () => {
  let service: AppService;
  const mockPrisma = {
    $queryRaw: jest.fn(),
  };
  const mockConfig = { get: jest.fn().mockReturnValue('1.2.3') };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockAudit = { logOperation: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SecurityContext, useValue: mockSecurity },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should compute health without details', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([1]); // DB health
    const health = await service.getHealth(false);
    expect(health).toMatchObject({
      status: 'ok',
      service: 'apex-core',
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it('should include detailed health when requested', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([1]); // DB health
    const health = await service.getHealth(true);
    expect(health).toHaveProperty('details');
    expect(health.details).toMatchObject({
      database: { status: 'healthy' },
      security: { auditLogging: true, rateLimiting: true, encryptionEnabled: true },
    });
  });

  it('should return error object on failure', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
    const health = await service.getHealth();
    expect(health).toHaveProperty('status', 'error');
    expect(mockSecurity.logSecurityEvent).toHaveBeenCalled();
  });
});
