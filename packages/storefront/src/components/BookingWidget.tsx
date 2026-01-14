'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface Service {
    id: number;
    name: string;
    description: string;
    duration: number;
    price: number;
}

interface BookingWidgetProps {
    tenantId: string;
    customerId: number;
    onSuccess?: () => void;
}

export default function BookingWidget({ tenantId, customerId, onSuccess }: BookingWidgetProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    // Get min date (tomorrow)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split('T')[0];

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/shop/${tenantId}/bookings/services`);
                const data = await res.json();
                if (data.success) setServices(data.data);
            } catch (error) {
                console.error('Failed to fetch services:', error);
            }
        };
        fetchServices();
    }, [tenantId]);

    useEffect(() => {
        if (selectedService && selectedDate) {
            fetchSlots();
        }
    }, [selectedService, selectedDate]);

    const fetchSlots = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/bookings/slots?date=${selectedDate}&serviceId=${selectedService}`
            );
            const data = await res.json();
            if (data.success) setSlots(data.data);
        } catch (error) {
            console.error('Failed to fetch slots:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async () => {
        if (!selectedService || !selectedDate || !selectedSlot) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId,
                    serviceId: selectedService,
                    date: selectedDate,
                    timeSlot: selectedSlot,
                    notes,
                }),
            });

            const data = await res.json();
            if (data.success) {
                alert('🎉 Booking confirmed!');
                setStep(4); // Success
                onSuccess?.();
            } else {
                alert(data.message || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedServiceData = services.find(s => s.id === selectedService);

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <h2 className="text-xl font-bold">📅 Book an Appointment</h2>
                <div className="flex gap-2 mt-4">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`flex-1 h-2 rounded-full ${step >= s ? 'bg-white' : 'bg-white/30'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="p-6">
                {/* Step 1: Select Service */}
                {step === 1 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Select a Service</h3>
                        <div className="space-y-3">
                            {services.map(service => (
                                <button
                                    key={service.id}
                                    onClick={() => { setSelectedService(service.id); setStep(2); }}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedService === service.id
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="font-semibold text-gray-900">{service.name}</div>
                                    <div className="text-sm text-gray-500">{service.description}</div>
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span>⏱️ {service.duration} min</span>
                                        <span className="font-bold text-indigo-600">
                                            EGP {(service.price / 100).toFixed(0)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Date & Time */}
                {step === 2 && (
                    <div>
                        <button onClick={() => setStep(1)} className="text-indigo-600 mb-4">← Back</button>
                        <h3 className="font-semibold text-gray-900 mb-4">Select Date & Time</h3>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={minDateStr}
                            className="w-full p-3 border rounded-xl mb-4"
                        />

                        {loading ? (
                            <div className="text-center py-8">⏳ Loading slots...</div>
                        ) : slots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => { setSelectedSlot(slot); setStep(3); }}
                                        className={`p-2 rounded-lg text-sm font-semibold transition-all ${selectedSlot === slot
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 hover:bg-indigo-100'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        ) : selectedDate ? (
                            <div className="text-center py-8 text-gray-500">No slots available</div>
                        ) : null}
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <div>
                        <button onClick={() => setStep(2)} className="text-indigo-600 mb-4">← Back</button>
                        <h3 className="font-semibold text-gray-900 mb-4">Confirm Booking</h3>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <div className="font-bold text-lg">{selectedServiceData?.name}</div>
                            <div className="text-gray-600">📅 {selectedDate}</div>
                            <div className="text-gray-600">🕐 {selectedSlot}</div>
                            <div className="text-indigo-600 font-bold mt-2">
                                EGP {((selectedServiceData?.price || 0) / 100).toFixed(0)}
                            </div>
                        </div>

                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any special notes..."
                            className="w-full p-3 border rounded-xl mb-4"
                            rows={2}
                        />

                        <button
                            onClick={handleBook}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? '⏳ Booking...' : '✅ Confirm Booking'}
                        </button>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="text-center py-8">
                        <span className="text-6xl">🎉</span>
                        <h3 className="text-xl font-bold text-gray-900 mt-4">Booking Confirmed!</h3>
                        <p className="text-gray-500 mt-2">We'll send you a confirmation soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
