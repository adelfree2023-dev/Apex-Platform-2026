import { Test, TestingModule } from '@nestjs/testing';
import { DefenseInterceptor } from './defense.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { getCommonProviders } from '../../../../test/test-utils';

describe('DefenseInterceptor', () => {
  let interceptor: DefenseInterceptor;
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/api/test',
        headers: { 'x-request-id': 'req-123' },
        tenantId: '00000000-0000-0000-0000-000000000001'
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
      providers: [
        DefenseInterceptor,
        ...getCommonProviders(),
      ],
    }).compile();

    interceptor = module.get<DefenseInterceptor>(DefenseInterceptor);
  });

  it('passes through when tenant is present', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
        done();
      },
      error: (err) => {
        done(err);
      }
    });
  });
});
