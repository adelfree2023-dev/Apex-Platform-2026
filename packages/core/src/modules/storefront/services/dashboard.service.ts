import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../common/caching/cache.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);
    private readonly CACHE_TTL = 300; // 5 دقائق

    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) { }

    // ✅ S2: الحصول على نظرة عامة
    async getOverview(
        tenantId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<any> {
        const cacheKey = `dashboard:overview:${tenantId}:${startDate || 'all'}:${endDate || 'all'}`;

        const cachedData = await this.cacheService.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            // ✅ S2: الحصول على المبيعات الإجمالية
            const salesData = await this.getSalesSummary(tenantId, startDate, endDate);

            // ✅ S2: الحصول على حالة المخزون
            const inventoryData = await this.getInventoryStatus(tenantId);

            // ✅ S2: الحصول على أداء الطلبات
            const ordersData = await this.getOrdersPerformance(tenantId, startDate, endDate);

            // ✅ S2: الحصول على أداء المنتجات
            const productsData = await this.getProductsPerformance(tenantId, startDate, endDate);

            // ✅ S2: الحصول على أداء العملاء
            const customersData = await this.getCustomersPerformance(tenantId, startDate, endDate);

            const overview = {
                sales: salesData,
                inventory: inventoryData,
                orders: ordersData,
                products: productsData,
                customers: customersData,
                updatedAt: new Date(),
            };

            // ✅ S2: تخزين في الذاكرة المؤقتة
            await this.cacheService.set(cacheKey, overview, this.CACHE_TTL);

            return overview;
        } catch (error) {
            this.logger.error('Failed to get dashboard overview:', error);
            throw error;
        }
    }

    private async getSalesSummary(tenantId: string, startDate?: string, endDate?: string) {
        const whereClause: any = { tenantId };

        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // ✅ S2: المبيعات الإجمالية
        const totalSales = await this.prisma.order.aggregate({
            where: {
                ...whereClause,
                status: 'PAID',
            },
            _sum: {
                totalAmount: true,
            },
        });

        // ✅ S2: عدد الطلبات
        const orderCount = await this.prisma.order.count({
            where: {
                ...whereClause,
                status: 'PAID',
            },
        });

        // ✅ S2: متوسط قيمة الطلب
        const averageOrderValue = orderCount > 0 ? (totalSales._sum.totalAmount || 0) / orderCount : 0;

        // ✅ S2: المبيعات حسب الفئة
        const salesByCategory = await this.prisma.$queryRaw`
      SELECT p.category, SUM(oi.quantity * oi.price) as total_sales
      FROM "OrderItem" oi
      JOIN "Order" o ON oi.orderId = o.id
      JOIN "Product" p ON oi.productId = p.id
      WHERE o.tenantId = ${tenantId}
      AND o.status = 'PAID'
      ${startDate && endDate ? `AND o.createdAt BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}` : ''}
      GROUP BY p.category
      ORDER BY total_sales DESC
      LIMIT 5
    `;

        return {
            totalSales: totalSales._sum.totalAmount || 0,
            orderCount,
            averageOrderValue,
            salesByCategory,
        };
    }

    private async getInventoryStatus(tenantId: string) {
        // ✅ S2: المنتجات منخفضة المخزون
        const lowStockProducts = await this.prisma.product.findMany({
            where: {
                tenantId,
                stock: {
                    lte: 10,
                },
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                stock: true,
                sku: true,
            },
            orderBy: {
                stock: 'asc',
            },
            take: 10,
        });

        // ✅ S2: إجمالي المنتجات
        const totalProducts = await this.prisma.product.count({
            where: {
                tenantId,
                status: 'ACTIVE',
            },
        });

        // ✅ S2: المنتجات نفدت من المخزون
        const outOfStockProducts = await this.prisma.product.count({
            where: {
                tenantId,
                stock: 0,
                status: 'ACTIVE',
            },
        });

        return {
            lowStockProducts,
            outOfStockProducts,
            totalProducts,
            lowStockPercentage: totalProducts > 0 ? (lowStockProducts.length / totalProducts) * 100 : 0,
        };
    }

    private async getOrdersPerformance(tenantId: string, startDate?: string, endDate?: string) {
        const whereClause: any = { tenantId };

        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // ✅ S2: حالة الطلبات
        const orderStatuses = await this.prisma.order.groupBy({
            by: ['status'],
            where: whereClause,
            _count: {
                _all: true,
            },
        });

        // ✅ S2: معدل إكمال الطلبات
        const completedOrders = orderStatuses
            .filter(s => ['DELIVERED', 'COMPLETED'].includes(s.status))
            .reduce((sum, s) => sum + s._count._all, 0);

        const totalOrders = orderStatuses.reduce((sum, s) => sum + s._count._all, 0);
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        return {
            orderStatuses,
            completionRate,
        };
    }

    private async getProductsPerformance(tenantId: string, startDate?: string, endDate?: string) {
        // ✅ S2: أفضل المنتجات مبيعاً
        const topProducts = await this.prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as total_revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON oi.orderId = o.id
      JOIN "Product" p ON oi.productId = p.id
      WHERE o.tenantId = ${tenantId}
      AND o.status = 'PAID'
      ${startDate && endDate ? `AND o.createdAt BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}` : ''}
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC
      LIMIT 10
    `;

        // ✅ S2: منتجات لم تباع منذ فترة
        const staleProducts = await this.prisma.product.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
                createdAt: {
                    lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 يوماً
                },
                items: {
                    none: {
                        order: {
                            createdAt: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 يوماً
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                sku: true,
                stock: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
            take: 10,
        });

        return {
            topProducts,
            staleProducts,
        };
    }

    private async getCustomersPerformance(tenantId: string, startDate?: string, endDate?: string) {
        const whereClause: any = { tenantId };

        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // ✅ S2: عدد العملاء الجدد
        const newCustomers = await this.prisma.customer.count({
            where: {
                ...whereClause,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // آخر 30 يوماً
                },
            },
        });

        // ✅ S2: العملاء النشطين
        const activeCustomers = await this.prisma.customer.count({
            where: {
                ...whereClause,
                orders: {
                    some: {
                        createdAt: {
                            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // آخر 90 يوماً
                        },
                    },
                },
            },
        });

        // ✅ S2: متوسط قيمة الشراء للعميل
        const totalRevenue = await this.prisma.order.aggregate({
            where: {
                ...whereClause,
                status: 'PAID',
            },
            _sum: {
                totalAmount: true,
            },
        });

        const customerCount = await this.prisma.customer.count({
            where: whereClause,
        });

        const averageCustomerValue = customerCount > 0 ? (totalRevenue._sum.totalAmount || 0) / customerCount : 0;

        return {
            newCustomers,
            activeCustomers,
            averageCustomerValue,
        };
    }

    // ✅ S2: الحصول على التنبيهات
    async getDashboardAlerts(tenantId: string): Promise<any[]> {
        const alerts = [];

        try {
            // ✅ S2: تنبيه المخزون المنخفض
            const lowStockCount = await this.prisma.product.count({
                where: {
                    tenantId,
                    stock: {
                        lte: 5,
                    },
                    status: 'ACTIVE',
                },
            });

            if (lowStockCount > 0) {
                alerts.push({
                    type: 'WARNING',
                    title: 'مخزون منخفض',
                    message: `${lowStockCount} منتجات لديها مخزون منخفض (أقل من 5 وحدات)`,
                    action: 'inventory',
                    severity: lowStockCount > 10 ? 'HIGH' : 'MEDIUM',
                });
            }

            // ✅ S2: تنبيه الطلبات المتأخرة
            const pendingOrdersCount = await this.prisma.order.count({
                where: {
                    tenantId,
                    status: 'PROCESSING',
                    createdAt: {
                        lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // أكثر من 7 أيام
                    },
                },
            });

            if (pendingOrdersCount > 0) {
                alerts.push({
                    type: 'WARNING',
                    title: 'طلبات متأخرة',
                    message: `${pendingOrdersCount} طلبات بحالة "قيد المعالجة" لأكثر من 7 أيام`,
                    action: 'orders/pending',
                    severity: pendingOrdersCount > 5 ? 'HIGH' : 'MEDIUM',
                });
            }

            // ✅ S2: تنبيه المبيعات المنخفضة
            const lastWeekSales = await this.prisma.order.aggregate({
                where: {
                    tenantId,
                    status: 'PAID',
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
                _sum: {
                    totalAmount: true,
                },
            });

            const previousWeekSales = await this.prisma.order.aggregate({
                where: {
                    tenantId,
                    status: 'PAID',
                    createdAt: {
                        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                        lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
                _sum: {
                    totalAmount: true,
                },
            });

            const lastWeekTotal = lastWeekSales._sum.totalAmount || 0;
            const previousWeekTotal = previousWeekSales._sum.totalAmount || 0;

            if (previousWeekTotal > 0 && lastWeekTotal < previousWeekTotal * 0.7) {
                const declinePercentage = ((previousWeekTotal - lastWeekTotal) / previousWeekTotal) * 100;
                alerts.push({
                    type: 'WARNING',
                    title: 'انخفاض المبيعات',
                    message: `المبيعات انخفضت بنسبة ${declinePercentage.toFixed(1)}% مقارنة بالأسبوع السابق`,
                    action: 'dashboard/sales',
                    severity: 'MEDIUM',
                });
            }

            // ✅ S2: تنبيه الطلبات الملغاة
            const cancelledOrdersCount = await this.prisma.order.count({
                where: {
                    tenantId,
                    status: 'CANCELLED',
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            });

            if (cancelledOrdersCount > 5) {
                alerts.push({
                    type: 'WARNING',
                    title: 'طلبات ملغاة',
                    message: `${cancelledOrdersCount} طلبات ألغيت خلال هذا الأسبوع`,
                    action: 'orders/cancelled',
                    severity: 'MEDIUM',
                });
            }

            return alerts;
        } catch (error) {
            this.logger.error('Failed to get dashboard alerts:', error);
            return [];
        }
    }

    // ✅ S2: الحصول على التقارير (Placeholder methods needed for Controller)
    async getSalesReport(tenantId: string, period?: string, startDate?: string, endDate?: string): Promise<any> {
        return { message: "Sales report not implemented yet", tenantId, period };
    }
    async getProductsReport(tenantId: string, sortBy?: string, limit?: number): Promise<any> {
        return { message: "Products report not implemented yet", tenantId, sortBy };
    }
    async getCustomersReport(tenantId: string, segment?: string): Promise<any> {
        return { message: "Customers report not implemented yet", tenantId, segment };
    }
}
