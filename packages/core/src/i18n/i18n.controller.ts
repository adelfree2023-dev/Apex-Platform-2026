/**
 * i18n Controller
 * API endpoints for translations and SMS
 */

import { Controller, Get, Post, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { SmsService } from './sms.service';

@Controller('api/shop')
export class I18nController {
    constructor(
        private readonly i18nService: I18nService,
        private readonly smsService: SmsService,
    ) { }

    /**
     * Migrate i18n tables
     */
    @Post(':tenantId/migrate-i18n')
    async migrateI18n(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.i18nService.createTranslationTable(tenantSchema);
            await this.smsService.createSmsTable(tenantSchema);
            return {
                success: true,
                message: 'Translation and SMS tables created with default data',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== TRANSLATION ENDPOINTS ====================

    /**
     * Get single translation
     */
    @Get(':tenantId/i18n/translate')
    async getTranslation(
        @Param('tenantId') tenantId: string,
        @Query('key') key: string,
        @Query('lang') lang: string = 'en',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!key) {
            throw new HttpException('Key is required', HttpStatus.BAD_REQUEST);
        }

        const value = await this.i18nService.getTranslation(tenantSchema, lang, key);
        return {
            success: true,
            key,
            language: lang,
            value,
        };
    }

    /**
     * Get all translations for a language
     */
    @Get(':tenantId/i18n/translations')
    async getAllTranslations(
        @Param('tenantId') tenantId: string,
        @Query('lang') lang: string = 'en',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const translations = await this.i18nService.getAllTranslations(tenantSchema, lang);
            return {
                success: true,
                language: lang,
                data: translations,
                count: Object.keys(translations).length,
            };
        } catch (error) {
            return { success: true, language: lang, data: {}, count: 0 };
        }
    }

    /**
     * Set translation
     */
    @Post(':tenantId/i18n/translate')
    async setTranslation(
        @Param('tenantId') tenantId: string,
        @Body() body: { key: string; lang: string; value: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.key || !body.lang || !body.value) {
            throw new HttpException('Key, lang, and value are required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.i18nService.setTranslation(tenantSchema, body.lang, body.key, body.value);
            return {
                success: true,
                message: 'Translation saved',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to save translation: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Translate product
     */
    @Get(':tenantId/products/:productId/translations')
    async getProductTranslation(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
        @Query('lang') lang: string = 'en',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const translation = await this.i18nService.translateProduct(
                tenantSchema,
                parseInt(productId, 10),
                lang,
            );
            return {
                success: true,
                productId: parseInt(productId, 10),
                language: lang,
                data: translation,
            };
        } catch (error) {
            return { success: true, data: {} };
        }
    }

    /**
     * Set product translation
     */
    @Post(':tenantId/products/:productId/translations')
    async setProductTranslation(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
        @Body() body: { lang: string; name: string; description: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.lang || !body.name) {
            throw new HttpException('Lang and name are required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.i18nService.setProductTranslation(
                tenantSchema,
                parseInt(productId, 10),
                body.lang,
                body.name,
                body.description || '',
            );
            return {
                success: true,
                message: 'Product translation saved',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to save product translation: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SMS ENDPOINTS ====================

    /**
     * Send SMS
     */
    @Post(':tenantId/sms/send')
    async sendSms(
        @Param('tenantId') tenantId: string,
        @Body() body: { phone: string; message: string; customerId?: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.phone || !body.message) {
            throw new HttpException('Phone and message are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.smsService.sendSms(
                tenantSchema,
                { to: body.phone, message: body.message },
                body.customerId,
            );
            return {
                success: true,
                data: result,
                message: 'SMS sent successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to send SMS: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Send templated SMS
     */
    @Post(':tenantId/sms/send-template')
    async sendTemplatedSms(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            phone: string;
            template: string;
            variables: Record<string, string>;
            lang?: string;
            customerId?: number;
        },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.phone || !body.template) {
            throw new HttpException('Phone and template are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.smsService.sendTemplatedSms(
                tenantSchema,
                body.phone,
                body.template,
                body.variables || {},
                body.lang || 'en',
                body.customerId,
            );
            return {
                success: true,
                data: result,
                message: 'SMS sent successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to send SMS: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get SMS templates
     */
    @Get(':tenantId/sms/templates')
    async getSmsTemplates(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const templates = await this.smsService.getTemplates(tenantSchema);
            return {
                success: true,
                data: templates,
                count: templates.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get customer SMS history
     */
    @Get(':tenantId/customers/:customerId/sms')
    async getCustomerSmsHistory(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const history = await this.smsService.getSmsHistory(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: history,
                count: history.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }
}
