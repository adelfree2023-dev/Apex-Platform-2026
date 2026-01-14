/**
 * Internationalization (i18n) Service
 * Supports multiple languages with Arabic and English
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Translation {
    key: string;
    en: string;
    ar: string;
}

const DEFAULT_TRANSLATIONS: Translation[] = [
    // Common UI
    { key: 'home', en: 'Home', ar: 'الرئيسية' },
    { key: 'products', en: 'Products', ar: 'المنتجات' },
    { key: 'cart', en: 'Cart', ar: 'السلة' },
    { key: 'checkout', en: 'Checkout', ar: 'الدفع' },
    { key: 'orders', en: 'Orders', ar: 'الطلبات' },
    { key: 'search', en: 'Search', ar: 'بحث' },
    { key: 'add_to_cart', en: 'Add to Cart', ar: 'أضف للسلة' },
    { key: 'buy_now', en: 'Buy Now', ar: 'اشتر الآن' },
    { key: 'view_details', en: 'View Details', ar: 'عرض التفاصيل' },
    { key: 'in_stock', en: 'In Stock', ar: 'متوفر' },
    { key: 'out_of_stock', en: 'Out of Stock', ar: 'غير متوفر' },
    { key: 'price', en: 'Price', ar: 'السعر' },
    { key: 'total', en: 'Total', ar: 'الإجمالي' },
    { key: 'subtotal', en: 'Subtotal', ar: 'المجموع الفرعي' },
    { key: 'quantity', en: 'Quantity', ar: 'الكمية' },

    // Order Status
    { key: 'order_pending', en: 'Pending', ar: 'قيد الانتظار' },
    { key: 'order_processing', en: 'Processing', ar: 'قيد المعالجة' },
    { key: 'order_shipped', en: 'Shipped', ar: 'تم الشحن' },
    { key: 'order_delivered', en: 'Delivered', ar: 'تم التوصيل' },
    { key: 'order_cancelled', en: 'Cancelled', ar: 'ملغي' },

    // Notifications
    { key: 'order_confirmed', en: 'Your order has been confirmed', ar: 'تم تأكيد طلبك' },
    { key: 'order_shipped_msg', en: 'Your order has been shipped', ar: 'تم شحن طلبك' },
    { key: 'order_delivered_msg', en: 'Your order has been delivered', ar: 'تم توصيل طلبك' },
    { key: 'payment_received', en: 'Payment received successfully', ar: 'تم استلام الدفع بنجاح' },

    // Reviews
    { key: 'write_review', en: 'Write a Review', ar: 'اكتب تقييم' },
    { key: 'reviews', en: 'Reviews', ar: 'التقييمات' },
    { key: 'rating', en: 'Rating', ar: 'التصنيف' },

    // Coupons
    { key: 'coupon_code', en: 'Coupon Code', ar: 'كود الخصم' },
    { key: 'apply_coupon', en: 'Apply', ar: 'تطبيق' },
    { key: 'coupon_applied', en: 'Coupon Applied!', ar: 'تم تطبيق الكوبون!' },
    { key: 'invalid_coupon', en: 'Invalid Coupon', ar: 'كوبون غير صالح' },
];

@Injectable()
export class I18nService {
    private readonly logger = new Logger(I18nService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create translations table
     */
    async createTranslationTable(tenantSchema: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_translation" (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        language VARCHAR(10) NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(key, language)
      )
    `);

        // Insert default translations
        for (const t of DEFAULT_TRANSLATIONS) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_translation" (key, language, value)
        VALUES ($1, 'en', $2)
        ON CONFLICT (key, language) DO NOTHING
      `, t.key, t.en);

            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_translation" (key, language, value)
        VALUES ($1, 'ar', $2)
        ON CONFLICT (key, language) DO NOTHING
      `, t.key, t.ar);
        }
    }

    /**
     * Get translation for a key
     */
    async getTranslation(tenantSchema: string, language: string, key: string): Promise<string> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT value FROM "${tenantSchema}"."vendure_translation"
        WHERE key = $1 AND language = $2
      `, key, language);

            return (result as any[])[0]?.value || key;
        } catch (error) {
            return key;
        }
    }

    /**
     * Get all translations for a language
     */
    async getAllTranslations(tenantSchema: string, language: string): Promise<Record<string, string>> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT key, value FROM "${tenantSchema}"."vendure_translation"
        WHERE language = $1
      `, language);

            const translations: Record<string, string> = {};
            (result as any[]).forEach(row => {
                translations[row.key] = row.value;
            });

            return translations;
        } catch (error) {
            return {};
        }
    }

    /**
     * Set translation
     */
    async setTranslation(tenantSchema: string, language: string, key: string, value: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_translation" (key, language, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (key, language) DO UPDATE SET value = $3, updated_at = NOW()
    `, key, language, value);
    }

    /**
     * Translate product
     */
    async translateProduct(tenantSchema: string, productId: number, language: string): Promise<any> {
        const nameKey = `product_${productId}_name`;
        const descKey = `product_${productId}_description`;

        const [name, description] = await Promise.all([
            this.getTranslation(tenantSchema, language, nameKey),
            this.getTranslation(tenantSchema, language, descKey),
        ]);

        return { name, description };
    }

    /**
     * Set product translation
     */
    async setProductTranslation(
        tenantSchema: string,
        productId: number,
        language: string,
        name: string,
        description: string
    ): Promise<void> {
        await this.setTranslation(tenantSchema, language, `product_${productId}_name`, name);
        await this.setTranslation(tenantSchema, language, `product_${productId}_description`, description);
    }
}
