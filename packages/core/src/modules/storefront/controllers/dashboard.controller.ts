import {
    Controller,
    Get,
    UseGuards,
    Req,
    Query,
    Param,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TenantScopedGuard } from '../../../common/access-control/guards/tenant-scoped.guard';
import { DashboardService } from '../services/dashboard.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { secureValidate } from '../../../common/security/validation/input-validator.service';
import { DateRangeDto } from '../dto/date-range.dto';
import { z } from 'zod';

@ApiTags('Storefront - Dashboard API')
@Controller('api/shop')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly auditService: AuditService,
    ) { }

    @UseGuards(TenantScopedGuard)
    @Get('/:tenantSubdomain/dashboard/overview')
    @ApiOperation({ summary: 'نظرة عامة على أداء المتجر' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'تاريخ البدء (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'تاريخ الانتهاء (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'بيانات لوحة التحكم' })
    @ApiResponse({ status: 401, description: 'غير مصرح به' })
    async getDashboardOverview(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query() dateRangeDto: DateRangeDto,
        @Req() request: any,
    ): Promise<any> {
        try {
            const tenant = request.tenant;

            // ✅ S3: التحقق من صحة النطاق الزمني
            secureValidate(DateRangeDto.schema, dateRangeDto);

            // ✅ S4: تسجيل الوصول إلى لوحة التحكم
            this.auditService.logActivity({
                tenantId: tenant.id,
                userId: request.user?.id || 'anonymous',
                action: 'DASHBOARD_ACCESSED',
                details: {
                    section: 'overview',
                    startDate: dateRangeDto.startDate,
                    endDate: dateRangeDto.endDate,
                },
            });

            // ✅ S2: الحصول على بيانات لوحة التحكم
            const overview = await this.dashboardService.getOverview(
                tenant.id,
                dateRangeDto.startDate,
                dateRangeDto.endDate,
            );

            return overview;
        } catch (error) {
            this.logger.error('Dashboard overview failed:', error);
            throw error;
        }
    }

    @UseGuards(TenantScopedGuard)
    @Get('/:tenantSubdomain/dashboard/sales')
    @ApiOperation({ summary: 'تقارير المبيعات' })
    @ApiQuery({ name: 'period', required: false, type: String, enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'], description: 'فترة التقرير' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'بيانات المبيعات' })
    async getSalesReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query() query: any,
        @Req() request: any,
    ): Promise<any> {
        try {
            const tenant = request.tenant;

            // ✅ S3: التحقق من صحة المدخلات
            secureValidate(
                z.object({
                    period: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                }),
                query,
            );

            // ✅ S4: تسجيل الوصول إلى تقارير المبيعات
            this.auditService.logActivity({
                tenantId: tenant.id,
                userId: request.user?.id || 'anonymous',
                action: 'SALES_REPORT_ACCESSED',
                details: {
                    period: query.period,
                    startDate: query.startDate,
                    endDate: query.endDate,
                },
            });

            // ✅ S2: الحصول على تقارير المبيعات
            const salesReport = await this.dashboardService.getSalesReport(
                tenant.id,
                query.period,
                query.startDate,
                query.endDate,
            );

            return salesReport;
        } catch (error) {
            this.logger.error('Sales report failed:', error);
            throw error;
        }
    }

    @UseGuards(TenantScopedGuard)
    @Get('/:tenantSubdomain/dashboard/products')
    @ApiOperation({ summary: 'تقارير المنتجات' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['SALES', 'VIEWS', 'STOCK'], description: 'ترتيب حسب' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد المنتجات' })
    @ApiResponse({ status: 200, description: 'بيانات المنتجات' })
    async getProductsReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query() query: any,
        @Req() request: any,
    ): Promise<any> {
        try {
            const tenant = request.tenant;

            // ✅ S3: التحقق من صحة المدخلات
            secureValidate(
                z.object({
                    sortBy: z.enum(['SALES', 'VIEWS', 'STOCK']).optional(),
                    limit: z.number().int().positive().max(100).optional(),
                }),
                query,
            );

            // ✅ S4: تسجيل الوصول إلى تقارير المنتجات
            this.auditService.logActivity({
                tenantId: tenant.id,
                userId: request.user?.id || 'anonymous',
                action: 'PRODUCTS_REPORT_ACCESSED',
                details: {
                    sortBy: query.sortBy,
                    limit: query.limit,
                },
            });

            // ✅ S2: الحصول على تقارير المنتجات
            const productsReport = await this.dashboardService.getProductsReport(
                tenant.id,
                query.sortBy,
                query.limit,
            );

            return productsReport;
        } catch (error) {
            this.logger.error('Products report failed:', error);
            throw error;
        }
    }

    @UseGuards(TenantScopedGuard)
    @Get('/:tenantSubdomain/dashboard/customers')
    @ApiOperation({ summary: 'تقارير العملاء' })
    @ApiQuery({ name: 'segment', required: false, type: String, enum: ['ACTIVE', 'INACTIVE', 'NEW', 'LOYAL'], description: 'شريحة العملاء' })
    @ApiResponse({ status: 200, description: 'بيانات العملاء' })
    async getCustomersReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query() query: any,
        @Req() request: any,
    ): Promise<any> {
        try {
            const tenant = request.tenant;

            // ✅ S3: التحقق من صحة المدخلات
            secureValidate(
                z.object({
                    segment: z.enum(['ACTIVE', 'INACTIVE', 'NEW', 'LOYAL']).optional(),
                }),
                query,
            );

            // ✅ S4: تسجيل الوصول إلى تقارير العملاء
            this.auditService.logActivity({
                tenantId: tenant.id,
                userId: request.user?.id || 'anonymous',
                action: 'CUSTOMERS_REPORT_ACCESSED',
                details: {
                    segment: query.segment,
                },
            });

            // ✅ S2: الحصول على تقارير العملاء
            const customersReport = await this.dashboardService.getCustomersReport(
                tenant.id,
                query.segment,
            );

            return customersReport;
        } catch (error) {
            this.logger.error('Customers report failed:', error);
            throw error;
        }
    }

    @UseGuards(TenantScopedGuard)
    @Get('/:tenantSubdomain/dashboard/alerts')
    @ApiOperation({ summary: 'تنبيهات لوحة التحكم' })
    @ApiResponse({ status: 200, description: 'قائمة التنبيهات' })
    async getDashboardAlerts(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Req() request: any,
    ): Promise<any[]> {
        try {
            const tenant = request.tenant;

            // ✅ S4: تسجيل الوصول إلى التنبيهات
            this.auditService.logActivity({
                tenantId: tenant.id,
                userId: request.user?.id || 'anonymous',
                action: 'ALERTS_ACCESSED',
                details: {},
            });

            // ✅ S2: الحصول على التنبيهات
            const alerts = await this.dashboardService.getDashboardAlerts(tenant.id);

            return alerts;
        } catch (error) {
            this.logger.error('Dashboard alerts failed:', error);
            throw error;
        }
    }
}
