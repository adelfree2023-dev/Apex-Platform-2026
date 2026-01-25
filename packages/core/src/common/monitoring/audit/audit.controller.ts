import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TenantScopedGuard } from '../../access-control/guards/tenant-scoped.guard';

@Controller('api/audit')
@UseGuards(TenantScopedGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @Get('logs') // ✅ S4: إضافة مسار متوافق مع سكربت الاختبار
    async getLogs(@Req() req: any, @Query() query: any) {
        return this.auditService.getAuditLogs(req.tenantId, query);
    }
}
