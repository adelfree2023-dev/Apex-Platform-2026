import { Test, TestingModule } from '@nestjs/testing';
import { SecurityContext } from './security.context';
import { AuditService } from '../monitoring/audit/audit.service';
import { ApexConfigService } from '../core/apex-config.service';
import { Request } from 'express';
import { INestApplication } from '@nestjs/common';

describe('SecurityContext', () => {
  let service: SecurityContext;
  let mockAuditService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAuditService = {
      logSecurityEvent: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityContext,
        { provide: AuditService, useValue: mockAuditService },
        { provide: ApexConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = await module.resolve<SecurityContext>(SecurityContext);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log security events via audit service', () => {
    const details = { foo: 'bar' };
    service.logSecurityEvent('TEST_EVENT', details);
    expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith('TEST_EVENT', details);
  });

  it('should fallback to logger if audit service is missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityContext,
        { provide: ApexConfigService, useValue: mockConfigService },
      ],
    }).compile();
    const standaloneService = await module.resolve<SecurityContext>(SecurityContext);

    const loggerSpy = jest.spyOn((standaloneService as any).logger, 'warn');
    standaloneService.logSecurityEvent('FALLBACK_EVENT', { x: 1 });
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_FALLBACK]'));
  });

  it('should log critical security events', () => {
    service.logCriticalSecurityEvent('HACK_ATTEMPT', { ip: '1.2.3.4' });
    expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith('CRITICAL_HACK_ATTEMPT', { ip: '1.2.3.4' });
  });

  it('should capture exceptions', () => {
    const error = new Error('Test Error');
    service.captureException(error);
    expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith('EXCEPTION_CAUGHT', expect.objectContaining({
      message: 'Test Error'
    }));
  });

  it('should extract IP address safely from headers', () => {
    const mockReq = {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      ip: '127.0.0.1',
    } as unknown as Request;

    expect(service.getIpFromRequest(mockReq)).toBe('192.168.1.1');
  });

  it('should extract IP address from socket if headers missing', () => {
    const mockReq = {
      headers: {},
      socket: { remoteAddress: '10.10.10.10' },
    } as unknown as Request;

    expect(service.getIpFromRequest(mockReq)).toBe('10.10.10.10');
  });

  describe('static methods', () => {
    it('should validate environment variables', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DATABASE_URL') return 'some-url';
        if (key === 'JWT_SECRET') return 'a'.repeat(64);
        return null;
      });

      expect(() => SecurityContext.validateEnvironment(mockConfigService as any)).not.toThrow();
    });

    it('should throw if secret is too short in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DATABASE_URL') return 'url';
        if (key === 'JWT_SECRET') return 'short';
        return null;
      });

      expect(() => SecurityContext.validateEnvironment(mockConfigService as any)).toThrow();
    });

    it('should verify database connection', async () => {
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([1]),
        $connect: jest.fn().mockResolvedValue(undefined),
      };
      const mockApp = {} as INestApplication;

      await expect(SecurityContext.verifyDatabaseConnection(mockPrisma as any, mockApp)).resolves.not.toThrow();
    });
    it('should throw if database reconnection fails', async () => {
      const mockPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('Fail')),
        $connect: jest.fn().mockRejectedValue(new Error('Reconnect Fail')),
      };
      const mockApp = {} as INestApplication;

      await expect(SecurityContext.verifyDatabaseConnection(mockPrisma as any, mockApp)).rejects.toThrow('Database connection failed');
    });

    it('should throw for missing env vars in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      expect(() => SecurityContext.validateEnvironment(mockConfigService as any)).toThrow('CRITICAL: Missing environment variable');
    });
  });

  describe('onModuleInit', () => {
    it('should warn if ConfigService is missing', async () => {
      const module = await Test.createTestingModule({
        providers: [
          SecurityContext,
          { provide: AuditService, useValue: mockAuditService },
          { provide: ApexConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const standalone = await module.resolve<SecurityContext>(SecurityContext);
      // Manually set config service to null for this test if needed, 
      // but the original test logic was different.
      (standalone as any).configService = null;
      const loggerSpy = jest.spyOn((standalone as any).logger, 'warn');

      standalone.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledWith('ConfigService not available in SecurityContext');
    });
  });

  describe('error handling in logging', () => {
    it('should catch errors in logSecurityEvent gracefully', () => {
      mockAuditService.logSecurityEvent.mockImplementationOnce(() => { throw new Error('Log Fail'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => service.logSecurityEvent('FAIL_EVENT', {})).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should catch errors in logCriticalSecurityEvent gracefully', () => {
      mockAuditService.logSecurityEvent.mockImplementationOnce(() => { throw new Error('Critical Log Fail'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => service.logCriticalSecurityEvent('CRITICAL_FAIL', {})).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
