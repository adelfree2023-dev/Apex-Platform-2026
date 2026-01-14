import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantsService, CreateTenantDto } from './tenants.service';
import { VendureService } from '../vendors/vendure.service';

@Controller('api/admin/tenants')
export class TenantsController {
    constructor(
        private readonly tenantsService: TenantsService,
        private readonly vendureService: VendureService,
    ) { }

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

    /**
     * Migrate existing tenant to add cart tables (Phase 02 upgrade)
     */
    @Post(':id/migrate')
    async migrateTenant(@Param('id') id: string) {
        const tenant = await this.tenantsService.findById(id);
        if (!tenant) {
            return { error: 'Tenant not found' };
        }

        const tenantSchema = `tenant_${tenant.id.replace(/-/g, '_')}`;

        // Re-initialize Vendure to add missing tables
        await this.vendureService.initializeTenant({
            tenantId: tenant.id,
            tenantSchema,
            territory: tenant.territory,
            businessType: tenant.businessType,
            tenantName: tenant.name,
        });

        return {
            success: true,
            message: 'Tenant migrated with cart tables',
            tenantId: tenant.id,
            tenantSchema,
        };
    }
}

