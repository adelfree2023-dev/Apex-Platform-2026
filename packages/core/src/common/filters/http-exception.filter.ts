/**
 * Global Exception Filter
 * Masks error details in production
 */

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger
} from '@nestjs/common';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionFilter');

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Generate request ID for tracking
        const requestId = randomBytes(8).toString('hex');

        // Determine status code
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Get error message
        const message = exception instanceof HttpException
            ? exception.getResponse()
            : exception.message || 'Internal server error';

        // Log the full error
        this.logger.error(
            `[${requestId}] ${request.method} ${request.url} - ${status}`,
            exception.stack
        );

        // Check if production
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            // Production: Hide internal details
            response.status(status).json({
                statusCode: status,
                message: status >= 500 ? 'Internal server error' : this.getPublicMessage(message),
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
            });
        } else {
            // Development: Show full details
            response.status(status).json({
                statusCode: status,
                message: this.getPublicMessage(message),
                error: exception.name,
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
                stack: exception.stack,
                details: exception.response || null,
            });
        }
    }

    /**
     * Extract public message from exception response
     */
    private getPublicMessage(message: any): string | string[] {
        if (typeof message === 'string') {
            return message;
        }
        if (typeof message === 'object' && message.message) {
            return message.message;
        }
        return 'An error occurred';
    }
}
