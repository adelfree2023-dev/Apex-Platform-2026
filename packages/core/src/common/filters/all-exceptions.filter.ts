import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            message: 'Internal server error', // Default safe message
        };

        // Safe error extraction
        if (exception instanceof HttpException) {
            const resp = exception.getResponse();
            if (typeof resp === 'object' && resp !== null) {
                responseBody.message = (resp as any).message || exception.message;
            } else {
                responseBody.message = exception.message;
            }
        }

        // 🛡️ Log the actual error internally, but don't leak it in the response unless dev
        if (process.env.NODE_ENV !== 'production' || httpStatus >= 500) {
            this.logger.error(
                `Exception: ${exception instanceof Error ? exception.message : exception}`,
                exception instanceof Error ? exception.stack : ''
            );
        }

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
