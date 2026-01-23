export interface Alert {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    createdAt: string;
}

export interface DashboardStats {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
}
