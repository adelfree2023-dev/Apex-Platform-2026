/**
 * Email Notification Service
 * Sends emails with templates for orders, promotions, etc.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailMessage {
    to: string;
    subject: string;
    template?: string;
    html?: string;
    variables?: Record<string, string>;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create email tables
     */
    async createEmailTables(tenantSchema: string): Promise<void> {
        // Email log table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_email_log" (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        template_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Email templates table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_email_template" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject_en VARCHAR(500) NOT NULL,
        subject_ar VARCHAR(500) NOT NULL,
        body_en TEXT NOT NULL,
        body_ar TEXT NOT NULL,
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
                subject_en: 'Order Confirmed - #{order_code}',
                subject_ar: 'تم تأكيد طلبك - #{order_code}',
                body_en: `
          <h1>Thank you for your order!</h1>
          <p>Your order <strong>#{order_code}</strong> has been confirmed.</p>
          <p>Total: <strong>EGP {total}</strong></p>
          <p>We'll send you an update when it ships.</p>
        `,
                body_ar: `
          <h1>شكراً لطلبك!</h1>
          <p>تم تأكيد طلبك <strong>#{order_code}</strong>.</p>
          <p>المجموع: <strong>{total} جنيه</strong></p>
          <p>سنرسل لك تحديثاً عند الشحن.</p>
        `,
            },
            {
                name: 'order_shipped',
                type: 'order',
                subject_en: 'Your Order Has Been Shipped - #{order_code}',
                subject_ar: 'تم شحن طلبك - #{order_code}',
                body_en: `
          <h1>Good news!</h1>
          <p>Your order <strong>#{order_code}</strong> is on its way.</p>
          <p>Tracking Code: <strong>{tracking_code}</strong></p>
          <p>Carrier: {carrier}</p>
        `,
                body_ar: `
          <h1>أخبار سارة!</h1>
          <p>طلبك <strong>#{order_code}</strong> في الطريق.</p>
          <p>رقم التتبع: <strong>{tracking_code}</strong></p>
          <p>شركة الشحن: {carrier}</p>
        `,
            },
            {
                name: 'welcome',
                type: 'auth',
                subject_en: 'Welcome to {store_name}!',
                subject_ar: 'أهلاً بك في {store_name}!',
                body_en: `
          <h1>Welcome, {first_name}!</h1>
          <p>Thank you for joining us. Start shopping and enjoy exclusive deals.</p>
          <a href="{store_url}">Start Shopping</a>
        `,
                body_ar: `
          <h1>أهلاً بك، {first_name}!</h1>
          <p>شكراً لانضمامك إلينا. ابدأ التسوق واستمتع بالعروض الحصرية.</p>
          <a href="{store_url}">ابدأ التسوق</a>
        `,
            },
            {
                name: 'password_reset',
                type: 'auth',
                subject_en: 'Reset Your Password',
                subject_ar: 'إعادة تعيين كلمة المرور',
                body_en: `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <a href="{reset_url}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
        `,
                body_ar: `
          <h1>إعادة تعيين كلمة المرور</h1>
          <p>انقر على الرابط لإعادة تعيين كلمة المرور:</p>
          <a href="{reset_url}">إعادة التعيين</a>
          <p>هذا الرابط صالح لمدة ساعة واحدة.</p>
        `,
            },
        ];

        for (const t of templates) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_email_template" 
        (name, subject_en, subject_ar, body_en, body_ar, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO NOTHING
      `, t.name, t.subject_en, t.subject_ar, t.body_en, t.body_ar, t.type);
        }
    }

    /**
     * Send email (logs to database)
     */
    async sendEmail(tenantSchema: string, email: EmailMessage, customerId?: number): Promise<any> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_email_log" 
        (customer_id, email, subject, body, template_name, status, sent_at)
        VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
        RETURNING *
      `,
                customerId || null,
                email.to,
                email.subject,
                email.html || '',
                email.template || null
            );

            this.logger.log(`Email sent to ${email.to}: ${email.subject}`);

            // In production, call actual email provider here (SendGrid, AWS SES, etc.)
            // await this.callEmailProvider(email);

            return {
                success: true,
                id: Number((result as any[])[0]?.id),
                email: email.to,
            };
        } catch (error) {
            this.logger.error(`Failed to send email: ${error}`);
            throw error;
        }
    }

    /**
     * Get email template
     */
    async getTemplate(tenantSchema: string, templateName: string, language: string = 'en'): Promise<{ subject: string; body: string } | null> {
        try {
            const subjectCol = language === 'ar' ? 'subject_ar' : 'subject_en';
            const bodyCol = language === 'ar' ? 'body_ar' : 'body_en';

            const result = await this.prisma.$queryRawUnsafe(`
        SELECT ${subjectCol} as subject, ${bodyCol} as body 
        FROM "${tenantSchema}"."vendure_email_template"
        WHERE name = $1 AND is_active = true
      `, templateName);

            const row = (result as any[])[0];
            return row ? { subject: row.subject, body: row.body } : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Send templated email
     */
    async sendTemplatedEmail(
        tenantSchema: string,
        to: string,
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
        let subject = template.subject;
        let body = template.body;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        }

        return this.sendEmail(tenantSchema, { to, subject, html: body, template: templateName }, customerId);
    }

    /**
     * Get email history
     */
    async getEmailHistory(tenantSchema: string, customerId: number): Promise<any[]> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_email_log"
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, customerId);

        return (result as any[]).map(e => ({
            id: Number(e.id),
            email: e.email,
            subject: e.subject,
            status: e.status,
            sentAt: e.sent_at,
        }));
    }

    /**
     * Get all templates
     */
    async getTemplates(tenantSchema: string): Promise<any[]> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_email_template"
      WHERE is_active = true
      ORDER BY name
    `);

        return (result as any[]).map(t => ({
            id: Number(t.id),
            name: t.name,
            subjectEn: t.subject_en,
            subjectAr: t.subject_ar,
            type: t.type,
        }));
    }
}
