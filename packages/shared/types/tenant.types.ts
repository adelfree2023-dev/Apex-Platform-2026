/**
 * Tenant Types
 * Shared across the platform
 */

export type BusinessType = 'RETAIL' | 'SERVICE' | 'EDUCATION' | 'HEALTHCARE';

export type CooperationPreference = 'open' | 'selective' | 'closed';

export type TenantStatus = 'active' | 'suspended' | 'pending';

export interface TenantContext {
    tenantId: string;
    tenantSchema: string;
    territory: string;
    businessType: BusinessType;
    tenantName: string;
}

export interface CreateTenantInput {
    name: string;
    subdomain: string;
    businessType: BusinessType;
    territory: string;
    cooperationPreference?: CooperationPreference;
    fulfillmentRadius?: number;
}

export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    businessType: BusinessType;
    territory: string;
    cooperationPreference: CooperationPreference;
    fulfillmentRadius: number;
    status: TenantStatus;
    suspendedReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
