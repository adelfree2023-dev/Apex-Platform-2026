import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Components placeholders - replaced with actual content if/when provided in 11.txt or separately.
// For now, using simple divs to ensure compilation.
const SalesOverview = ({ tenantSubdomain }: any) => <div>Sales Overview Component</div>;
const ProductPerformance = ({ tenantSubdomain }: any) => <div>Product Performance Component</div>;
const InventoryStatus = ({ tenantSubdomain }: any) => <div>Inventory Status Component</div>;
const CustomerInsights = ({ tenantSubdomain }: any) => <div>Customer Insights Component</div>;
const RecentOrders = ({ tenantSubdomain }: any) => <div>Recent Orders Component</div>;

export default async function DashboardPage({
    params,
}: {
    params: { tenantSubdomain: string };
}) {
    return (
        <DashboardLayout
            section="overview"
            breadcrumbItems={[{ label: 'لوحة التحكم', href: `/${params.tenantSubdomain}/dashboard` }]}
        >
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">لوحة تحكم المتجر</h1>
                    <p className="text-muted-foreground mt-1">
                        نظرة عامة على أداء متجرك وتحليلات المبيعات
                    </p>
                </div>

                <Suspense fallback={<LoadingSpinner />}>
                    <SalesOverview tenantSubdomain={params.tenantSubdomain} />
                </Suspense>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Suspense fallback={<LoadingSpinner />}>
                        <ProductPerformance tenantSubdomain={params.tenantSubdomain} />
                    </Suspense>

                    <Suspense fallback={<LoadingSpinner />}>
                        <InventoryStatus tenantSubdomain={params.tenantSubdomain} />
                    </Suspense>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Suspense fallback={<LoadingSpinner />}>
                        <CustomerInsights tenantSubdomain={params.tenantSubdomain} />
                    </Suspense>

                    <Suspense fallback={<LoadingSpinner />}>
                        <RecentOrders tenantSubdomain={params.tenantSubdomain} />
                    </Suspense>
                </div>
            </div>
        </DashboardLayout>
    );
}
