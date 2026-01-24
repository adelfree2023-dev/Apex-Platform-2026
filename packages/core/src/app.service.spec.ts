import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { getCommonProviders, createMockPrisma } from '../test/test-utils';
import { ConfigService } from '@nestjs/config';
import { SecurityContext } from './common/security/security.context';

describe('AppService', () => {
  let service: AppService;
  let mockPrisma: any;
  const mockSecurity = {
    logSecurityEvent: jest.fn(),
    logCriticalSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        ...getCommonProviders([AppService]).filter(p => {
          if (typeof p === 'object' && p !== null && 'provide' in p) {
            return (p as any).provide !== SecurityContext;
          }
          return p !== SecurityContext;
        }),
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SecurityContext, useValue: mockSecurity },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('should compute health without details', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
      const health = await service.getHealth(false);
      expect(health).toMatchObject({
        status: 'ok',
        service: 'apex-core',
      });
    });

    it('should compute health with details', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
      const health = await service.getHealth(true);
      expect(health).toMatchObject({
        status: 'ok',
        details: {
          database: { status: 'healthy' },
          security: expect.any(Object),
        },
      });
    });

    it('should return degraded if database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB Fail'));
      const health = await service.getHealth(false);
      expect(health.status).toBe('degraded');
    });

    it('should catch unexpected errors and log security event', async () => {
      jest.spyOn(service as any, 'getDatabaseHealth').mockRejectedValueOnce(new Error('Unexpected'));

      const health = await service.getHealth(false);

      expect(health.status).toBe('error');
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'HEALTH_CHECK_FAILURE',
        expect.objectContaining({ error: 'Unexpected' })
      );
    });
  });

  describe('verifyDatabaseConnection', () => {
    it('should return true on success', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
      const result = await service.verifyDatabaseConnection();
      expect(result).toBe(true);
    });

    it('should return false and log event on failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Conn Fail'));
      const result = await service.verifyDatabaseConnection();
      expect(result).toBe(false);
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'DATABASE_CONNECTION_FAILURE',
        expect.objectContaining({ error: 'Conn Fail' })
      );
    });
  });
});
