import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, Optional } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { SecurityContext } from '../../security/security.context';
import * as crypto from 'crypto';

@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLoggerInterceptor.name);
    private readonly AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
    private readonly REDACTED_FIELDS = ['password', 'token', 'secret', 'key'];

    constructor(@Optional() private readonly securityContext: SecurityContext) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, body, ip, headers } = request;
        const tenantId = (request as any)['tenantId'] || headers['x-tenant-id'];
        const userId = (request as any)['userId'] || 'anonymous';
        const requestId = (request as any)['requestId'] || crypto.randomUUID();

        if (!tenantId || !this.AUDITED_METHODS.includes(method.toUpperCase())) return next.handle();

        const startTime = Date.now();
        const action = `${method.toUpperCase()} ${url}`;
        const sanitizedBody = this.sanitizePayload(body);

        return next.handle().pipe(
            tap({
                next: () => this.logAuditEvent(tenantId, { action, userId, ip, requestId, severity: 'info', details: { payload: sanitizedBody, status: 'SUCCESS', duration: Date.now() - startTime } }),
                error: (error) => this.logAuditEvent(tenantId, { action, userId, ip, requestId, severity: 'warning', details: { payload: sanitizedBody, error: error.message, status: 'FAILURE', duration: Date.now() - startTime } }),
            }),
        );
    }

    private logAuditEvent(tenantId: string, event: any) {
        event.tenantId = tenantId;
        event.timestamp = new Date().toISOString();
        this.securityContext?.logSecurityEvent?.('AUDIT_EVENT', event);
    }

    private sanitizePayload(payload: any) {
        if (!payload || typeof payload !== 'object') return payload;
        const sanitized = { ...payload };
        for (const field of Object.keys(sanitized)) {
            if (this.REDACTED_FIELDS.some(r => field.toLowerCase().includes(r))) sanitized[field] = '********';
        }
        return sanitized;
    }
}
