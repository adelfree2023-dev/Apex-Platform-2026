'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumb } from './breadcrumb';
import { AlertBanner } from './alert-banner';
import { useTenant } from '@/providers/tenant-provider';
import { useDashboard } from '@/hooks/use-dashboard';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Alert } from '@/types/dashboard.types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    section?: string;
    breadcrumbItems?: { label: string; href?: string }[];
}

export function DashboardLayout({
    children,
    section = 'overview',
    breadcrumbItems = [],
}: DashboardLayoutProps) {
    const { tenant, loading: tenantLoading } = useTenant();
    // const { alerts, loading: alertsLoading, refreshAlerts } = useDashboard(); // Commented out as hooks are not yet created
    const alerts: any[] = []; // Placeholder
    const refreshAlerts = () => { }; // Placeholder

    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (tenant) {
            refreshAlerts();
        }
    }, [tenant]);

    if (tenantLoading || !tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <Sidebar section={section} onClose={() => setSidebarOpen(false)} />
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:block">
                <Sidebar section={section} />
            </div>

            <div className="flex flex-col flex-1">
                <Header onMenuClick={() => setSidebarOpen(true)} />

                <main className="flex-1 p-4 md:p-6">
                    {alerts.length > 0 && <AlertBanner alerts={alerts} />}

                    {breadcrumbItems.length > 0 && (
                        <div className="mb-6">
                            <Breadcrumb items={breadcrumbItems} />
                        </div>
                    )}

                    <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6">
                        {children}
                    </div>
                </main>

                <footer className="p-4 border-t border-border text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} {tenant.storeName} - لوحة تحكم المتجر
                </footer>
            </div>
        </div>
    );
}
