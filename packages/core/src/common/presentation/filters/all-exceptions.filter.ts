import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, Injectable, Optional, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { SecurityContext } from '../../security/security.context';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { safeRedactError } from '../../utils/security.utils';
import * as crypto from 'crypto';

/**
* 🛡️ ASMP: Unified Exception Filter (S5)
* - يمنع تسريب البيانات الحساسة في وضع الإنتاج
* - يسجل جميع الاستثناءات بشكل آمن
* - يوفر رسائل خطأ عامة للمستخدمين
*/
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private static readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Inject(SecurityContext) private readonly securityContext: SecurityContext,
    @Optional() private readonly auditService?: AuditService,
  ) { }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = (request as any).requestId || crypto.randomUUID();
    const isProduction = process.env.NODE_ENV === 'production';
    const safeError = safeRedactError(exception);
    const ip = this.getClientIp(request);

    // 🛡️ S5: تسجيل آمن للاستثناءات
    try {
      const exceptionData = typeof exception === 'object' && exception !== null ? exception : {};
      const errorMessage = exceptionData.message || (typeof exception === 'string' ? exception : 'Unknown check failed');
      const exceptionStack = exceptionData.stack?.substring(0, 500) || '';

      this.securityContext?.logSecurityEvent?.('EXCEPTION_CAUGHT', {
        requestId,
        status,
        path: request.url,
        method: request.method,
        ip,
        error: isProduction ? 'Internal Error' : errorMessage,
        stack: isProduction ? undefined : exceptionStack,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      AllExceptionsFilter.logger.error(`Critical: SecurityContext logging failed: ${(e as any)?.message || 'Unknown'}`);
    }

    if (this.auditService) {
      this.auditService.logSecurityEvent('UNHANDLED_EXCEPTION', {
        requestId,
        path: request.url,
        method: request.method,
        ip,
        error: safeError?.message || 'Unknown',
        status,
        timestamp: new Date().toISOString(),
      }).catch(auditError => {
        AllExceptionsFilter.logger.warn(`Audit logging failed: ${auditError?.message || 'Unknown'}`);
      });
    }

    // 🛡️ S5: استجابة آمنة للمستخدم
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      message: this.getSafeErrorMessage(status, safeError.message || 'An unexpected error occurred', isProduction),
    };

    // تسجيل الخطأ محلياً للتطوير بصيغة آمنة
    const exceptionMessage = exception?.message || (typeof exception === 'string' ? exception : 'Unknown Exception');
    const exceptionStack = exception?.stack || '';

    if (!isProduction) {
      AllExceptionsFilter.logger.error(`[${requestId}] ${request.method} ${request.url} - ${status}: ${exceptionMessage}`, exceptionStack);
    } else if (status >= 500) {
      AllExceptionsFilter.logger.error(`[${requestId}] ${request.method} ${request.url} - ${status}: Internal server error`);
    }

    response.status(status).json(errorResponse);
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded : (Array.isArray(forwarded) ? forwarded[0] : (request.socket.remoteAddress || 'unknown'));
    return ip
      .split(',')[0]
      .trim()
      .replace(/[^a-z0-9\.:]/gi, '')
      .substring(0, 50);
  }

  private getSafeErrorMessage(status: number, originalMessage: string, isProduction: boolean): string {
    if (isProduction) {
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        return 'Internal server error - Contact support';
      } else if (status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED) {
        return 'Access denied - Please check your permissions';
      } else if (status === HttpStatus.NOT_FOUND) {
        return 'Resource not found';
      }
    }
    return originalMessage;
  }
}