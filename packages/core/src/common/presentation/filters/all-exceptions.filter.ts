import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, Injectable, Optional, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { SecurityContext } from '../../security/security.context';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { safeRedactError } from '../../utils/security.utils';
import * as crypto from 'crypto';

/**
 * 🛡️ ASMP: Unified Exception Filter
 * - S5: Error Handling & Fault Tolerance
 * - Ensures error messages don't leak sensitive data
 * - Logs all exceptions securely via AuditService
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(
        @Inject(SecurityContext) private readonly securityContext: SecurityContext,
        @Optional() private readonly auditService?: AuditService,
    ) { }

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const requestId = (request as any).requestId || crypto.randomUUID();
        const safeError = safeRedactError(exception);

        const logger = (this as any).logger || new Logger('AllExceptionsFilter');
        // 🛡️ S5: Fail-safe logging using SecurityContext (Console fallback)
        try {
            this.securityContext?.logSecurityEvent?.('EXCEPTION_CAUGHT', {
                requestId,
                status,
                path: request.url,
                error: safeError.message,
            });
        } catch (e) {
            logger.error(`Critical: SecurityContext logging failed: ${e.message}`);
        }

        // 🛡️ Audit logging with safe fallback
        if (this.auditService) {
            this.auditService.logSecurityEvent('UNHANDLED_EXCEPTION', {
                requestId,
                path: request.url,
                error: safeError.message,
                status
            }).catch(auditError => {
                logger.warn(`Audit logging failed: ${auditError.message}`);
            });
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: isProduction && status === 500 ? 'Internal server error - Contact support' : safeError.message,
            requestId,
        };

        // تسجيل الخطأ محلياً للمتابعة
        if (status >= 500) {
            logger.error(`[${requestId}] ${request.method} ${request.url} - ${status}: ${exception.message}`, exception.stack);
        } else {
            logger.warn(`[${requestId}] ${request.method} ${request.url} - ${status}: ${exception.message}`);
        }

        response.status(status).json(errorResponse);
    }
}
