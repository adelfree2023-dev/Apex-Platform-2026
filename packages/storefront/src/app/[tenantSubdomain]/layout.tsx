import { getTenantBySubdomain } from '@/lib/api/tenants';
import { TenantProvider } from '@/providers/tenant-provider';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import './globals.css';

export async function generateMetadata({ params }: { params: { tenantSubdomain: string } }) {
    const tenant = await getTenantBySubdomain(params.tenantSubdomain);

    if (!tenant) {
        return {
            title: 'متجر غير موجود',
            description: 'المتجر الذي تحاول الوصول إليه غير موجود',
        };
    }

    return {
        title: tenant.storeName,
        description: tenant.description || `متجر ${tenant.storeName} على منصة أبكس`,
        openGraph: {
            title: tenant.storeName,
            description: tenant.description || `متجر ${tenant.storeName} على منصة أبكس`,
            url: `https://${params.tenantSubdomain}.apex-platform.com`,
            siteName: 'Apex Platform',
            images: [
                {
                    url: tenant.logoUrl || '/default-store-logo.png',
                    width: 1200,
                    height: 630,
                },
            ],
            locale: tenant.language || 'ar',
            type: 'website',
        },
    };
}

export default async function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSubdomain: string };
}) {
    const tenant = await getTenantBySubdomain(params.tenantSubdomain);

    if (!tenant) {
        notFound();
    }

    // التحقق من حالة المتجر
    if (tenant.status !== 'ACTIVE') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
                <div className="text-center p-8 max-w-md mx-auto">
                    <h1 className="text-3xl font-bold mb-4">المتجر غير متاح حالياً</h1>
                    <p className="text-muted-foreground mb-6">
                        {tenant.status === 'SUSPENDED'
                            ? 'تم تعليق هذا المتجر بسبب مخالفة شروط الخدمة'
                            : tenant.status === 'PENDING'
                                ? 'المتجر قيد المراجعة والتفعيل'
                                : 'المتجر غير نشط حالياً'}
                    </p>
                    <a
                        href="/"
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        العودة للصفحة الرئيسية
                    </a>
                </div>
            </div>
        );
    }

    // تعيين رأس x-tenant-id للطلبات المستقبلية
    headers().set('x-tenant-id', tenant.id);

    return (
        <TenantProvider tenant={tenant}>
            <div className="flex flex-col min-h-screen">
                {children}
            </div>
        </TenantProvider>
    );
}
