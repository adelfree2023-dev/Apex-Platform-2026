'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface ShippingZone {
    id: number;
    name: string;
    regions: string[];
    rate: number;
    estimatedDays: number;
}

interface ShippingResult {
    found: boolean;
    zone: { name: string } | null;
    rate: number;
    estimatedDays: number;
    freeShipping: boolean;
    freeShippingThreshold: number | null;
}

interface ShippingCalculatorProps {
    tenantId: string;
    orderTotal: number;
    onRateCalculated: (rate: number) => void;
}

export default function ShippingCalculator({ tenantId, orderTotal, onRateCalculated }: ShippingCalculatorProps) {
    const [zones, setZones] = useState<ShippingZone[]>([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [result, setResult] = useState<ShippingResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchZones = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/shop/${tenantId}/shipping/zones`);
                const data = await res.json();
                if (data.success) {
                    setZones(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch zones:', error);
            }
        };

        fetchZones();
    }, [tenantId]);

    const calculateShipping = async (region: string) => {
        if (!region) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/shipping/calculate?region=${region}&total=${orderTotal}`
            );
            const data = await res.json();
            if (data.success) {
                setResult(data.data);
                onRateCalculated(data.data.rate);
            }
        } catch (error) {
            console.error('Failed to calculate shipping:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const region = e.target.value;
        setSelectedRegion(region);
        calculateShipping(region);
    };

    // Get all unique regions from zones
    const allRegions = zones.flatMap(z => z.regions);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🚚</span> Shipping Calculator
            </h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select your area
                </label>
                <select
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                >
                    <option value="">Choose delivery area...</option>
                    {zones.map((zone) => (
                        <optgroup key={zone.id} label={zone.name}>
                            {zone.regions.map((region) => (
                                <option key={region} value={region}>
                                    {region.charAt(0).toUpperCase() + region.slice(1).replace(/-/g, ' ')}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="text-center py-4">
                    <span className="animate-spin text-2xl">⏳</span>
                </div>
            )}

            {result && !loading && (
                <div className={`p-4 rounded-xl ${result.freeShipping ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    {result.found ? (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-600">{result.zone?.name}</span>
                                <span className={`text-xl font-bold ${result.freeShipping ? 'text-green-600' : 'text-gray-900'}`}>
                                    {result.freeShipping ? 'FREE' : `EGP ${(result.rate / 100).toFixed(2)}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>📦</span>
                                <span>Estimated delivery: {result.estimatedDays} day{result.estimatedDays > 1 ? 's' : ''}</span>
                            </div>

                            {result.freeShipping && (
                                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                    <span>🎉</span>
                                    Congrats! You qualify for free shipping
                                </p>
                            )}

                            {!result.freeShipping && result.freeShippingThreshold && (
                                <p className="mt-2 text-sm text-indigo-600">
                                    💡 Add EGP {((result.freeShippingThreshold - orderTotal) / 100).toFixed(2)} more for free shipping!
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-gray-600">Standard shipping rate</p>
                            <p className="text-xl font-bold text-gray-900">EGP {(result.rate / 100).toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Estimated delivery: {result.estimatedDays} days
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
