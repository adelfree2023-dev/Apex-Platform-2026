import { z } from 'zod';
import { BaseSchema } from '../../../common/security/validation/dto/base.dto';

export const CreatePaymentIntentSchema = z.object({
    tenantId: BaseSchema.tenantId,
    orderId: z.string().uuid('معرف الطلب غير صالح'),
    amount: z.number().positive('المبلغ يجب أن يكون موجباً').min(1, 'الحد الأدنى للمبلغ هو 1').max(100000, 'الحد الأقصى للمبلغ هو 100,000'),
    currency: z.string().min(3, 'رمز العملة غير صالح').max(3, 'رمز العملة غير صالح').regex(/^[A-Z]{3}$/, 'رمز العملة يجب أن يكون 3 أحرف كبيرة'),
    paymentMethod: z.enum(['CARD', 'WALLET', 'CASH_ON_DELIVERY'], {
        required_error: 'طريقة الدفع مطلوبة',
    }),
    customerEmail: BaseSchema.emailAddress.optional(),
    metadata: z.record(z.string()).optional(),
});

export class CreatePaymentIntentDto {
    static schema = CreatePaymentIntentSchema;

    tenantId: string;
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: 'CARD' | 'WALLET' | 'CASH_ON_DELIVERY';
    customerEmail?: string;
    metadata?: Record<string, string>;
}
