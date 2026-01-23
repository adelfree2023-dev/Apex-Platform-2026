'use client';

export function AlertBanner({ alerts }: { alerts: any[] }) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
                <div
                    key={index}
                    className={`p-4 rounded-md border flex items-start gap-3 ${alert.type === 'WARNING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                            alert.type === 'ERROR' ? 'bg-red-50 border-red-200 text-red-800' :
                                'bg-blue-50 border-blue-200 text-blue-800'
                        }`}
                >
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                    </div>
                    {alert.action && (
                        <button className="text-xs font-medium underline hover:no-underline">
                            عرض التفاصيل
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
