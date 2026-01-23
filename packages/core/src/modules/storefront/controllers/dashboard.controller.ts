import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { TenantScopedGuard } from '../../../common/security/guards/tenant-scoped.guard';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { InputValidatorService } from '../../../common/security/validation/input-validator.service';
import { DateRangeDto } from '../dto/date-range.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';

@ApiTags('Storefront Dashboard')
@Controller('api/shop')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly auditService: AuditService,
        private readonly inputValidator: InputValidatorService,
    ) { }

    @UseGuards(TenantScopedGuard)
    @Get(':tenantSubdomain/dashboard/overview')
    @ApiOperation({ summary: 'نظرة عامة على أداء المتجر' })
    @ApiHeader({ name: 'x-tenant-id', description: 'معرف المتجر', required: true })
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
            await this.inputValidator.secureValidate(DateRangeDto.schema, dateRangeDto, 'dashboard.overview');

            // ✅ S4: تسجيل الوصول إلى لوحة التحكم
            await this.auditService.logActivity({
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
            this.logger.error(`Dashboard overview failed for tenant ${tenantSubdomain}: ${error.message}`);
            throw error instanceof HttpException ? error : new HttpException('Dashboard processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(TenantScopedGuard)
    @Get(':tenantSubdomain/dashboard/sales')
    @ApiOperation({ summary: 'تقارير المبيعات' })
    async getSalesReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query('period') period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' = 'MONTH',
        @Req() request: any,
    ): Promise<any> {
        const tenant = request.tenant;

        await this.auditService.logActivity({
            tenantId: tenant.id,
            userId: request.user?.id || 'anonymous',
            action: 'SALES_REPORT_VIEWED',
            details: { period },
        });

        return this.dashboardService.getSalesReport(tenant.id, period);
    }

    @UseGuards(TenantScopedGuard)
    @Get(':tenantSubdomain/dashboard/products')
    @ApiOperation({ summary: 'تحليل أداء المنتجات' })
    async getProductsReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query('sortBy') sortBy: 'SALES' | 'VIEWS' | 'STOCK' = 'SALES',
        @Query('limit') limit: number = 10,
        @Req() request: any,
    ): Promise<any> {
        const tenant = request.tenant;

        await this.auditService.logActivity({
            tenantId: tenant.id,
            userId: request.user?.id || 'anonymous',
            action: 'PRODUCTS_REPORT_VIEWED',
            details: { sortBy, limit },
        });

        return this.dashboardService.getProductsReport(tenant.id, sortBy, limit);
    }

    @UseGuards(TenantScopedGuard)
    @Get(':tenantSubdomain/dashboard/customers')
    @ApiOperation({ summary: 'تحليل بيانات العملاء' })
    async getCustomersReport(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query('segment') segment: 'ALL' | 'NEW' | 'ACTIVE' | 'VIP' = 'ALL',
        @Req() request: any,
    ): Promise<any> {
        const tenant = request.tenant;

        await this.auditService.logActivity({
            tenantId: tenant.id,
            userId: request.user?.id || 'anonymous',
            action: 'CUSTOMERS_REPORT_VIEWED',
            details: { segment },
        });

        return this.dashboardService.getCustomersReport(tenant.id, segment);
    }

    @UseGuards(TenantScopedGuard)
    @Get(':tenantSubdomain/dashboard/alerts')
    @ApiOperation({ summary: 'تنبيهات النظام والمخزون' })
    async getDashboardAlerts(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Req() request: any,
    ): Promise<any> {
        const tenant = request.tenant;

        const alerts = await this.dashboardService.getDashboardAlerts(tenant.id);

        // تسجيل التنبيهات عالية الخطورة أمنيًا
        const highSeverityAlerts = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
        if (highSeverityAlerts.length > 0) {
            await this.auditService.logSecurityEvent('HIGH_SEVERITY_ALERTS_DETECTED', {
                tenantId: tenant.id,
                alertCount: highSeverityAlerts.length,
                alerts: highSeverityAlerts.map(a => a.title),
            });
        }

        return alerts;
    }
}
