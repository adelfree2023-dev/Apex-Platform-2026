'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface CsvManagerProps {
    tenantId: string;
}

export default function CsvManager({ tenantId }: CsvManagerProps) {
    const [importing, setImporting] = useState(false);
    const [csvContent, setCsvContent] = useState('');
    const [result, setResult] = useState<any>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setCsvContent(event.target?.result as string);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!csvContent) return;

        setImporting(true);
        setResult(null);

        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/csv/import/products`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvContent }),
                }
            );
            const data = await res.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, message: 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const handleExport = async (type: 'products' | 'orders' | 'customers') => {
        window.open(
            `${API_BASE}/api/shop/${tenantId}/csv/export/${type}?download=true`,
            '_blank'
        );
    };

    const handleDownloadTemplate = () => {
        window.open(
            `${API_BASE}/api/shop/${tenantId}/csv/template/products`,
            '_blank'
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span>📄</span> CSV Import/Export
            </h1>

            {/* Import Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📥</span> Import Products
                </h2>

                <div className="mb-4">
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                    >
                        📋 Download CSV Template
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-upload"
                    />
                    <label
                        htmlFor="csv-upload"
                        className="cursor-pointer text-gray-500 hover:text-indigo-600"
                    >
                        <span className="text-4xl block mb-2">📁</span>
                        Click to select CSV file
                    </label>
                    {csvContent && (
                        <p className="mt-2 text-green-600">
                            ✓ File loaded ({csvContent.split('\n').length - 1} rows)
                        </p>
                    )}
                </div>

                <button
                    onClick={handleImport}
                    disabled={!csvContent || importing}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                    {importing ? '⏳ Importing...' : '📥 Import Products'}
                </button>

                {result && (
                    <div className={`mt-4 p-4 rounded-xl ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                            {result.message}
                        </p>
                        {result.data && (
                            <div className="mt-2 text-sm">
                                <p>✓ Imported: {result.data.imported}</p>
                                <p>✗ Failed: {result.data.failed}</p>
                                {result.data.errors?.length > 0 && (
                                    <ul className="mt-2 text-red-600">
                                        {result.data.errors.slice(0, 5).map((e: any, i: number) => (
                                            <li key={i}>Row {e.row}: {e.error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Export Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📤</span> Export Data
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleExport('products')}
                        className="bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                        <span>📦</span> Export Products
                    </button>

                    <button
                        onClick={() => handleExport('orders')}
                        className="bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <span>🧾</span> Export Orders
                    </button>

                    <button
                        onClick={() => handleExport('customers')}
                        className="bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                        <span>👥</span> Export Customers
                    </button>
                </div>
            </div>
        </div>
    );
}
