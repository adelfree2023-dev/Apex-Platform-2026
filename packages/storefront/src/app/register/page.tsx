'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTenantForm } from './components/CreateTenantForm';

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (data: {
        email: string;
        password: string;
        storeName: string;
        subdomain: string;
        businessType: string;
    }) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tenants/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            const result = await response.json();

            // Store tenant info in localStorage for immediate redirect
            if (typeof window !== 'undefined') {
                localStorage.setItem('newTenant', JSON.stringify(result));
            }

            // Immediately redirect to the new store dashboard
            window.location.href = `${result.dashboardUrl}/setup`;
        } catch (error: any) {
            console.error('Registration error:', error);
            setIsLoading(false);
            alert(error.message || 'Failed to create store. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Launch Your Store in 60 Seconds
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        No coding required. Fully isolated environment with enterprise-grade security.
                    </p>
                </div>
                <CreateTenantForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
        </div>
    );
}
