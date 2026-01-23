import { Injectable, Logger, ForbiddenException, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { SecurityContext } from '../common/security/security.context';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { Cache } from 'cache-manager';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const EmitEventSchema = z.object({
    type: z.string().min(3),
    territory: z.string().min(2).max(100),
    businessType: z.enum(['RETAIL', 'WHOLESALE', 'SERVICES', 'RESTAURANT', 'MARKETPLACE']),
    payload: z.record(z.any()),
});

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContext: TenantContextService,
        private readonly securityContext: SecurityContext,
        private readonly anomalyDetection: AnomalyDetectionService,
        private readonly inputValidator: InputValidatorService,
        @Inject('CACHE_MANAGER') private readonly cacheManager: Cache,
    ) { }

    async emit(tenantId: string, data: any) {
        const validated = await this.inputValidator.secureValidate(EmitEventSchema, data, 'events.emit');
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || tenant.status !== 'active') {
            await this.securityContext.logSecurityEvent('UNAUTHORIZED_EVENT_EMIT_ATTEMPT', { tenantId });
            throw new ForbiddenException('المستأجر غير نشط');
        }

        const schemaName = await this.tenantContext.getTenantSchema(tenantId);
        const eventId = uuidv4();
        try {
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${schemaName}"."vendure_event" (id, type, tenant_id, territory, business_type, payload, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
            `, eventId, validated.type, tenantId, validated.territory, validated.businessType, JSON.stringify(validated.payload));

            // 🛡️ S4: تسجيل نجاح إرسال الحدث
            await this.securityContext.logSecurityEvent('EVENT_EMITTED', {
                tenantId,
                eventId,
                type: validated.type
            });

            return { id: eventId, status: 'queued' };
        } catch (error) {
            // 🛡️ S3: تسجيل شذوذ في حال فشل النظام
            this.anomalyDetection.inspectFailedEvent(tenantId, validated.type, error);

            throw new InternalServerErrorException('فشل إرسال الحدث');
        }
    }
}
