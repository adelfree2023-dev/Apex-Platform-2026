import { Body, Controller, Post, Req, HttpStatus, HttpCode, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TenantsService } from './tenants.service';
import { TenantScopedGuard } from '../../common/access-control/guards/tenant-scoped.guard';
import { InputValidatorService } from '../../common/security/validation/input-validator.service';
import { CreateTenantSchema } from '../../common/security/validation/dto/tenant.dto';

@Controller('api/tenants')
@UseGuards(TenantScopedGuard)
export class TenantsController {
    constructor(
        private readonly tenantsService: TenantsService,
        private readonly inputValidator: InputValidatorService,
    ) { }

    @Public()
    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    async registerTenant(@Body() data: any, @Req() request: any) {
        const ctx = require('../../common/utils/security.utils').extractContext(request);
        const validated = await this.inputValidator.secureValidate(CreateTenantSchema, data, 'tenant.register');
        return this.tenantsService.createTenantWithStore(validated, ctx);
    }
}
