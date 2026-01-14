/**
 * Vendure Adapter
 * Handles tenant-isolated Vendure configuration
 * 
 * Per APEX_PLATFORM_CONTEXT.md:
 * - Each tenant's Vendure instance operates in its own schema
 * - Complete isolation of products, orders, customers
 */

import { TenantContext } from '@apex/shared/types/tenant.types';

export interface VendureConfig {
    apiUrl: string;
    shopApiPath: string;
    adminApiPath: string;
    authToken?: string;
}

export class VendureAdapter {
    private config: VendureConfig;
    private tenantContext: TenantContext | null = null;

    constructor(config: VendureConfig) {
        this.config = config;
    }

    /**
     * Set the tenant context for all subsequent operations
     */
    setTenantContext(context: TenantContext): void {
        this.tenantContext = context;
        console.log(`🔧 Vendure adapter configured for tenant: ${context.tenantName}`);
    }

    /**
     * Get the database URL with tenant schema
     */
    getTenantDatabaseUrl(): string {
        if (!this.tenantContext) {
            throw new Error('Tenant context not set');
        }
        const baseUrl = process.env.DATABASE_URL;
        return `${baseUrl}?schema=${this.tenantContext.tenantSchema}`;
    }

    /**
     * Get Vendure Shop API URL for tenant
     */
    getShopApiUrl(): string {
        return `${this.config.apiUrl}${this.config.shopApiPath}`;
    }

    /**
     * Get Vendure Admin API URL for tenant
     */
    getAdminApiUrl(): string {
        return `${this.config.apiUrl}${this.config.adminApiPath}`;
    }

    /**
     * Validate that tenant context is set before operations
     */
    private ensureTenantContext(): void {
        if (!this.tenantContext) {
            throw new Error('Vendure operations require tenant context');
        }
    }

    /**
     * Get headers for Vendure API requests
     */
    getHeaders(): Record<string, string> {
        this.ensureTenantContext();
        return {
            'Content-Type': 'application/json',
            'X-Tenant-Id': this.tenantContext!.tenantId,
            'X-Tenant-Schema': this.tenantContext!.tenantSchema,
            ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` }),
        };
    }
}

export const createVendureAdapter = (config: VendureConfig): VendureAdapter => {
    return new VendureAdapter(config);
};
