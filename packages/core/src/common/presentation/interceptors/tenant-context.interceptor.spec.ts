import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TenantContextInterceptor', () => {
    let interceptor: TenantContextInterceptor;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TenantContextInterceptor],
        }).compile();

        interceptor = module.get<TenantContextInterceptor>(TenantContextInterceptor);
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should pass through the request', (done) => {
        const context = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
            }),
        } as unknown as ExecutionContext;
        const next: CallHandler = { handle: () => of('data') };

        interceptor.intercept(context, next).subscribe((result) => {
            expect(result).toBe('data');
            done();
        });
    });
});
