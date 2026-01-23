import {
    Injectable,
    Logger,
    InternalServerErrorException,
    Inject,
    forwardRef
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { SecurityContext } from '../../security/security.context';
import { InputValidatorService } from '../../security/validation/input-validator.service';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const AuditLogSchema = z.object({
    action: z.string().min(1),
    userId: z.union([z.string(), z.number(), z.null()]).optional(),
    ip: z.string().ip().optional(),
    severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
    details: z.record(z.any()).optional(),
});

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private isSystemReady = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContext: TenantContextService,
        private readonly inputValidator: InputValidatorService,
    ) {
        // التحقق من حالة النظام عند التشغيل
        this.checkInitialHealth();
    }

    /**
     * ⚡ تعيين حالة النظام (جاهز/غير جاهز)
     */
    setIsSystemReady(ready: boolean) {
        this.isSystemReady = ready;
        const logger = (this as any).logger || new Logger('AuditService');
        logger.log(`🛡️ Audit system connectivity: ${ready ? 'CONNECTED' : 'STANDBY'}`);
    }

    private async checkInitialHealth() {
        try {
            // محاولة التحقق من وجود جداول النظام
            const tableExists = await (this.prisma as any).$queryRaw<any[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'vendure_audit_log'
        );
      `;
            this.isSystemReady = tableExists[0]?.exists || false;
        } catch (e) {
            this.isSystemReady = false;
        }
    }

    /**
     * ✅ تسجيل آمن للحدث مع معالجة حالات الفشل
     */
    async log(tenantId: string, auditEvent: any): Promise<void> {
        // ⚡ الحل الجزري: إذا لم يكن النظام جاهزاً، لا نحاول التسجيل في قاعدة البيانات
        if (!this.isSystemReady) {
            this.logger.warn(`[AUDIT_SKIP] System not ready - logging to console for tenant ${tenantId}`);
            console.log(`[AUDIT_FALLBACK] ${tenantId} - ${auditEvent.action}: ${JSON.stringify(auditEvent.details)}`);
            return;
        }

        try {
            const validated = await this.inputValidator.secureValidate(AuditLogSchema, auditEvent, 'audit.log');
            const schemaName = tenantId === 'SYSTEM' ? 'tenant_SYSTEM' : await this.tenantContext.getTenantSchema(tenantId);

            // ⚡ التحقق من وجود الجدول قبل المحاولة لتجنب الانهيار
            const tableExists = await (this.prisma as any).$queryRaw<any[]>`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = ${schemaName} 
          AND table_name = 'vendure_audit_log'
        );
      `;

            if (!tableExists[0]?.exists) {
                this.logger.warn(`[AUDIT_MISSING_TABLE] Table missing in schema ${schemaName} - logging to console`);
                console.log(`[AUDIT_FALLBACK_MISSING_TABLE] ${tenantId} - ${auditEvent.action}`);
                return;
            }

            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}"."vendure_audit_log" (
          id, action, user_id, ip_address, details, severity, created_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
      `,
                uuidv4(),
                validated.action,
                validated.userId?.toString() || null,
                validated.ip || null,
                validated.details ? JSON.stringify(validated.details) : null,
                validated.severity
            );
        } catch (error) {
            this.handleLogFailure(tenantId, auditEvent, error);
        }
    }

    /**
     * ⚡ معالجة فشل التسجيل بأمان لخدمة ASMP
     */
    private handleLogFailure(tenantId: string, event: any, error: any): void {
        const safeError = {
            message: error.message || 'Unknown error',
            code: error.code || 'UNKNOWN',
        };

        // الحل الجزري: منع الحلقات اللانهائية بتسجيل الفشل في الكونسول فقط
        this.logger.error(`[AUDIT_FAILURE] Tenant: ${tenantId}, Action: ${event.action}, Error: ${safeError.message}`);

        if (safeError.code === '42P01') {
            this.logger.warn(`[AUDIT_RECOVERY] Schema or table missing. Setting isSystemReady to false.`);
            this.isSystemReady = false;
        }
    }

    /**
     * 🛡️ ASMP: Security Event Logging Wrapper
     */
    async logSecurityEvent(event: string, details: any): Promise<void> {
        const tenantId = this.tenantContext.getTenantId() || 'SYSTEM';
        return this.log(tenantId, {
            action: event,
            severity: 'critical',
            details: details,
        });
    }

    /**
     * 🛡️ ASMP: Standardized Operation Logging
     */
    async logOperation(data: {
        tenantId: string;
        userId: string;
        action: string;
        target?: string;
        details?: any;
        ip?: string;
    }): Promise<void> {
        return this.log(data.tenantId, {
            action: data.action,
            userId: data.userId,
            ip: data.ip,
            severity: 'info',
            details: {
                target: data.target,
                ...data.details
            }
        });
    }

    async getAuditLogs(tenantId: string, filters: any): Promise<any[]> {
        try {
            const schemaName = await this.tenantContext.getTenantSchema(tenantId);
            const logs = await this.prisma.$queryRawUnsafe<any[]>(`
              SELECT * FROM "${schemaName}"."vendure_audit_log" 
              ORDER BY created_at DESC LIMIT 100
          `);
            return logs;
        } catch (error) {
            throw new InternalServerErrorException('فشل الحصول على سجلات التدقيق');
        }
    }
}
