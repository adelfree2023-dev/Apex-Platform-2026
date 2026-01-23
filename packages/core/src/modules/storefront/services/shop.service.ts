import {
    Injectable,
    Inject,
    forwardRef,
    HttpException,
    HttpStatus,
    OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { RateLimiterService } from '../../../common/security/rate-limiter/rate-limiter.service';
import { EncryptionService } from '../../../common/security/encryption/encryption.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { CartItemDto } from '../dto/cart-item.dto';
import { CustomerInfoDto } from '../dto/customer-info.dto';
import { ShippingAddressDto } from '../dto/shipping-address.dto';
import { Order } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class ShopService implements OnModuleInit {
    private readonly logger = new Logger(ShopService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContextService: TenantContextService,
        @Inject(forwardRef(() => RateLimiterService))
        private readonly rateLimiterService: RateLimiterService,
        private readonly encryptionService: EncryptionService,
        private readonly auditService: AuditService,
        private readonly mailService: MailService,
    ) { }

    async onModuleInit() {
        this.logger.log('ShopService initialized with security features');
    }

    // ✅ S6: التحقق من حدود الطلبات
    async checkRateLimit(tenantId: string, ip: string): Promise<void> {
        const limitKey = `checkout:${tenantId}:${ip}`;
        const rateLimit = await this.rateLimiterService.checkLimit(limitKey, {
            maxRequests: 5,
            windowMs: 60 * 1000, // 1 دقيقة
        });

        if (!rateLimit.allowed) {
            await this.auditService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                severity: 'HIGH',
                sourceIp: ip,
                details: {
                    tenantId,
                    endpoint: 'checkout',
                    requests: rateLimit.currentRequests,
                    max: rateLimit.maxRequests,
                },
            });

            throw new HttpException(
                'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    // ✅ S2: التحقق من توفر المنتجات
    async validateCartItems(
        tenantId: string,
        items: CartItemDto[],
    ): Promise<CartItemDto[]> {
        if (items.length === 0) {
            throw new HttpException('السلة فارغة', HttpStatus.BAD_REQUEST);
        }

        const validatedItems = [];
        let totalAmount = 0;

        for (const item of items) {
            // ✅ S3: التحقق من صحة بيانات السلة
            if (item.quantity <= 0 || item.quantity > 100) {
                throw new HttpException(
                    `الكمية غير صالحة للمنتج ${item.productId}`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // ✅ S2: الحصول على المنتج مع التحقق من المستأجر
            const product = await this.prisma.product.findFirst({
                where: {
                    id: item.productId,
                    tenantId,
                    status: 'ACTIVE',
                    stock: {
                        gte: item.quantity,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    salePrice: true,
                    stock: true,
                    currency: true,
                },
            });

            if (!product) {
                await this.auditService.logSecurityEvent('PRODUCT_UNAVAILABLE', {
                    severity: 'MEDIUM',
                    details: {
                        tenantId,
                        productId: item.productId,
                        requestedQuantity: item.quantity,
                    },
                });

                throw new HttpException(
                    `المنتج ${item.productId} غير متوفر أو الكمية غير كافية`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            const price = product.salePrice || product.price;
            const itemTotal = price * item.quantity;

            validatedItems.push({
                ...item,
                name: product.name,
                price,
                currency: product.currency,
            });

            totalAmount += itemTotal;
        }

        // ✅ S7: التحقق من الحد الأقصى للمبلغ
        if (totalAmount > 100000) {
            await this.auditService.logSecurityEvent('HIGH_VALUE_ORDER_ATTEMPT', {
                severity: 'HIGH',
                details: { tenantId, totalAmount },
            });

            throw new HttpException(
                'المبلغ الإجمالي يتجاوز الحد المسموح به',
                HttpStatus.BAD_REQUEST,
            );
        }

        return validatedItems;
    }

    // ✅ S7: إنشاء الطلب
    async createOrder(
        tenantId: string,
        items: CartItemDto[],
        customerInfo: CustomerInfoDto,
        shippingAddress: ShippingAddressDto,
        paymentMethod: string,
        ipAddress: string,
    ): Promise<Order> {
        // ✅ S7: تشفير البيانات الحساسة
        const encryptedCustomerInfo = this.encryptionService.encryptSensitiveData(
            JSON.stringify(customerInfo),
            tenantId,
        );

        const encryptedShippingAddress = this.encryptionService.encryptSensitiveData(
            JSON.stringify(shippingAddress),
            tenantId,
        );

        let order;
        const orderNumber = this.generateOrderNumber(tenantId);

        try {
            // ✅ S2: إنشاء الطلب في سياق المستأجر
            await this.prisma.$transaction(async (tx) => {
                // ✅ S2: تقليل الكمية من المخزون
                for (const item of items) {
                    await tx.product.update({
                        where: {
                            id: item.productId,
                            tenantId,
                        },
                        data: {
                            stock: {
                                decrement: item.quantity,
                            },
                        },
                    });
                }

                // ✅ S2: إنشاء الطلب
                order = await tx.order.create({
                    data: {
                        tenantId,
                        orderNumber,
                        status: 'PENDING',
                        items: {
                            create: items.map((item) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price,
                                currency: item.currency,
                                name: item.name,
                            })),
                        },
                        totalAmount: items.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0,
                        ),
                        currency: items[0]?.currency || 'USD',
                        customerInfo: encryptedCustomerInfo,
                        shippingAddress: encryptedShippingAddress,
                        paymentMethod,
                        ipAddress,
                        metadata: {
                            userAgent: '',
                            deviceType: 'web',
                        },
                    },
                    include: {
                        items: true,
                    },
                });

                // ✅ S4: تسجيل حدث التدقيق
                await this.auditService.logActivity({
                    tenantId,
                    action: 'ORDER_CREATED_IN_TRANSACTION',
                    details: {
                        orderId: order.id,
                        orderNumber,
                        totalAmount: order.totalAmount,
                    },
                });
            });

            if (!order) {
                throw new Error('Failed to create order in transaction');
            }

            return order;
        } catch (error) {
            this.logger.error('Order creation failed:', error);

            // ✅ S4: تسجيل الفشل في التدقيق
            await this.auditService.logSecurityEvent('ORDER_CREATION_FAILED', {
                severity: 'CRITICAL',
                details: {
                    tenantId,
                    orderNumber,
                    error: error.message,
                    items: items.map((i) => ({ id: i.productId, qty: i.quantity })),
                },
            });

            throw new HttpException(
                'فشل إنشاء الطلب. يرجى المحاولة مرة أخرى.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ✅ S4: إرسال إشعار تأكيد الطلب
    async sendOrderConfirmation(order: Order, tenant: any): Promise<void> {
        try {
            const orderDetails = {
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount.toLocaleString('ar-EG', {
                    style: 'currency',
                    currency: order.currency,
                }),
                items: order.items,
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            };

            // ✅ S7: فك تشفير البيانات للإشعار
            let customerEmail = 'unknown@example.com';
            try {
                const customerInfo = JSON.parse(
                    this.encryptionService.decryptSensitiveData(
                        order.customerInfo,
                        tenant.id,
                    ),
                );
                customerEmail = customerInfo.email || customerEmail;
            } catch (error) {
                this.logger.warn('Failed to decrypt customer info for notification');
            }

            await this.mailService.sendEmail({
                to: customerEmail,
                subject: `تأكيد طلبك #${order.orderNumber} - ${tenant.storeName}`,
                template: 'order-confirmation',
                data: {
                    storeName: tenant.storeName,
                    customerName: customerEmail.split('@')[0],
                    orderDetails,
                    supportEmail: tenant.supportEmail || 'support@apex-platform.com',
                },
                tenantId: tenant.id,
            });

            await this.auditService.logActivity({
                tenantId: tenant.id,
                action: 'ORDER_CONFIRMATION_SENT',
                details: { orderId: order.id, email: customerEmail },
            });
        } catch (error) {
            this.logger.error('Failed to send order confirmation:', error);
            // لا نوقف العملية إذا فشل الإرسال
        }
    }

    // ✅ S2: الحصول على طلب حسب المستأجر
    async getOrderById(tenantId: string, orderId: string): Promise<Order | null> {
        return this.prisma.order.findFirst({
            where: {
                id: orderId,
                tenantId,
            },
            include: {
                items: true,
            },
        });
    }

    private generateOrderNumber(tenantId: string): string {
        const timestamp = Math.floor(Date.now() / 1000);
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const tenantPrefix = tenantId.substring(0, 4).toUpperCase();

        return `${tenantPrefix}-${timestamp}-${randomPart}`;
    }
}
