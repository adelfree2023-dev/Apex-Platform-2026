import { z } from 'zod';
import { BaseSchema } from '../../../common/security/validation/dto/base.dto';

export const CustomerInfoSchema = z.object({
    name: z.string().min(2, 'الاسم مطلوب').max(100, 'الاسم طويل جداً'),
    email: BaseSchema.emailAddress,
    phone: BaseSchema.phoneNumber,
    notes: z.string().max(500, 'الملاحظات طويلة جداً').optional(),
});

export const ShippingAddressSchema = z.object({
    street: z.string().min(5, 'الشارع مطلوب').max(200, 'الشارع طويل جداً'),
    city: z.string().min(2, 'المدينة مطلوبة').max(100, 'المدينة طويلة جداً'),
    country: z.string().min(2, 'البلد مطلوب').max(100, 'البلد طويل جداً'),
    postalCode: z.string().min(3, 'الرمز البريدي مطلوب').max(20, 'الرمز البريدي طويل جداً'),
    apartment: z.string().max(50, 'رقم الشقة طويل جداً').optional(),
});

export const CartItemSchema = z.object({
    productId: z.string().uuid('معرف المنتج غير صالح'),
    quantity: z.number().int('الكمية يجب أن تكون رقماً').min(1, 'الكمية الأدنى 1').max(100, 'الكمية القصوى 100'),
    price: z.number().positive('السعر يجب أن يكون موجباً'),
    currency: z.string().min(3, 'العملة غير صالحة').max(3, 'العملة غير صالحة'),
    name: z.string().min(2, 'اسم المنتج مطلوب').max(200, 'اسم المنتج طويل جداً'),
});

export const CheckoutSchema = z.object({
    items: z.array(CartItemSchema).min(1, 'السلة فارغة').max(50, 'الحد الأقصى للمنتجات هو 50'),
    customerInfo: CustomerInfoSchema,
    shippingAddress: ShippingAddressSchema,
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CREDIT_CARD', 'WALLET'], {
        required_error: 'طريقة الدفع مطلوبة',
    }),
});

export class CheckoutDto {
    static schema = CheckoutSchema;

    items: CartItemSchema[];
    customerInfo: CustomerInfoSchema;
    shippingAddress: ShippingAddressSchema;
    paymentMethod: 'CASH_ON_DELIVERY' | 'CREDIT_CARD' | 'WALLET';
}
