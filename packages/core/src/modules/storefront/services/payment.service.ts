import {
    Injectable,
    Inject,
    forwardRef,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RateLimiterService } from '../../../common/access-control/services/rate-limiter.service';
import { EncryptedFieldService as EncryptionService } from '../../../common/security/encryption/encrypted-field.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { Order } from '@prisma/client';
import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly stripe: Stripe;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => RateLimiterService))
        private readonly rateLimiterService: RateLimiterService,
        private readonly encryptionService: EncryptionService,
        private readonly auditService: AuditService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) {
        // ✅ S7: تهيئة Stripe
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            this.logger.warn('STRIPE_SECRET_KEY not set. Payment service will run in test mode.');
        }

        this.stripe = new Stripe(stripeSecretKey || 'sk_test_51N5BQdJvI3n5', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createNodeHttpClient({
                timeout: 10000,
            }),
        });
    }

    // ✅ S6: التحقق من حدود الطلبات
    async checkRateLimit(tenantId: string, ip: string): Promise<void> {
        const limitKey = `payment:${tenantId}:${ip}`;
        const rateLimit = await this.rateLimiterService.checkLimit(limitKey, {
            maxRequests: 10,
            windowMs: 60 * 1000, // 1 دقيقة
        });

        if (!rateLimit.allowed) {
            await this.auditService.logSecurityEvent('PAYMENT_RATE_LIMIT_EXCEEDED', {
                severity: 'HIGH',
                sourceIp: ip,
                details: {
                    tenantId,
                    requests: rateLimit.currentRequests,
                    max: rateLimit.maxRequests,
                },
            });

            throw new HttpException(
                'تم تجاوز حد طلبات الدفع. يرجى المحاولة لاحقاً.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    // ✅ S7: إنشاء نية الدفع
    async createPaymentIntent(
        createPaymentIntentDto: CreatePaymentIntentDto,
        ipAddress: string,
    ): Promise<{ clientSecret: string; paymentId: string }> {
        try {
            // ✅ S7: التحقق من صحة المبلغ
            if (createPaymentIntentDto.amount < 100 || createPaymentIntentDto.amount > 10000000) {
                throw new HttpException(
                    'المبلغ خارج الحدود المسموح بها',
                    HttpStatus.BAD_REQUEST,
                );
            }

            // ✅ S7: إنشاء نية الدفع في Stripe
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(createPaymentIntentDto.amount * 100), // تحويل إلى cents
                currency: createPaymentIntentDto.currency.toLowerCase(),
                payment_method_types: ['card'],
                metadata: {
                    tenantId: createPaymentIntentDto.tenantId,
                    orderId: createPaymentIntentDto.orderId,
                    ipAddress,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // ✅ S7: حفظ معلومات الدفع في قاعدة البيانات
            await this.prisma.payment.create({
                data: {
                    tenantId: createPaymentIntentDto.tenantId,
                    orderId: createPaymentIntentDto.orderId,
                    paymentId: paymentIntent.id,
                    amount: createPaymentIntentDto.amount,
                    currency: createPaymentIntentDto.currency,
                    status: 'CREATED',
                    paymentMethod: createPaymentIntentDto.paymentMethod,
                    ipAddress,
                    metadata: {
                        clientSecret: paymentIntent.client_secret,
                        createdAt: new Date().toISOString(),
                    },
                },
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentId: paymentIntent.id,
            };
        } catch (error) {
            this.logger.error('Stripe payment intent creation failed:', error);

            // ✅ S4: تسجيل الفشل
            await this.auditService.logSecurityEvent('PAYMENT_INTENT_CREATION_FAILED', {
                severity: 'HIGH',
                details: {
                    error: error.message,
                    tenantId: createPaymentIntentDto.tenantId,
                    amount: createPaymentIntentDto.amount,
                },
            });

            throw new HttpException(
                'فشل إنشاء نية الدفع. يرجى المحاولة مرة أخرى.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ✅ S7: التحقق من توقيع Webhook
    async validateWebhookSignature(
        processWebhookDto: ProcessWebhookDto,
        signature: string | undefined,
        rawBody: Buffer,
    ): Promise<void> {
        if (!signature) {
            throw new HttpException('توقيع Webhook مطلوب', HttpStatus.BAD_REQUEST);
        }

        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            this.logger.warn('STRIPE_WEBHOOK_SECRET not set. Webhook validation will be skipped in development.');
            if (this.configService.get('NODE_ENV') !== 'development') {
                throw new HttpException('خطأ في تكوين النظام', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            return;
        }

        try {
            // ✅ S7: التحقق من التوقيع
            const event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret,
            );

            // ✅ S4: تسجيل التحقق الناجح
            this.auditService.logActivity({
                tenantId: 'system',
                action: 'WEBHOOK_SIGNATURE_VERIFIED',
                details: {
                    eventType: event.type,
                    signature,
                },
            });
        } catch (error) {
            this.logger.error('Webhook signature verification failed:', error);

            // ✅ S4: تسجيل محاولات الاختراق
            await this.auditService.logSecurityEvent('INVALID_WEBHOOK_SIGNATURE', {
                severity: 'CRITICAL',
                details: {
                    error: error.message,
                    signature,
                    eventType: processWebhookDto.type,
                },
            });

            throw new HttpException(
                'توقيع Webhook غير صالح',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    // ✅ S7: معالجة أحداث Webhook
    async handleWebhookEvent(
        processWebhookDto: ProcessWebhookDto,
        ipAddress: string,
    ): Promise<void> {
        const event = processWebhookDto as any;

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(event, ipAddress);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(event, ipAddress);
                break;
            case 'payment_intent.canceled':
                await this.handlePaymentCancellation(event, ipAddress);
                break;
            case 'charge.refunded':
                await this.handleRefund(event, ipAddress);
                break;
            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }
    }

    private async handlePaymentSuccess(event: any, ipAddress: string): Promise<void> {
        const paymentIntent = event.data.object;
        const payment = await this.prisma.payment.findFirst({
            where: { paymentId: paymentIntent.id },
        });

        if (!payment) {
            this.logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
            return;
        }

        // ✅ S7: تحديث حالة الدفع
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'SUCCEEDED',
                metadata: {
                    ...payment.metadata,
                    stripeEventId: event.id,
                    succeededAt: new Date().toISOString(),
                },
            },
        });

        // ✅ S7: تحديث حالة الطلب
        await this.prisma.order.update({
            where: { id: payment.orderId },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paymentDetails: {
                    paymentId: payment.id,
                    transactionId: paymentIntent.id,
                    paymentMethod: payment.paymentMethod,
                },
            },
        });

        // ✅ S4: تسجيل النجاح
        await this.auditService.logActivity({
            tenantId: payment.tenantId,
            action: 'PAYMENT_SUCCEEDED',
            details: {
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: payment.amount,
                ipAddress,
            },
        });
    }

    // ✅ S7: تأكيد الدفع
    async confirmPayment(
        checkoutDto: CheckoutDto,
        ipAddress: string,
    ): Promise<Order> {
        // ✅ S7: التحقق من حالة الطلب
        const order = await this.prisma.order.findFirst({
            where: {
                tenantId: checkoutDto.tenantId,
                status: 'PENDING',
            },
            include: {
                items: true,
            },
        });

        if (!order) {
            throw new HttpException('الطلب غير موجود أو مدفوع مسبقاً', HttpStatus.NOT_FOUND);
        }

        // ✅ S7: تحديث حالة الطلب
        return this.prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'CONFIRMED',
                paymentMethod: checkoutDto.paymentMethod,
                paymentDetails: {
                    customerInfo: this.encryptionService.encrypt(
                        checkoutDto.tenantId,
                        JSON.stringify(checkoutDto.customerInfo),
                    ),
                    shippingAddress: this.encryptionService.encrypt(
                        checkoutDto.tenantId,
                        JSON.stringify(checkoutDto.shippingAddress),
                    ),
                },
            },
            include: {
                items: true,
            },
        });
    }

    // ✅ S5: إرسال تأكيد الدفع
    async sendPaymentConfirmation(order: Order, tenantId: string): Promise<void> {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
            });

            if (!tenant) {
                this.logger.warn(`Tenant not found for payment confirmation: ${tenantId}`);
                return;
            }

            // ✅ S7: فك تشفير البيانات
            let customerEmail = 'unknown@example.com';
            try {
                const paymentDetails = order.paymentDetails as any;
                if (paymentDetails?.customerInfo) {
                    const customerInfo = JSON.parse(
                        this.encryptionService.decrypt(
                            tenantId,
                            paymentDetails.customerInfo,
                        ),
                    );
                    customerEmail = customerInfo.email || customerEmail;
                }
            } catch (error) {
                this.logger.warn('Failed to decrypt customer info for payment confirmation');
            }

            const orderDetails = {
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount.toLocaleString('ar-EG', {
                    style: 'currency',
                    currency: order.currency,
                }),
                items: order.items,
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            };

            await this.mailService.sendMail({
                to: customerEmail,
                subject: `تأكيد الدفع #${order.orderNumber} - ${tenant.storeName}`,
                template: 'payment-confirmation',
                context: {
                    storeName: tenant.name,
                    customerName: customerEmail.split('@')[0],
                    orderDetails,
                    supportEmail: 'support@apex-platform.com',
                },
                tenantId,
            });

            await this.auditService.logActivity({
                tenantId,
                action: 'PAYMENT_CONFIRMATION_SENT',
                details: { orderId: order.id, email: customerEmail },
            });
        } catch (error) {
            this.logger.error('Failed to send payment confirmation:', error);
            // لا نوقف العملية إذا فشل الإرسال
        }
    }

    // ✅ S7: إعادة مبلغ الدفع
    async refundPayment(
        orderId: string,
        amount: number,
        reason?: string,
        ipAddress?: string,
    ): Promise<any> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: true,
                tenant: true,
            },
        });

        if (!order) {
            throw new HttpException('الطلب غير موجود', HttpStatus.NOT_FOUND);
        }

        if (order.status !== 'PAID') {
            throw new HttpException('يمكن إعادة المبلغ للطلبات المدفوعة فقط', HttpStatus.BAD_REQUEST);
        }

        if (amount > order.totalAmount) {
            throw new HttpException('المبلغ المطلوب أكبر من المبلغ الأصلي', HttpStatus.BAD_REQUEST);
        }

        try {
            // ✅ S7: إعادة المبلغ في Stripe
            const refund = await this.stripe.refunds.create({
                payment_intent: order.payment?.paymentId,
                amount: Math.round(amount * 100), // تحويل إلى cents
                reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
                metadata: {
                    orderId,
                    refundedBy: 'admin',
                    ipAddress,
                },
            });

            // ✅ S7: تحديث حالة الطلب
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'REFUNDED',
                    refundedAt: new Date(),
                    refundDetails: {
                        refundId: refund.id,
                        amount,
                        reason,
                        refundedAt: new Date().toISOString(),
                    },
                },
            });

            // ✅ S4: تسجيل التدقيق
            await this.auditService.logActivity({
                tenantId: order.tenantId,
                action: 'PAYMENT_REFUNDED',
                details: {
                    orderId,
                    refundId: refund.id,
                    amount,
                    reason,
                    ipAddress,
                },
            });

            return {
                id: refund.id,
                amount,
                currency: refund.currency,
                status: refund.status,
                tenantId: order.tenantId,
            };
        } catch (error) {
            this.logger.error('Stripe refund failed:', error);

            // ✅ S4: تسجيل الفشل
            await this.auditService.logSecurityEvent('REFUND_FAILED', {
                severity: 'MEDIUM',
                details: {
                    error: error.message,
                    orderId,
                    amount,
                },
            });

            throw new HttpException(
                'فشل إعادة المبلغ. يرجى المحاولة مرة أخرى.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // Handlers for other webhook events
    private async handlePaymentFailure(event: any, ipAddress: string) { /* ... */ }
    private async handlePaymentCancellation(event: any, ipAddress: string) { /* ... */ }
    private async handleRefund(event: any, ipAddress: string) { /* ... */ }
}
