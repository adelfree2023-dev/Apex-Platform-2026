import { useState } from 'react';

export function useDashboard() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshAlerts = async () => {
        // Implementation placeholder
    };

    return {
        alerts,
        loading,
        refreshAlerts
    };
}
