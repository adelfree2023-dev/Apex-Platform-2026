import { Test, TestingModule } from '@nestjs/testing';
import { DefenseInterceptor } from './defense.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { getCommonProviders, createMockAnomalyDetection } from '../../../../test/test-utils';
import { AnomalyDetectionService } from '../../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../../access-control/services/rate-limiter.service';

describe('DefenseInterceptor', () => {
  let interceptor: DefenseInterceptor;
  let testingModule: TestingModule;
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-request-id': 'req-123' },
        tenantId: '00000000-0000-0000-0000-000000000001',
        socket: { remoteAddress: '127.0.0.1' },
        route: { path: '/api/test' }
      }),
      getResponse: () => ({
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ success: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    testingModule = await Test.createTestingModule({
      providers: [
        DefenseInterceptor,
        ...getCommonProviders([DefenseInterceptor]),
      ],
    }).compile();

    interceptor = testingModule.get<DefenseInterceptor>(DefenseInterceptor);
  });

  it('should pass through if tenantId is missing but log event', (done) => {
    const contextWithoutTenant = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/test', headers: {}, socket: {} })
      })
    } as any;

    interceptor.intercept(contextWithoutTenant, mockCallHandler).subscribe({
      next: () => {
        done();
      }
    });
  });

  it('should block suspended tenants', (done) => {
    const anomaly = testingModule.get(AnomalyDetectionService);
    jest.spyOn(anomaly, 'isSuspended').mockReturnValueOnce(true);

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: (err) => {
        expect(err.status).toBe(503);
        expect(err.message).toContain('suspended');
        done();
      }
    });
  });

  it('should block throttled tenants during system overload', (done) => {
    const anomaly = testingModule.get(AnomalyDetectionService);
    jest.spyOn(anomaly, 'isThrottled').mockReturnValueOnce(true);
    // Force overload by mocking process.memoryUsage if needed, or just mock isSystemOverloaded
    jest.spyOn(interceptor as any, 'isSystemOverloaded').mockReturnValueOnce(true);

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: (err) => {
        expect(err.status).toBe(503);
        expect(err.message).toContain('heavy load');
        done();
      }
    });
  });

  it('should block when rate limit is exceeded', (done) => {
    const rateLimiter = testingModule.get(RateLimiterService);
    jest.spyOn(rateLimiter, 'consume').mockResolvedValueOnce({ allowed: false, remaining: 0, reset: 10 });

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
        expect(err.message).toContain('Rate limit exceeded');
        done();
      }
    });
  });

  it('should handle request errors and log them', (done) => {
    const errorHandler: CallHandler = {
      handle: () => throwError(() => new Error('Business Error'))
    };

    interceptor.intercept(mockContext, errorHandler).subscribe({
      error: (err) => {
        expect(err.message).toBe('Business Error');
        done();
      }
    });
  });

  it('should extract IP from x-forwarded-for', (done) => {
    const contextWithForwarded = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET', url: '/',
          headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
          tenantId: '123',
          socket: {}
        })
      })
    } as any;

    interceptor.intercept(contextWithForwarded, mockCallHandler).subscribe({
      next: () => done(),
      error: (err) => done(err)
    });
  });
});
