/**
 * CSV Controller
 * API endpoints for import/export
 */

import { Controller, Get, Post, Param, Query, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { CsvService } from './csv.service';

@Controller('api/shop')
export class CsvController {
    constructor(private readonly csvService: CsvService) { }

    /**
     * Get product CSV template
     */
    @Get(':tenantId/csv/template/products')
    getProductTemplate(@Res() res: Response) {
        const template = this.csvService.getProductTemplate();
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="products_template.csv"',
        });
        res.send(template);
    }

    /**
     * Import products from CSV content
     */
    @Post(':tenantId/csv/import/products')
    async importProducts(
        @Param('tenantId') tenantId: string,
        @Body() body: { csvContent: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.csvContent) {
            throw new HttpException('CSV content is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.csvService.importProducts(tenantSchema, body.csvContent);
            return {
                success: true,
                data: result,
                message: `Imported ${result.imported} of ${result.total} products`,
            };
        } catch (error) {
            throw new HttpException(
                `Import failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Export products to CSV
     */
    @Get(':tenantId/csv/export/products')
    async exportProducts(
        @Param('tenantId') tenantId: string,
        @Query('download') download: string,
        @Res() res: Response,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const csv = await this.csvService.exportProducts(tenantSchema);

            if (download === 'true') {
                res.set({
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="products_${Date.now()}.csv"`,
                });
                res.send(csv);
            } else {
                res.json({
                    success: true,
                    data: csv,
                    lines: csv.split('\n').length,
                });
            }
        } catch (error) {
            throw new HttpException(
                `Export failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Export orders to CSV
     */
    @Get(':tenantId/csv/export/orders')
    async exportOrders(
        @Param('tenantId') tenantId: string,
        @Query('download') download: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Res() res?: Response,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const csv = await this.csvService.exportOrders(
                tenantSchema,
                startDate ? new Date(startDate) : undefined,
                endDate ? new Date(endDate) : undefined,
            );

            if (download === 'true' && res) {
                res.set({
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="orders_${Date.now()}.csv"`,
                });
                res.send(csv);
            } else if (res) {
                res.json({
                    success: true,
                    data: csv,
                    lines: csv.split('\n').length,
                });
            }
        } catch (error) {
            throw new HttpException(
                `Export failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Export customers to CSV
     */
    @Get(':tenantId/csv/export/customers')
    async exportCustomers(
        @Param('tenantId') tenantId: string,
        @Query('download') download: string,
        @Res() res: Response,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const csv = await this.csvService.exportCustomers(tenantSchema);

            if (download === 'true') {
                res.set({
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="customers_${Date.now()}.csv"`,
                });
                res.send(csv);
            } else {
                res.json({
                    success: true,
                    data: csv,
                    lines: csv.split('\n').length,
                });
            }
        } catch (error) {
            throw new HttpException(
                `Export failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
