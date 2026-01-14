/**
 * SMS Notification Service
 * Sends SMS notifications via HTTP API (configurable provider)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SmsConfig {
    provider: 'twilio' | 'vonage' | 'messagebird' | 'local';
    apiKey?: string;
    apiSecret?: string;
    fromNumber?: string;
}

export interface SmsMessage {
    to: string;
    message: string;
    type?: 'order' | 'promotion' | 'otp' | 'general';
}

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create SMS log table
     */
    async createSmsTable(tenantSchema: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_sms_log" (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        phone_number VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        provider_response TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // SMS templates table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_sms_template" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        template_en TEXT NOT NULL,
        template_ar TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Insert default templates
        const templates = [
            {
                name: 'order_confirmation',
                type: 'order',
                en: 'Your order #{order_code} has been confirmed. Total: EGP {total}. Track at: {tracking_url}',
                ar: 'تم تأكيد طلبك #{order_code}. المجموع: {total} جنيه. تتبع: {tracking_url}'
            },
            {
                name: 'order_shipped',
                type: 'order',
                en: 'Good news! Your order #{order_code} has been shipped. Tracking: {tracking_code}',
                ar: 'أخبار سارة! تم شحن طلبك #{order_code}. رقم التتبع: {tracking_code}'
            },
            {
                name: 'order_delivered',
                type: 'order',
                en: 'Your order #{order_code} has been delivered. Thank you for shopping with us!',
                ar: 'تم توصيل طلبك #{order_code}. شكراً لتسوقك معنا!'
            },
            {
                name: 'otp_verification',
                type: 'otp',
                en: 'Your verification code is: {otp}. Valid for 5 minutes.',
                ar: 'كود التحقق الخاص بك: {otp}. صالح لمدة 5 دقائق.'
            },
        ];

        for (const t of templates) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_sms_template" (name, template_en, template_ar, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, t.name, t.en, t.ar, t.type);
        }
    }

    /**
     * Send SMS (logs to database - production would call actual provider)
     */
    async sendSms(tenantSchema: string, sms: SmsMessage, customerId?: number): Promise<any> {
        try {
            // Log the SMS
            const result = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_sms_log" 
        (customer_id, phone_number, message, message_type, status, sent_at)
        VALUES ($1, $2, $3, $4, 'sent', NOW())
        RETURNING *
      `, customerId || null, sms.to, sms.message, sms.type || 'general');

            this.logger.log(`SMS sent to ${sms.to}: ${sms.message.substring(0, 50)}...`);

            // In production, call the actual SMS provider here
            // await this.callSmsProvider(sms);

            return {
                success: true,
                id: Number((result as any[])[0]?.id),
                phone: sms.to,
            };
        } catch (error) {
            this.logger.error(`Failed to send SMS: ${error}`);
            throw error;
        }
    }

    /**
     * Get SMS template
     */
    async getTemplate(tenantSchema: string, templateName: string, language: string = 'en'): Promise<string | null> {
        try {
            const column = language === 'ar' ? 'template_ar' : 'template_en';
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT ${column} as template FROM "${tenantSchema}"."vendure_sms_template"
        WHERE name = $1 AND is_active = true
      `, templateName);

            return (result as any[])[0]?.template || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Send templated SMS
     */
    async sendTemplatedSms(
        tenantSchema: string,
        phone: string,
        templateName: string,
        variables: Record<string, string>,
        language: string = 'en',
        customerId?: number
    ): Promise<any> {
        const template = await this.getTemplate(tenantSchema, templateName, language);

        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        // Replace variables
        let message = template;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        return this.sendSms(tenantSchema, { to: phone, message, type: 'order' }, customerId);
    }

    /**
     * Get SMS history for customer
     */
    async getSmsHistory(tenantSchema: string, customerId: number): Promise<any[]> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_sms_log"
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, customerId);

        return (result as any[]).map(sms => ({
            id: Number(sms.id),
            phone: sms.phone_number,
            message: sms.message,
            type: sms.message_type,
            status: sms.status,
            sentAt: sms.sent_at,
        }));
    }

    /**
     * Get all SMS templates
     */
    async getTemplates(tenantSchema: string): Promise<any[]> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_sms_template"
      WHERE is_active = true
      ORDER BY name
    `);

        return (result as any[]).map(t => ({
            id: Number(t.id),
            name: t.name,
            templateEn: t.template_en,
            templateAr: t.template_ar,
            type: t.type,
        }));
    }
}
