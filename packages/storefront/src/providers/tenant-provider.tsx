'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '@/types/tenant.types';

interface TenantContextType {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
    refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
    tenant: null,
    loading: true,
    error: null,
    refreshTenant: async () => { },
});

export function TenantProvider({
    tenant: initialTenant,
    children,
}: {
    tenant: Tenant;
    children: React.ReactNode;
}) {
    const [tenant, setTenant] = useState<Tenant | null>(initialTenant);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshTenant = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/tenants/subdomain/${initialTenant.subdomain}`);
            if (!response.ok) {
                throw new Error('فشل تحميل بيانات المتجر');
            }

            const updatedTenant = await response.json();
            setTenant(updatedTenant);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطأ غير معروف');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // تحديث بيانات المتجر كل 5 دقائق
        const interval = setInterval(refreshTenant, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <TenantContext.Provider value={{ tenant, loading, error, refreshTenant }}>
            {children}
        </TenantContext.Provider>
    );
}

export const useTenant = () => useContext(TenantContext);

export default TenantProvider;
