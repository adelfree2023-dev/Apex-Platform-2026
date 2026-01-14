/**
 * Auth Controller
 * API endpoints for authentication, email, and social login
 */

import { Controller, Get, Post, Delete, Param, Query, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';
import { SocialAuthService, SocialUser } from './social-auth.service';

@Controller('api/shop')
export class AuthController {
    constructor(
        private readonly emailService: EmailService,
        private readonly socialAuthService: SocialAuthService,
    ) { }

    /**
     * Migrate auth tables
     */
    @Post(':tenantId/migrate-auth')
    async migrateAuth(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.emailService.createEmailTables(tenantSchema);
            await this.socialAuthService.createSocialAuthTables(tenantSchema);
            return {
                success: true,
                message: 'Email and auth tables created with default email templates',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== EMAIL ENDPOINTS ====================

    /**
     * Send email
     */
    @Post(':tenantId/email/send')
    async sendEmail(
        @Param('tenantId') tenantId: string,
        @Body() body: { to: string; subject: string; html: string; customerId?: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.to || !body.subject || !body.html) {
            throw new HttpException('To, subject, and html are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.emailService.sendEmail(
                tenantSchema,
                { to: body.to, subject: body.subject, html: body.html },
                body.customerId,
            );
            return {
                success: true,
                data: result,
                message: 'Email sent successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to send email: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Send templated email
     */
    @Post(':tenantId/email/send-template')
    async sendTemplatedEmail(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            to: string;
            template: string;
            variables: Record<string, string>;
            lang?: string;
            customerId?: number;
        },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.to || !body.template) {
            throw new HttpException('To and template are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.emailService.sendTemplatedEmail(
                tenantSchema,
                body.to,
                body.template,
                body.variables || {},
                body.lang || 'en',
                body.customerId,
            );
            return {
                success: true,
                data: result,
                message: 'Email sent successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to send email: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get email templates
     */
    @Get(':tenantId/email/templates')
    async getEmailTemplates(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const templates = await this.emailService.getTemplates(tenantSchema);
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
     * Get customer email history
     */
    @Get(':tenantId/customers/:customerId/emails')
    async getCustomerEmailHistory(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const history = await this.emailService.getEmailHistory(
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

    // ==================== SOCIAL LOGIN ENDPOINTS ====================

    /**
     * Social login callback
     */
    @Post(':tenantId/auth/social')
    async socialLogin(
        @Param('tenantId') tenantId: string,
        @Body() body: SocialUser,
        @Headers('x-device-info') deviceInfo?: string,
        @Headers('x-forwarded-for') ipAddress?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.provider || !body.providerId || !body.email) {
            throw new HttpException('Provider, providerId, and email are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const customer = await this.socialAuthService.findOrCreateBySocialLogin(tenantSchema, body);
            const sessionToken = await this.socialAuthService.createSession(
                tenantSchema,
                customer.customerId,
                deviceInfo,
                ipAddress,
            );

            return {
                success: true,
                data: {
                    ...customer,
                    sessionToken,
                },
                message: customer.isNew ? 'Account created successfully' : 'Login successful',
            };
        } catch (error) {
            throw new HttpException(
                `Social login failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Validate session
     */
    @Get(':tenantId/auth/session')
    async validateSession(
        @Param('tenantId') tenantId: string,
        @Headers('authorization') auth?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const sessionToken = auth?.replace('Bearer ', '');
        if (!sessionToken) {
            return { success: false, message: 'No session token provided' };
        }

        try {
            const session = await this.socialAuthService.validateSession(tenantSchema, sessionToken);
            return {
                success: !!session,
                data: session,
            };
        } catch (error) {
            return { success: false, message: 'Invalid session' };
        }
    }

    /**
     * Logout
     */
    @Delete(':tenantId/auth/session')
    async logout(
        @Param('tenantId') tenantId: string,
        @Headers('authorization') auth?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        const sessionToken = auth?.replace('Bearer ', '');
        if (!sessionToken) {
            throw new HttpException('No session token provided', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.socialAuthService.logout(tenantSchema, sessionToken);
            return {
                success: true,
                message: 'Logged out successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Logout failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Request password reset
     */
    @Post(':tenantId/auth/forgot-password')
    async forgotPassword(
        @Param('tenantId') tenantId: string,
        @Body() body: { email: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.email) {
            throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const token = await this.socialAuthService.createPasswordResetToken(tenantSchema, body.email);

            if (token) {
                // Send reset email
                await this.emailService.sendTemplatedEmail(
                    tenantSchema,
                    body.email,
                    'password_reset',
                    { reset_url: `https://store.example.com/reset-password?token=${token}` },
                );
            }

            // Always return success (don't reveal if email exists)
            return {
                success: true,
                message: 'If the email exists, a reset link has been sent',
            };
        } catch (error) {
            return {
                success: true,
                message: 'If the email exists, a reset link has been sent',
            };
        }
    }

    /**
     * Validate reset token
     */
    @Get(':tenantId/auth/reset-password')
    async validateResetToken(
        @Param('tenantId') tenantId: string,
        @Query('token') token: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!token) {
            throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
        }

        const customerId = await this.socialAuthService.validateResetToken(tenantSchema, token);
        return {
            success: !!customerId,
            valid: !!customerId,
        };
    }
}
