/**
 * Auth Controller
 * API endpoints for authentication, email, and social login
 */

import { Controller, Get, Post, Delete, Param, Query, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SocialAuthService, SocialUser } from './social-auth.service';

@ApiTags('auth')
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
    @ApiOperation({ summary: 'Migrate Authentication Tables', description: 'Creates email and auth tables for tenant' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Migration successful' })
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
    @ApiOperation({ summary: 'Send Email', description: 'Send a custom email to a recipient' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                to: { type: 'string', example: 'customer@example.com' },
                subject: { type: 'string', example: 'Order Confirmation' },
                html: { type: 'string', example: '<h1>Thank you for your order</h1>' },
                customerId: { type: 'number', example: 123 },
            },
            required: ['to', 'subject', 'html'],
        },
    })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
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
    @ApiOperation({ summary: 'Send Templated Email', description: 'Send an email using a pre-defined template' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
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
    @ApiOperation({ summary: 'Get Email Templates', description: 'Retrieve all email templates for tenant' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Templates retrieved' })
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
    @ApiOperation({ summary: 'Get Customer Email History', description: 'Retrieve email history for a customer' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiParam({ name: 'customerId', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Email history retrieved' })
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
    @ApiOperation({ summary: 'Social Login', description: 'Authenticate user via social provider (Google, Facebook, Apple)' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiHeader({ name: 'x-device-info', description: 'Device information', required: false })
    @ApiHeader({ name: 'x-forwarded-for', description: 'Client IP address', required: false })
    @ApiResponse({ status: 200, description: 'Login successful' })
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Validate Session', description: 'Check if session token is valid' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Session valid' })
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout', description: 'Invalidate session token' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
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
    @ApiOperation({ summary: 'Forgot Password', description: 'Request password reset email' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: { email: { type: 'string', example: 'user@example.com' } },
            required: ['email'],
        },
    })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
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
                await this.emailService.sendTemplatedEmail(
                    tenantSchema,
                    body.email,
                    'password_reset',
                    { reset_url: `https://store.example.com/reset-password?token=${token}` },
                );
            }

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
    @ApiOperation({ summary: 'Validate Reset Token', description: 'Check if password reset token is valid' })
    @ApiParam({ name: 'tenantId', description: 'Tenant identifier' })
    @ApiResponse({ status: 200, description: 'Token validation result' })
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
