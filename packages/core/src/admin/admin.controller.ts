/**
 * Admin Controller
 * Admin API endpoints for tenant management and analytics
 */

import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * Get platform-wide stats
     */
    @Get('stats')
    async getPlatformStats() {
        try {
            const stats = await this.adminService.getPlatformStats();
            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get platform stats: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get all tenants
     */
    @Get('tenants')
    async getTenants() {
        try {
            const tenants = await this.adminService.getTenants();
            return {
                success: true,
                data: tenants,
                count: tenants.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get tenants: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get tenant by ID
     */
    @Get('tenants/:id')
    async getTenant(@Param('id') id: string) {
        try {
            const tenant = await this.adminService.getTenant(id);
            if (!tenant) {
                throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: tenant,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get tenant: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get tenant stats
     */
    @Get('tenants/:id/stats')
    async getTenantStats(@Param('id') id: string) {
        try {
            const stats = await this.adminService.getTenantStats(id);
            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get tenant stats: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get recent orders for tenant
     */
    @Get('tenants/:id/orders')
    async getRecentOrders(@Param('id') id: string) {
        try {
            const orders = await this.adminService.getRecentOrders(id);
            return {
                success: true,
                data: orders,
                count: orders.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get orders: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get top products for tenant
     */
    @Get('tenants/:id/top-products')
    async getTopProducts(@Param('id') id: string) {
        try {
            const products = await this.adminService.getTopProducts(id);
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get top products: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Update tenant
     */
    @Put('tenants/:id')
    async updateTenant(
        @Param('id') id: string,
        @Body() body: { name?: string; territory?: string; businessType?: string },
    ) {
        try {
            const tenant = await this.adminService.updateTenant(id, body);
            return {
                success: true,
                data: tenant,
                message: 'Tenant updated successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update tenant: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
