import { Injectable, InternalServerErrorException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '../../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../../common/security/encryption/encrypted-field.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

import { AuditService } from '../../common/monitoring/audit/audit.service';

@Injectable()
export class TenantsService {
    private readonly RESERVED_SUBDOMAINS = [
        'www', 'admin', 'api', 'app', 'dashboard', 'store', 'shop',
        'localhost', 'test', 'dev', 'staging', 'production', 'mail', 'support'
    ];

    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptedFieldService,
        private readonly auditService: AuditService,
    ) { }

    async createTenantWithStore(data: any, ctx?: any) {
        // S3: Validate inputs
        await this.validateTenantCreation(data, ctx);

        // S7: Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Create tenant record
            const tenant = await tx.tenant.create({
                data: {
                    name: data.storeName,
                    subdomain: data.subdomain.toLowerCase(),
                    businessType: data.businessType,
                    schemaName: `tenant_${uuidv4().replace(/-/g, '_')}`, // Temporary schema name
                    status: 'provisioning'
                }
            });

            // 2. Create database schema - S2: Critical isolation
            const finalSchemaName = await this.createTenantSchema(tx, tenant.id);

            // 3. Update tenant with final schema name
            await tx.tenant.update({
                where: { id: tenant.id },
                data: {
                    schemaName: finalSchemaName,
                    status: 'active'
                }
            });

            // 4. Initialize tenant database with core tables
            await this.initializeTenantDatabase(tx, finalSchemaName);

            // 5. Create owner user
            await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    name: `${data.storeName} Owner`,
                    role: 'owner',
                    tenantId: tenant.id
                }
            });

            // 🛡️ S4: تسجيل نجاح إنشاء المتجر
            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'system',
                requestId: ctx?.requestId,
                ip: ctx?.ip,
                action: 'TENANT_STORE_CREATED',
                details: {
                    subdomain: tenant.subdomain,
                    businessType: data.businessType,
                    ownerEmail: data.email
                }
            });

            return {
                id: tenant.id,
                subdomain: tenant.subdomain,
                schemaName: finalSchemaName,
                storeUrl: `https://${tenant.subdomain}.apex-platform.localhost`,
                dashboardUrl: `https://admin.${tenant.subdomain}.apex-platform.localhost`
            };
        }).catch(async (error: any) => {
            console.error('Tenant creation failed:', error);

            // 🛡️ S4: تسجيل فشل إنشاء المتجر
            await this.auditService.logSecurityEvent('TENANT_CREATION_FAILED', {
                severity: 'HIGH',
                requestId: ctx?.requestId,
                ip: ctx?.ip,
                details: {
                    error: error.message,
                    subdomain: data.subdomain,
                    email: data.email
                }
            });

            if (error.code === 'P2002') {
                throw new ConflictException(`Subdomain "${data.subdomain}" is already taken`);
            }
            throw new InternalServerErrorException('Failed to create tenant store');
        });
    }

    private async validateTenantCreation(data: any, ctx?: any) {
        if (this.RESERVED_SUBDOMAINS.includes(data.subdomain.toLowerCase())) {
            await this.auditService.logSecurityEvent('RESERVED_SUBDOMAIN_ATTEMPT', {
                severity: 'MEDIUM',
                requestId: ctx?.requestId,
                ip: ctx?.ip,
                details: { subdomain: data.subdomain, email: data.email }
            });
            throw new BadRequestException(`Subdomain "${data.subdomain}" is reserved`);
        }
        const subdomainRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
        if (!subdomainRegex.test(data.subdomain)) {
            throw new BadRequestException('Invalid subdomain format');
        }
        const existingTenant = await this.prisma.tenant.findFirst({
            where: { subdomain: data.subdomain.toLowerCase() }
        });
        if (existingTenant) {
            throw new ConflictException(`Subdomain "${data.subdomain}" is already taken`);
        }
    }

    private async createTenantSchema(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
        return schemaName;
    }

    async getTenantBySubdomain(subdomain: string) {
        return this.prisma.tenant.findFirst({
            where: {
                subdomain: subdomain.toLowerCase(),
                status: 'active'
            }
        });
    }

    private async initializeTenantDatabase(tx: Prisma.TransactionClient, schemaName: string): Promise<void> {
        const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS "${schemaName}"."products" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
        await tx.$executeRawUnsafe(createTablesSQL);
    }
}
