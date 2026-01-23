export interface Tenant {
    id: string;
    name: string;
    storeName: string;
    subdomain: string;
    logoUrl?: string;
    bannerUrl?: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'provisioning';
    language: string;
    currency: string;
    theme?: string;
    contactEmail?: string;
    contactPhone?: string;
    socialLinks?: Record<string, string>;
    createdAt: string;
}
