import { Tenant } from '@/types/tenant.types';

export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tenants/public/subdomain/${subdomain}`, {
            next: { revalidate: 60 }
        });

        if (response.status === 404) return null;

        if (!response.ok) {
            throw new Error(`Failed to fetch tenant: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching tenant ${subdomain}:`, error);
        return null;
    }
}
