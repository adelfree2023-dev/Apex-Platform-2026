import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantsService, CreateTenantDto } from './tenants.service';

@Controller('api/admin/tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    /**
     * Create a new tenant (Super Admin only)
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateTenantDto) {
        return this.tenantsService.createTenant(dto);
    }

    /**
     * List all tenants (Super Admin only)
     */
    @Get()
    async findAll() {
        return this.tenantsService.findAll();
    }

    /**
     * Get tenant by ID (Super Admin only)
     */
    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.tenantsService.findById(id);
    }

    /**
     * Suspend a tenant (Super Admin only)
     */
    @Post(':id/suspend')
    async suspend(@Param('id') id: string, @Body('reason') reason: string) {
        return this.tenantsService.suspendTenant(id, reason);
    }
}
