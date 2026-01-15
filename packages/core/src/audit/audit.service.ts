/**
 * Audit Service
 * Logs security events to tenant schema
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEvent {
    action: string;
    userId?: number;
    ip?: string;
    userAgent?: string;
    details?: Record<string, any>;
    severity: 'info' | 'warning' | 'error' | 'critical';
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create audit log table for tenant
     */
    async createAuditTable(tenantSchema: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_audit_log" (
                id SERIAL PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                user_id INT,
                ip_address VARCHAR(50),
                user_agent TEXT,
                details JSONB,
                severity VARCHAR(20) DEFAULT 'info',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Create index for faster queries
        await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_audit_created_at 
            ON "${tenantSchema}"."vendure_audit_log" (created_at DESC)
        `);
    }

    /**
     * Log an audit event
     */
    async log(tenantSchema: string, event: AuditEvent): Promise<void> {
        try {
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${tenantSchema}"."vendure_audit_log" 
                (action, user_id, ip_address, user_agent, details, severity, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
                event.action,
                event.userId || null,
                event.ip || null,
                event.userAgent || null,
                JSON.stringify(event.details || {}),
                event.severity
            );
        } catch (error) {
            // Don't throw - audit logging should not break the app
            this.logger.error(`Failed to log audit event: ${error}`);
        }
    }

    /**
     * Log login attempt
     */
    async logLogin(tenantSchema: string, userId: number, ip: string, success: boolean): Promise<void> {
        await this.log(tenantSchema, {
            action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            userId,
            ip,
            severity: success ? 'info' : 'warning',
            details: { success },
        });
    }

    /**
     * Log password change
     */
    async logPasswordChange(tenantSchema: string, userId: number, ip: string): Promise<void> {
        await this.log(tenantSchema, {
            action: 'PASSWORD_CHANGED',
            userId,
            ip,
            severity: 'info',
        });
    }

    /**
     * Log admin action
     */
    async logAdminAction(tenantSchema: string, userId: number, action: string, details?: any): Promise<void> {
        await this.log(tenantSchema, {
            action: `ADMIN_${action.toUpperCase()}`,
            userId,
            severity: 'info',
            details,
        });
    }

    /**
     * Log security event
     */
    async logSecurityEvent(tenantSchema: string, action: string, ip: string, details?: any): Promise<void> {
        await this.log(tenantSchema, {
            action: `SECURITY_${action.toUpperCase()}`,
            ip,
            severity: 'warning',
            details,
        });
    }

    /**
     * Get audit logs
     */
    async getAuditLogs(tenantSchema: string, options: {
        limit?: number;
        offset?: number;
        action?: string;
        severity?: string;
        userId?: number;
        startDate?: Date;
        endDate?: Date;
    } = {}): Promise<any[]> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        let query = `
            SELECT * FROM "${tenantSchema}"."vendure_audit_log"
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (options.action) {
            query += ` AND action = $${paramIndex++}`;
            params.push(options.action);
        }
        if (options.severity) {
            query += ` AND severity = $${paramIndex++}`;
            params.push(options.severity);
        }
        if (options.userId) {
            query += ` AND user_id = $${paramIndex++}`;
            params.push(options.userId);
        }
        if (options.startDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            params.push(options.startDate);
        }
        if (options.endDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            params.push(options.endDate);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        try {
            const logs = await this.prisma.$queryRawUnsafe(query, ...params);
            return (logs as any[]).map(log => ({
                id: Number(log.id),
                action: log.action,
                userId: log.user_id ? Number(log.user_id) : null,
                ip: log.ip_address,
                userAgent: log.user_agent,
                details: log.details,
                severity: log.severity,
                createdAt: log.created_at,
            }));
        } catch (error) {
            this.logger.error(`Failed to get audit logs: ${error}`);
            return [];
        }
    }
}
