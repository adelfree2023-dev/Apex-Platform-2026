import { Body, Controller, Post, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TenantsService } from './tenants.service';
import { TenantScopedGuard } from '../../common/access-control/guards/tenant-scoped.guard';

@Controller('api/tenants')
@UseGuards(TenantScopedGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Public()
    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    async registerTenant(@Body() data: any) {
        return this.tenantsService.createTenantWithStore(data);
    }
}
