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
});
