import { AllExceptionsFilter } from './all-exceptions.filter';
import { Test, TestingModule } from '@nestjs/testing';
import { SecurityContext } from '../../security/security.context';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { HttpStatus, HttpException, ExecutionContext } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let securityContext: any;
  let auditService: any;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    url: '/test',
    method: 'GET',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  };

  const mockHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    } as unknown as HttpArgumentsHost),
  };

  beforeEach(async () => {
    securityContext = {
      logSecurityEvent: jest.fn(),
    };
    auditService = {
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        { provide: SecurityContext, useValue: securityContext },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  it('should handle HttpException correctly', () => {
    const exception = new HttpException('Access Denied', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Access Denied',
    }));
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith('EXCEPTION_CAUGHT', expect.anything());
  });

  it('should handle generic Error as Internal Server Error', () => {
    const exception = new Error('Database connection failed');
    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith('EXCEPTION_CAUGHT', expect.anything());
  });

  it('should handle missing audit service gracefully', async () => {
    const filterWithoutAudit = new AllExceptionsFilter(securityContext);
    const exception = new Error('Test Error');

    expect(() => filterWithoutAudit.catch(exception, mockHost as any)).not.toThrow();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  describe('Branch Coverage: Production Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should redact error messages in production for 500 errors', () => {
      const exception = new Error('Database Password: 123');
      filter.catch(exception, mockHost as any);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Internal server error - Contact support',
      }));
    });

    it('should provide safe messages for 403 errors in production', () => {
      const exception = new HttpException('Specific forbidden reason', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockHost as any);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Access denied - Please check your permissions',
      }));
    });

    it('should provide safe messages for 404 errors in production', () => {
      const exception = new HttpException('Missing file', HttpStatus.NOT_FOUND);
      filter.catch(exception, mockHost as any);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Resource not found',
      }));
    });
  });

  describe('Branch Coverage: IP Extraction', () => {
    it('should handle x-forwarded-for as string', () => {
      mockRequest.headers = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' };
      const exception = new Error('test');
      filter.catch(exception, mockHost as any);
      expect(securityContext.logSecurityEvent).toHaveBeenCalledWith('EXCEPTION_CAUGHT', expect.objectContaining({ ip: '1.2.3.4' }));
    });

    it('should handle missing IP sources', () => {
      mockRequest.headers = {};
      mockRequest.socket = {} as any;
      const exception = new Error('test');
      filter.catch(exception, mockHost as any);
      expect(securityContext.logSecurityEvent).toHaveBeenCalledWith('EXCEPTION_CAUGHT', expect.objectContaining({ ip: 'unknown' }));
    });
  });

  describe('Branch Coverage: Service Failures', () => {
    it('should catch SecurityContext logging errors', () => {
      securityContext.logSecurityEvent.mockImplementation(() => { throw new Error('Log Fail'); });
      const exception = new Error('test');
      expect(() => filter.catch(exception, mockHost as any)).not.toThrow();
    });

    it('should catch AuditService logging errors', async () => {
      auditService.logSecurityEvent.mockRejectedValue(new Error('Audit Fail'));
      const exception = new Error('test');
      filter.catch(exception, mockHost as any);
      // Wait for promise tick
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockResponse.status).toHaveBeenCalled();
    });
  });
});
