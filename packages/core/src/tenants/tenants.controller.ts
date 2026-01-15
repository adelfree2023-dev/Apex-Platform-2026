/**
 * Tenants Controller
 * API endpoints for tenant management (Super Admin only)
 */

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService, CreateTenantDto } from './tenants.service';
import { VendureService } from '../vendors/vendure.service';

@ApiTags('tenants')
@ApiBearerAuth('JWT-auth')
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
    @ApiOperation({ summary: 'Create Tenant', description: 'Create a new tenant with isolated schema' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Cairo Fashion Store' },
                subdomain: { type: 'string', example: 'cairo-fashion' },
                businessType: { type: 'string', enum: ['RETAIL', 'WHOLESALE', 'SERVICES'], example: 'RETAIL' },
                territory: { type: 'string', example: 'Cairo' },
            },
            required: ['name', 'subdomain', 'businessType', 'territory'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tenant created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid subdomain or already taken' })
    async create(@Body() dto: CreateTenantDto) {
        return this.tenantsService.createTenant(dto);
    }

    /**
     * List all tenants (Super Admin only)
     */
    @Get()
    @ApiOperation({ summary: 'List All Tenants', description: 'Retrieve all tenants in the system' })
    @ApiResponse({ status: 200, description: 'List of tenants' })
    async findAll() {
        return this.tenantsService.findAll();
    }

    /**
     * Get tenant by ID (Super Admin only)
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get Tenant', description: 'Retrieve tenant details by ID' })
    @ApiParam({ name: 'id', description: 'Tenant UUID' })
    @ApiResponse({ status: 200, description: 'Tenant details' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async findById(@Param('id') id: string) {
        return this.tenantsService.findById(id);
    }

    /**
     * Suspend a tenant (Super Admin only)
     */
    @Post(':id/suspend')
    @ApiOperation({ summary: 'Suspend Tenant', description: 'Suspend a tenant with reason' })
    @ApiParam({ name: 'id', description: 'Tenant UUID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: { reason: { type: 'string', example: 'Violation of terms' } },
            required: ['reason'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tenant suspended' })
    async suspend(@Param('id') id: string, @Body('reason') reason: string) {
        return this.tenantsService.suspendTenant(id, reason);
    }

    /**
     * Migrate existing tenant to add cart tables (Phase 02 upgrade)
     */
    @Post(':id/migrate')
    @ApiOperation({ summary: 'Migrate Tenant', description: 'Re-initialize tenant to add missing tables' })
    @ApiParam({ name: 'id', description: 'Tenant UUID' })
    @ApiResponse({ status: 200, description: 'Migration successful' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async migrateTenant(@Param('id') id: string) {
        const tenant = await this.tenantsService.findById(id);
        if (!tenant) {
            return { error: 'Tenant not found' };
        }

        const tenantSchema = `tenant_${tenant.id.replace(/-/g, '_')}`;

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
