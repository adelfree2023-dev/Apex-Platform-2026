import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import { SecurityContext } from '../../security/security.context';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('AuditLoggerInterceptor', () => {
    let interceptor: AuditLoggerInterceptor;
    let securityContext: SecurityContext;

    const mockSecurityContext = {
        logSecurityEvent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditLoggerInterceptor,
                { provide: SecurityContext, useValue: mockSecurityContext },
            ],
        }).compile();

        interceptor = module.get<AuditLoggerInterceptor>(AuditLoggerInterceptor);
        securityContext = module.get<SecurityContext>(SecurityContext);
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should bypass GET requests', (done) => {
        const context = createMockContext('GET', '/test', 't1');
        const next: CallHandler = { handle: () => of('data') };

        interceptor.intercept(context, next).subscribe(() => {
            expect(mockSecurityContext.logSecurityEvent).not.toHaveBeenCalled();
            done();
        });
    });

    it('should log successful POST requests and redact sensitive fields', (done) => {
        const payload = { name: 'Test', password: 'secret123' };
        const context = createMockContext('POST', '/products', 't1', payload);
        const next: CallHandler = { handle: () => of('success') };

        interceptor.intercept(context, next).subscribe(() => {
            expect(mockSecurityContext.logSecurityEvent).toHaveBeenCalledWith(
                'AUDIT_EVENT',
                expect.objectContaining({
                    action: 'POST /products',
                    details: expect.objectContaining({
                        payload: expect.objectContaining({
                            password: '********'
                        }),
                        status: 'SUCCESS'
                    })
                })
            );
            done();
        });
    });

    it('should log failed requests with error message', (done) => {
        const context = createMockContext('DELETE', '/products/1', 't1');
        const next: CallHandler = { handle: () => throwError(() => new Error('Forbidden')) };

        interceptor.intercept(context, next).subscribe({
            error: () => {
                expect(mockSecurityContext.logSecurityEvent).toHaveBeenCalledWith(
                    'AUDIT_EVENT',
                    expect.objectContaining({
                        details: expect.objectContaining({
                            error: 'Forbidden',
                            status: 'FAILURE'
                        })
                    })
                );
                done();
            }
        });
    });

    function createMockContext(method: string, url: string, tenantId?: string, body: any = {}): ExecutionContext {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    method,
                    url,
                    body,
                    ip: '127.0.0.1',
                    headers: { 'x-tenant-id': tenantId },
                    tenantId
                }),
            }),
        } as unknown as ExecutionContext;
    }
});
