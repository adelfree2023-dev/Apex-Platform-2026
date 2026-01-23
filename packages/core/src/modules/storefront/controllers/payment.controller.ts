import {
    Controller,
    Post,
    Body,
    UseGuards,
    Req,
    HttpException,
    HttpStatus,
    Logger,
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { TenantScopedGuard } from '../../../common/access-control/guards/tenant-scoped.guard';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { secureValidate } from '../../../common/security/validation/input-validator.service';

@ApiTags('Storefront - Payment API')
@Controller('api/shop')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly auditService: AuditService,
    ) { }

    @Public()
    @Post('/:tenantSubdomain/payments/create-intent')
    @ApiOperation({ summary: 'إنشاء نية دفع جديدة' })
    @ApiResponse({ status: 201, description: 'نية الدفع أنشئت بنجاح' })
    @ApiResponse({ status: 400, description: 'بيانات الدفع غير صالحة' })
    async createPaymentIntent(
        @Body() createPaymentIntentDto: CreatePaymentIntentDto,
        @Req() request: any,
    ): Promise<{ clientSecret: string; paymentId: string }> {
        try {
            // ✅ S3: التحقق من صحة البيانات
            secureValidate(CreatePaymentIntentDto.schema, createPaymentIntentDto);

            // ✅ S6: التحقق من حدود الطلبات
            await this.paymentService.checkRateLimit(
                createPaymentIntentDto.tenantId,
                request.ip,
            );

            // ✅ S7: إنشاء نية الدفع
            const paymentIntent = await this.paymentService.createPaymentIntent(
                createPaymentIntentDto,
                request.ip,
            );

            // ✅ S4: تسجيل التدقيق
            this.auditService.logActivity({
                tenantId: createPaymentIntentDto.tenantId,
                userId: 'anonymous',
                action: 'PAYMENT_INTENT_CREATED',
                details: {
                    amount: createPaymentIntentDto.amount,
                    currency: createPaymentIntentDto.currency,
                    paymentMethod: createPaymentIntentDto.paymentMethod,
                },
            });

            return paymentIntent;
        } catch (error) {
            this.logger.error('Payment intent creation failed:', error);

            // ✅ S4: تسجيل محاولات الدفع الفاشلة
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'فشل إنشاء نية الدفع. يرجى المحاولة مرة أخرى.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Public()
    @Post('/:tenantSubdomain/payments/webhook')
    @ApiOperation({ summary: 'معالجة أحداث Webhook من بوابة الدفع' })
    @ApiSecurity('webhook-signature')
    @ApiResponse({ status: 200, description: 'تم معالجة الحدث بنجاح' })
    @ApiResponse({ status: 400, description: 'توقيع غير صالح أو بيانات غير صالحة' })
    async processWebhook(
        @Body() processWebhookDto: ProcessWebhookDto,
        @Headers('stripe-signature') signature?: string,
        @Req() request: any,
    ): Promise<{ received: boolean }> {
        try {
            // ✅ S7: التحقق من التوقيع
            await this.paymentService.validateWebhookSignature(
                processWebhookDto,
                signature,
                request.rawBody,
            );

            // ✅ S7: معالجة الحدث
            await this.paymentService.handleWebhookEvent(
                processWebhookDto,
                request.ip,
            );

            // ✅ S4: تسجيل التدقيق
            this.auditService.logSecurityEvent({
                eventType: 'PAYMENT_WEBHOOK_PROCESSED',
                severity: 'INFO',
                details: {
                    eventType: processWebhookDto.type,
                    paymentId: processWebhookDto.data.object.id,
                },
            });

            return { received: true };
        } catch (error) {
            this.logger.error('Webhook processing failed:', error);

            // ✅ S4: تسجيل محاولات الاختراق
            this.auditService.logSecurityEvent({
                eventType: 'INVALID_WEBHOOK_ATTEMPT',
                severity: 'HIGH',
                sourceIp: request.ip,
                details: {
                    error: error.message,
                    signature,
                    eventType: processWebhookDto.type,
                },
            });

            throw new HttpException(
                'فشل معالجة Webhook. التوقيع غير صالح.',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Public()
    @Post('/:tenantSubdomain/payments/confirm')
    @ApiOperation({ summary: 'تأكيد الدفع' })
    @ApiResponse({ status: 200, description: 'الدفع أكد بنجاح', type: OrderResponseDto })
    @ApiResponse({ status: 400, description: 'بيانات التأكيد غير صالحة' })
    async confirmPayment(
        @Body() checkoutDto: CheckoutDto,
        @Req() request: any,
    ): Promise<OrderResponseDto> {
        try {
            // ✅ S3: التحقق من صحة البيانات
            secureValidate(CheckoutDto.schema, checkoutDto);

            // ✅ S7: تأكيد الدفع
            const order = await this.paymentService.confirmPayment(
                checkoutDto,
                request.ip,
            );

            // ✅ S4: تسجيل التدقيق
            this.auditService.logActivity({
                tenantId: checkoutDto.tenantId,
                userId: 'anonymous',
                action: 'PAYMENT_CONFIRMED',
                details: {
                    orderId: order.id,
                    amount: order.totalAmount,
                    paymentMethod: checkoutDto.paymentMethod,
                },
            });

            // ✅ S5: إرسال إشعارات
            await this.paymentService.sendPaymentConfirmation(order, checkoutDto.tenantId);

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
            this.logger.error('Payment confirmation failed:', error);

            // ✅ S4: تسجيل الفشل
            this.auditService.logSecurityEvent({
                eventType: 'PAYMENT_CONFIRMATION_FAILED',
                severity: 'MEDIUM',
                details: {
                    error: error.message,
                    paymentMethod: checkoutDto.paymentMethod,
                },
            });

            throw error;
        }
    }

    @Public()
    @Post('/:tenantSubdomain/payments/refund')
    @ApiOperation({ summary: 'إعادة مبلغ الدفع' })
    @ApiResponse({ status: 200, description: 'تمت إعادة المبلغ بنجاح' })
    @ApiResponse({ status: 400, description: 'بيانات الإعادة غير صالحة' })
    async refundPayment(
        @Body() refundDto: any,
        @Req() request: any,
    ): Promise<{ success: boolean; refundId: string }> {
        try {
            // ✅ S3: التحقق من صحة البيانات
            secureValidate(
                z.object({
                    orderId: z.string().uuid(),
                    amount: z.number().positive(),
                    reason: z.string().optional(),
                }),
                refundDto,
            );

            // ✅ S7: إعادة المبلغ
            const refund = await this.paymentService.refundPayment(
                refundDto.orderId,
                refundDto.amount,
                refundDto.reason,
                request.ip,
            );

            // ✅ S4: تسجيل التدقيق
            this.auditService.logActivity({
                tenantId: refund.tenantId,
                userId: 'system',
                action: 'PAYMENT_REFUNDED',
                details: {
                    orderId: refundDto.orderId,
                    amount: refundDto.amount,
                    refundId: refund.id,
                },
            });

            return {
                success: true,
                refundId: refund.id,
            };
        } catch (error) {
            this.logger.error('Payment refund failed:', error);

            // ✅ S4: تسجيل الفشل
            this.auditService.logSecurityEvent({
                eventType: 'PAYMENT_REFUND_ATTEMPT',
                severity: 'MEDIUM',
                details: {
                    error: error.message,
                    orderId: refundDto.orderId,
                },
            });

            throw error;
        }
    }
}
