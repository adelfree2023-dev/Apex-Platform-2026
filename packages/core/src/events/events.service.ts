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
        if (!tenant || tenant.status !== 'active') throw new ForbiddenException('المستأجر غير نشط');

        const schemaName = await this.tenantContext.getTenantSchema(tenantId);
        try {
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${schemaName}"."vendure_event" (id, type, tenant_id, territory, business_type, payload, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
            `, uuidv4(), validated.type, tenantId, validated.territory, validated.businessType, JSON.stringify(validated.payload));
            return { id: uuidv4(), status: 'queued' };
        } catch (error) {
            throw new InternalServerErrorException('فشل إرسال الحدث');
        }
    }
}
