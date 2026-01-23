import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TenantScopedGuard } from '../../access-control/guards/tenant-scoped.guard';

@Controller('api/audit')
@UseGuards(TenantScopedGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    async getLogs(@Req() req: any, @Query() query: any) {
        return this.auditService.getAuditLogs(req.tenantId, query);
    }
}
