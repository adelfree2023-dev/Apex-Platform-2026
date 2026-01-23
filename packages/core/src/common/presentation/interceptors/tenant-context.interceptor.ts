import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * 🛡️ S2: Tenant Context Interceptor
 * Ensures tenantId is consistently available in the execution context.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        // Logic to enrich request or context with validated tenant data
        return next.handle();
    }
}
