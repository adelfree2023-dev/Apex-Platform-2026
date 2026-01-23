import { Injectable, Scope, Logger, Optional, Inject, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuditService } from '../monitoring/audit/audit.service';
import { INestApplication } from '@nestjs/common';

/**
* 🏰 ASMP: Security Context
* - Maintains request-scoped security metadata
* - Handles circular dependencies gracefully
* - Provides static methods for pre-bootstrap validation
*/
@Injectable({ scope: Scope.REQUEST })
export class SecurityContext implements OnModuleInit {
    private readonly logger = new Logger(SecurityContext.name);
    private static readonly staticLogger = new Logger('SecurityContext.Static');

    constructor(
        @Optional() @Inject(forwardRef(() => AuditService))
        private readonly auditService?: AuditService,
        private readonly configService?: ConfigService,
    ) { }

    onModuleInit() {
        // التحقق من التكوين الأساسي عند التهيئة
        if (!this.configService) {
            this.logger.warn('ConfigService not available in SecurityContext');
        }
    }

    /**
    * 🛡️ S1 Protocol: Static Environment Validation
    * - Can be called before app initialization
    */
    static validateEnvironment(configService: ConfigService): void {
        this.staticLogger.log('🛡️ Validating security environment...');

        const env = configService.get('NODE_ENV') || 'development';
        this.staticLogger.log(`Environment mode: ${env}`);

        const required = ['DATABASE_URL', 'JWT_SECRET'];
        for (const envVar of required) {
            if (!configService.get(envVar)) {
                if (env === 'production') {
                    throw new Error(`CRITICAL: Missing environment variable ${envVar}`);
                }
                this.staticLogger.warn(`Warning: Missing environment variable ${envVar} in ${env} mode`);
            }
        }

        // التحقق من قوة مفتاح JWT
        const jwtSecret = configService.get('JWT_SECRET') || '';
        if (env === 'production' && jwtSecret.length < 64) {
            throw new Error('CRITICAL: JWT_SECRET must be at least 64 characters long in production');
        }
    }

    /**
    * 🛡️ S1 Protocol: Static Database Connection Verification
    */
    static async verifyDatabaseConnection(prisma: { $queryRaw: any; $connect: any }, app: INestApplication): Promise<void> {
        try {
            await prisma.$queryRaw`SELECT 1`;
            this.staticLogger.log('✅ Database connection verified');
        } catch (error) {
            this.staticLogger.error('❌ Database connection failure', error.message);

            // محاولة إعادة الاتصال
            try {
                await prisma.$connect();
                this.staticLogger.log('✅ Database reconnection successful');
            } catch (reconnectError) {
                this.staticLogger.error('❌ Database reconnection failed', reconnectError.message);
                throw new Error('Database connection failed - cannot start application');
            }
        }
    }

    /**
    * Log a security event with automatic AuditService fallback
    */
    logSecurityEvent(event: string, details: Record<string, unknown>): void {
        try {
            if (this.auditService) {
                this.auditService.logSecurityEvent(event, details);
            } else {
                // Fallback logging
                this.logger.warn(`🛡️ [AUDIT_FALLBACK] ${event}: ${JSON.stringify(details)}`);
            }
        } catch (error) {
            this.logger.error('Failed to log security event', error);
            // Safe fallback without throwing
            console.error(`[SECURITY_LOG_FAILURE] ${event}`, details);
        }
    }

    /**
    * Log critical security events
    */
    logCriticalSecurityEvent(event: string, details: Record<string, unknown>): void {
        try {
            if (this.auditService) {
                this.auditService.logSecurityEvent(`CRITICAL_${event}`, details);
            } else {
                this.logger.error(`🚨 [CRITICAL_AUDIT_FALLBACK] ${event}: ${JSON.stringify(details)}`);
            }
        } catch (error) {
            this.logger.error('CRITICAL: Failed to log critical security event', error);
            console.error(`[CRITICAL_SECURITY_LOG_FAILURE] ${event}`, details);
        }
    }

    /**
    * Capture and log an exception securely
    */
    captureException(error: Error | unknown): void {
        const err = error as Error;
        const errorDetails = {
            message: err?.message || 'Unknown error',
            name: err?.name || 'Error',
            stack: err?.stack ? err.stack.substring(0, 500) : 'No stack trace',
            timestamp: new Date().toISOString()
        };

        this.logSecurityEvent('EXCEPTION_CAUGHT', errorDetails);
    }

    /**
    * 🛡️ S5: Safe method to get IP address from request
    */
    getIpFromRequest(request: Request | any): string {
        try {
            let ip = request.ip || request.socket.remoteAddress || 'unknown';
            if (request.headers['x-forwarded-for']) {
                ip = (request.headers['x-forwarded-for'] as string).split(',')[0].trim();
            }
            return ip.replace(/[^a-z0-9\.:]/gi, '').substring(0, 50);
        } catch (error) {
            return 'unknown';
        }
    }
}
