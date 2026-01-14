import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Apex Store',
    description: 'E-commerce platform powered by Apex',
};

export default function TenantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
