import { Test, TestingModule } from '@nestjs/testing';
import { DefenseInterceptor } from './defense.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('DefenseInterceptor', () => {
  let interceptor: DefenseInterceptor;
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-request-id': 'req-123' },
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [DefenseInterceptor],
    }).compile();

    interceptor = module.get<DefenseInterceptor>(DefenseInterceptor);
  });

  it('adds security headers and passes through', (done) => {
    const response = mockContext.switchToHttp().getResponse();
    interceptor.intercept(mockContext, mockCallHandler).subscribe((val) => {
      expect(val).toEqual({ success: true });
      expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      done();
    });
  });
});
