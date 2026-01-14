import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('📦 Prisma connected to database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Execute a query within a specific tenant schema
     * This ensures complete isolation per APEX_PLATFORM_CONTEXT.md
     */
    async withTenantSchema<T>(tenantSchema: string, callback: () => Promise<T>): Promise<T> {
        await this.$executeRawUnsafe(`SET search_path TO "${tenantSchema}", public`);
        try {
            return await callback();
        } finally {
            await this.$executeRawUnsafe(`SET search_path TO public`);
        }
    }

    /**
     * Create a new PostgreSQL schema for a tenant
     */
    async createTenantSchema(tenantId: string): Promise<void> {
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        await this.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`🏗️ Created schema: ${schemaName}`);
    }

    /**
     * Check if a tenant schema exists
     */
    async tenantSchemaExists(tenantId: string): Promise<boolean> {
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        const result = await this.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = ${schemaName}
      ) as exists
    `;
        return result[0]?.exists ?? false;
    }
}
