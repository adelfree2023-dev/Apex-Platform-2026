'use client';
import { useState } from 'react';

interface FormData {
    email: string;
    password: string;
    storeName: string;
    subdomain: string;
    businessType: string;
}

export function CreateTenantForm({
    onSubmit,
    isLoading
}: {
    onSubmit: (data: FormData) => void;
    isLoading: boolean;
}) {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        storeName: '',
        subdomain: '',
        businessType: 'retail'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Valid email is required';
        }

        if (!formData.password || formData.password.length < 12) {
            newErrors.password = 'Password must be at least 12 characters with numbers and symbols';
        }

        if (!formData.storeName || formData.storeName.length < 3) {
            newErrors.storeName = 'Store name must be at least 3 characters';
        }

        const subdomainRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
        if (!formData.subdomain || !subdomainRegex.test(formData.subdomain)) {
            newErrors.subdomain = 'Subdomain must start and end with a letter, contain only lowercase letters, numbers, and hyphens';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData(prev => ({ ...prev, subdomain: value }));
    };

    const getStoreUrl = () => {
        return formData.subdomain ? `${formData.subdomain}.apex-platform.localhost` : '';
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg">
            <div className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="owner@example.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className={`appearance-none block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Min 12 characters"
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                    <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                        Store Name
                    </label>
                    <input
                        id="storeName"
                        name="storeName"
                        type="text"
                        required
                        value={formData.storeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                        className={`appearance-none block w-full px-3 py-2 border ${errors.storeName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="My Awesome Store"
                    />
                    {errors.storeName && <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>}
                </div>

                <div>
                    <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
                        Subdomain
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            https://
                        </span>
                        <input
                            id="subdomain"
                            name="subdomain"
                            type="text"
                            required
                            value={formData.subdomain}
                            onChange={handleSubdomainChange}
                            className={`flex-1 block w-full px-3 py-2 border ${errors.subdomain ? 'border-red-300' : 'border-gray-300'} rounded-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                            placeholder="your-store-name"
                        />
                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            .apex-platform.localhost
                        </span>
                    </div>
                    {errors.subdomain && <p className="mt-1 text-sm text-red-600">{errors.subdomain}</p>}
                    {getStoreUrl() && (
                        <p className="mt-1 text-sm text-gray-500">
                            Your store will be available at: <span className="font-medium text-blue-600">{getStoreUrl()}</span>
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                        Business Type
                    </label>
                    <select
                        id="businessType"
                        name="businessType"
                        value={formData.businessType}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="retail">Retail Store</option>
                        <option value="services">Service Business</option>
                        <option value="b2b">B2B Marketplace</option>
                        <option value="marketplace">Marketplace</option>
                    </select>
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating your store...
                        </span>
                    ) : 'Launch My Store'}
                </button>
            </div>

            <div className="text-center text-sm text-gray-600">
                Already have a store? {' '}
                <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Login here
                </a>
            </div>
        </form>
    );
}
