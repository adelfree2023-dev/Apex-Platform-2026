import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { VendureService } from '../vendors/vendure.service';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTenantDto {
    name: string;
    subdomain: string;
    businessType: 'RETAIL' | 'SERVICE' | 'EDUCATION' | 'HEALTHCARE';
    territory: string;
    cooperationPreference?: 'open' | 'selective' | 'closed';
    fulfillmentRadius?: number;
}

@Injectable()
export class TenantsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventService: EventService,
        @Inject(forwardRef(() => VendureService))
        private readonly vendureService: VendureService,
    ) { }

    /**
     * Create a new tenant with isolated PostgreSQL schema
     * Per APEX_PLATFORM_CONTEXT.md: Schema-per-Tenant isolation
     */
    async createTenant(dto: CreateTenantDto) {
        // Validate subdomain format
        if (!/^[a-z][a-z0-9-]*$/.test(dto.subdomain)) {
            throw new HttpException('Invalid subdomain format', HttpStatus.BAD_REQUEST);
        }

        // Check for reserved subdomains
        const reserved = ['admin', 'api', 'www', 'app', 'dashboard', 'super', 'apex'];
        if (reserved.includes(dto.subdomain.toLowerCase())) {
            throw new HttpException('Subdomain is reserved', HttpStatus.CONFLICT);
        }

        // Check uniqueness
        const existing = await this.prisma.tenant.findUnique({
            where: { subdomain: dto.subdomain },
        });
        if (existing) {
            throw new HttpException('Subdomain already taken', HttpStatus.CONFLICT);
        }

        const tenantId = uuidv4();
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        // Create tenant in shared schema
        const tenant = await this.prisma.tenant.create({
            data: {
                id: tenantId,
                name: dto.name,
                subdomain: dto.subdomain,
                businessType: dto.businessType,
                territory: dto.territory,
                cooperationPreference: dto.cooperationPreference || 'open',
                fulfillmentRadius: dto.fulfillmentRadius || 10,
                status: 'active',
            },
        });

        console.log(`✅ Tenant created: ${tenant.name} (${tenant.subdomain})`);

        // Create isolated PostgreSQL schema
        await this.createTenantSchema(tenantId);

        // Initialize Vendure for this tenant (creates e-commerce tables)
        await this.vendureService.initializeTenant({
            tenantId: tenant.id,
            tenantSchema,
            territory: tenant.territory,
            businessType: tenant.businessType,
            tenantName: tenant.name,
        });

        console.log(`🛒 Vendure initialized for tenant: ${tenant.subdomain}`);

        // Log event for Cooperative Intelligence
        await this.eventService.record({
            type: 'tenant.created',
            tenantId: tenant.id,
            territory: tenant.territory,
            businessType: tenant.businessType,
            payload: {
                name: tenant.name,
                subdomain: tenant.subdomain,
                cooperationPreference: tenant.cooperationPreference,
                fulfillmentRadius: tenant.fulfillmentRadius,
                vendureInitialized: true,
            },
        });

        return tenant;
    }

    /**
     * Get tenant by ID
     */
    async findById(id: string) {
        return this.prisma.tenant.findUnique({ where: { id } });
    }

    /**
     * Get tenant by subdomain
     */
    async findBySubdomain(subdomain: string) {
        return this.prisma.tenant.findUnique({ where: { subdomain } });
    }

    /**
     * List all tenants (Super Admin only)
     */
    async findAll() {
        return this.prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Suspend a tenant
     */
    async suspendTenant(id: string, reason: string) {
        const tenant = await this.prisma.tenant.update({
            where: { id },
            data: {
                status: 'suspended',
                suspendedReason: reason,
            },
        });

        await this.eventService.record({
            type: 'tenant.suspended',
            tenantId: id,
            territory: tenant.territory,
            businessType: tenant.businessType,
            payload: { reason },
        });

        return tenant;
    }

    /**
     * Create isolated PostgreSQL schema for tenant
     */
    private async createTenantSchema(tenantId: string): Promise<void> {
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`🏗️ Created PostgreSQL schema: ${schemaName}`);
    }

    /**
     * Run Prisma migrations for tenant schema
     * Per Lead Architect: Use Prisma Migrate CLI for safe schema application
     */
    private async runMigrationsForSchema(tenantId: string): Promise<void> {
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new HttpException('DATABASE_URL not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            // Set the schema in the connection URL
            const urlWithSchema = `${databaseUrl}?schema=${schemaName}`;

            execSync(
                `npx prisma db push --schema=./prisma/tenant-schema.prisma --accept-data-loss`,
                {
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        TENANT_DATABASE_URL: urlWithSchema,
                    },
                },
            );

            console.log(`📋 Migrations applied to schema: ${schemaName}`);
        } catch (error) {
            console.error(`❌ Migration failed for tenant ${tenantId}:`, error);
            throw new HttpException(
                `Migration failed for tenant ${tenantId}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
