import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { TenantScopedGuard } from '../common/access-control/guards/tenant-scoped.guard';
import { Request } from 'express';

@Controller('api/events')
@UseGuards(TenantScopedGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    async emit(@Body() body: any, @Req() req: Request) {
        const tenantId = req.headers['x-tenant-id'] as string;
        return this.eventsService.emit(tenantId, body);
    }

    @Get(':id')
    async getStatus(@Param('id') id: string, @Req() req: Request) {
        const tenantId = req.headers['x-tenant-id'] as string;
        // Assuming eventsService has a method to get status by eventId and tenantId
        return (this.eventsService as any).getEventStatus(tenantId, id);
    }
}
