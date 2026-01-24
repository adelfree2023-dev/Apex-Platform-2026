import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    Req,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { Public } from '../../../common/decorators/public.decorator';
import { BaseInputSchema } from '../../../common/security/validation/dto/base.dto';
import { InputValidatorService } from '../../../common/security/validation/input-validator.service';
import { ShopService } from '../services/shop.service';
import { ProductListDto } from '../dto/product-list.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { ProductService } from '../../products/services/product.service';
import { CategoryService } from '../../categories/services/category.service';
import { TenantsService } from '../../tenants/tenants.service';

@ApiTags('Storefront - Shop API')
@Controller('api/shop')
export class ShopController {
    private readonly logger = new Logger(ShopController.name);

    constructor(
        private readonly tenantsService: TenantsService,
        private readonly shopService: ShopService,
        private readonly productService: ProductService,
        private readonly categoryService: CategoryService,
        private readonly auditService: AuditService,
        private readonly inputValidator: InputValidatorService,
    ) { }

    @Public()
    @Get('/:tenantSubdomain/products')
    @ApiOperation({ summary: 'الحصول على منتجات المتجر' })
    @ApiParam({ name: 'tenantSubdomain', required: true, description: 'اسم نطاق المتجر الفرعي' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'رقم الصفحة' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'عدد المنتجات في الصفحة' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'نص البحث' })
    @ApiQuery({ name: 'category', required: false, type: String, description: 'فلترة حسب الفئة' })
    @ApiResponse({ status: 200, description: 'قائمة المنتجات', type: ProductListDto })
    @ApiResponse({ status: 404, description: 'المتجر غير موجود' })
    async getProducts(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('q') searchQuery?: string,
        @Query('category') category?: string,
    ): Promise<ProductListDto> {
        try {
            // ✅ S2: التحقق من وجود المستأجر
            const tenant = await this.tenantsService.getTenantBySubdomain(tenantSubdomain);
            if (!tenant) {
                await this.auditService.logSecurityEvent('SHOP_ACCESS_ATTEMPT', {
                    severity: 'MEDIUM',
                    tenantSubdomain,
                    action: 'PRODUCTS_ACCESS'
                });
                throw new HttpException('المتجر غير موجود', HttpStatus.NOT_FOUND);
            }

            // ✅ S3: التحقق من صحة المدخلات
            await this.inputValidator.secureValidate(BaseInputSchema, {
                tenantId: tenant.id,
                timestamp: Date.now(),
            }, 'shop.products');

            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);

            if (isNaN(pageNumber) || pageNumber < 1) {
                throw new HttpException('رقم الصفحة غير صالح', HttpStatus.BAD_REQUEST);
            }

            if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
                throw new HttpException('حد المنتجات غير صالح', HttpStatus.BAD_REQUEST);
            }

            // ✅ S2: عزل البيانات حسب المستأجر
            const products = await this.productService.findProductsByTenant(
                tenant.id,
                pageNumber,
                limitNumber,
                searchQuery,
                category,
            );

            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'anonymous',
                action: 'VIEW_PRODUCTS',
                details: { page: pageNumber, limit: limitNumber, searchQuery, category },
            });

            return {
                data: products.items,
                total: products.total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(products.total / limitNumber),
            };
        } catch (error) {
            this.logger.error('Error in getProducts:', error);
            throw error;
        }
    }

    @Public()
    @Get('/:tenantSubdomain/products/:productId')
    @ApiOperation({ summary: 'الحصول على تفاصيل منتج' })
    @ApiParam({ name: 'tenantSubdomain', required: true, description: 'اسم نطاق المتجر الفرعي' })
    @ApiParam({ name: 'productId', required: true, description: 'معرف المنتج' })
    @ApiResponse({ status: 200, description: 'تفاصيل المنتج' })
    @ApiResponse({ status: 404, description: 'المنتج غير موجود' })
    async getProduct(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Param('productId') productId: string,
    ): Promise<any> {
        try {
            const tenant = await this.tenantsService.getTenantBySubdomain(tenantSubdomain);
            if (!tenant) {
                throw new HttpException('المتجر غير موجود', HttpStatus.NOT_FOUND);
            }

            await this.inputValidator.secureValidate(BaseInputSchema, {
                tenantId: tenant.id,
                timestamp: Date.now(),
            }, 'shop.product.detail');

            const product = await this.productService.findOneByTenant(tenant.id, productId);

            if (!product) {
                await this.auditService.logSecurityEvent('PRODUCT_ACCESS_ATTEMPT', {
                    severity: 'LOW',
                    tenantId: tenant.id,
                    productId,
                    action: 'VIEW_ATTEMPT'
                });
                throw new HttpException('المنتج غير موجود', HttpStatus.NOT_FOUND);
            }

            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'anonymous',
                action: 'VIEW_PRODUCT',
                details: { productId },
            });

            return product;
        } catch (error) {
            this.logger.error('Error in getProduct:', error);
            throw error;
        }
    }

    @Public()
    @Get('/:tenantSubdomain/categories')
    @ApiOperation({ summary: 'الحصول على فئات المتجر' })
    @ApiParam({ name: 'tenantSubdomain', required: true, description: 'اسم نطاق المتجر الفرعي' })
    @ApiResponse({ status: 200, description: 'قائمة الفئات' })
    async getCategories(
        @Param('tenantSubdomain') tenantSubdomain: string,
    ): Promise<any[]> {
        try {
            const tenant = await this.tenantsService.getTenantBySubdomain(tenantSubdomain);
            if (!tenant) {
                throw new HttpException('المتجر غير موجود', HttpStatus.NOT_FOUND);
            }

            await this.inputValidator.secureValidate(BaseInputSchema, {
                tenantId: tenant.id,
                timestamp: Date.now(),
            }, 'shop.categories');

            const categories = await this.categoryService.findCategoriesByTenant(tenant.id);

            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'anonymous',
                action: 'VIEW_CATEGORIES',
                details: { count: categories.length },
            });

            return categories;
        } catch (error) {
            this.logger.error('Error in getCategories:', error);
            throw error;
        }
    }

    @Public()
    @Post('/:tenantSubdomain/checkout')
    @ApiOperation({ summary: 'إتمام عملية الشراء' })
    @ApiParam({ name: 'tenantSubdomain', required: true, description: 'اسم نطاق المتجر الفرعي' })
    @ApiResponse({ status: 201, description: 'الطلب تم بنجاح', type: OrderResponseDto })
    @ApiResponse({ status: 400, description: 'بيانات الطلب غير صالحة' })
    async checkout(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Body() checkoutDto: CheckoutDto,
        @Req() request: any,
    ): Promise<OrderResponseDto> {
        try {
            const tenant = await this.tenantsService.getTenantBySubdomain(tenantSubdomain);
            if (!tenant) {
                throw new HttpException('المتجر غير موجود', HttpStatus.NOT_FOUND);
            }

            // ✅ S3: التحقق من صحة بيانات الطلب
            await this.inputValidator.secureValidate(CheckoutDto.schema, checkoutDto, 'shop.checkout');

            // ✅ S6: التحقق من حدود الطلبات
            await this.shopService.checkRateLimit(tenant.id, request.ip);

            // ✅ S2: التحقق من توفر المنتجات
            const validatedItems = await this.shopService.validateCartItems(
                tenant.id,
                checkoutDto.items,
            );

            // ✅ S7: إنشاء الطلب
            const order = await this.shopService.createOrder(
                tenant.id,
                validatedItems,
                checkoutDto.customerInfo,
                checkoutDto.shippingAddress,
                checkoutDto.paymentMethod,
                request.ip,
            );

            // ✅ S4: تسجيل التدقيق
            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'anonymous',
                action: 'ORDER_CREATED',
                details: {
                    orderId: order.id,
                    totalAmount: order.totalAmount,
                    itemCount: order.items.length,
                    paymentMethod: order.paymentMethod,
                },
            });

            // ✅ S5: إرسال إشعار
            await this.shopService.sendOrderConfirmation(order, tenant);

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                items: order.items,
            };
        } catch (error) {
            this.logger.error('Checkout failed:', error);

            // ✅ S4: تسجيل الأخطاء الحرجة
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'فشل عملية الشراء. يرجى المحاولة مرة أخرى.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Public()
    @Get('/:tenantSubdomain/orders/:orderId')
    @ApiOperation({ summary: 'الحصول على تفاصيل الطلب' })
    @ApiParam({ name: 'tenantSubdomain', required: true, description: 'اسم نطاق المتجر الفرعي' })
    @ApiParam({ name: 'orderId', required: true, description: 'معرف الطلب' })
    @ApiResponse({ status: 200, description: 'تفاصيل الطلب', type: OrderResponseDto })
    @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
    async getOrder(
        @Param('tenantSubdomain') tenantSubdomain: string,
        @Param('orderId') orderId: string,
    ): Promise<OrderResponseDto> {
        try {
            const tenant = await this.tenantsService.getTenantBySubdomain(tenantSubdomain);
            if (!tenant) {
                throw new HttpException('المتجر غير موجود', HttpStatus.NOT_FOUND);
            }

            await this.inputValidator.secureValidate(BaseInputSchema, {
                tenantId: tenant.id,
                timestamp: Date.now(),
            }, 'shop.order.detail');

            const order = await this.shopService.getOrderById(tenant.id, orderId);

            if (!order) {
                throw new HttpException('الطلب غير موجود', HttpStatus.NOT_FOUND);
            }

            await this.auditService.logActivity({
                tenantId: tenant.id,
                userId: 'anonymous',
                action: 'VIEW_ORDER',
                details: { orderId },
            });

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                createdAt: order.createdAt.toISOString(),
                items: order.items,
                shippingAddress: order.shippingAddress,
                customerInfo: order.customerInfo,
            };
        } catch (error) {
            this.logger.error('Error in getOrder:', error);
            throw error;
        }
    }
}
