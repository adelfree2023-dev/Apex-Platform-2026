/**
 * Auth Controller Unit Tests
 * Covers: Email, Social Login, Sessions, Password Reset
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { EmailService } from './email.service';
import { SocialAuthService } from './social-auth.service';

describe('AuthController', () => {
    let controller: AuthController;

    const mockEmailService = {
        createEmailTables: jest.fn(),
        sendEmail: jest.fn(),
        sendTemplatedEmail: jest.fn(),
        getTemplates: jest.fn(),
        getEmailHistory: jest.fn(),
    };

    const mockSocialAuthService = {
        createSocialAuthTables: jest.fn(),
        findOrCreateBySocialLogin: jest.fn(),
        createSession: jest.fn(),
        validateSession: jest.fn(),
        logout: jest.fn(),
        createPasswordResetToken: jest.fn(),
        validateResetToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: EmailService, useValue: mockEmailService },
                { provide: SocialAuthService, useValue: mockSocialAuthService },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateAuth', () => {
        it('should create auth tables for tenant', async () => {
            mockEmailService.createEmailTables.mockResolvedValue(undefined);
            mockSocialAuthService.createSocialAuthTables.mockResolvedValue(undefined);

            const result = await controller.migrateAuth('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Email and auth tables created');
            expect(mockEmailService.createEmailTables).toHaveBeenCalledWith('tenant_test_store');
            expect(mockSocialAuthService.createSocialAuthTables).toHaveBeenCalledWith('tenant_test_store');
        });

        it('should handle migration errors', async () => {
            mockEmailService.createEmailTables.mockRejectedValue(new Error('Database error'));

            await expect(controller.migrateAuth('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== EMAIL ====================

    describe('sendEmail', () => {
        it('should send email successfully', async () => {
            const emailResult = { id: 1, status: 'sent' };
            mockEmailService.sendEmail.mockResolvedValue(emailResult);

            const result = await controller.sendEmail('test-store', {
                to: 'user@test.com',
                subject: 'Test Subject',
                html: '<p>Hello</p>',
            });

            expect(result.success).toBe(true);
            expect(result.data.id).toBe(1);
            expect(result.message).toBe('Email sent successfully');
        });

        it('should reject without required fields', async () => {
            await expect(controller.sendEmail('test-store', {
                to: '',
                subject: '',
                html: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('sendTemplatedEmail', () => {
        it('should send templated email successfully', async () => {
            mockEmailService.sendTemplatedEmail.mockResolvedValue({ id: 2 });

            const result = await controller.sendTemplatedEmail('test-store', {
                to: 'user@test.com',
                template: 'order-confirmation',
                variables: { orderId: 'ORD-001' },
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Email sent successfully');
        });

        it('should reject without template name', async () => {
            await expect(controller.sendTemplatedEmail('test-store', {
                to: 'user@test.com',
                template: '',
                variables: {},
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getEmailTemplates', () => {
        it('should return all templates', async () => {
            const templates = [
                { name: 'welcome', language: 'en' },
                { name: 'order-confirmation', language: 'en' },
            ];
            mockEmailService.getTemplates.mockResolvedValue(templates);

            const result = await controller.getEmailTemplates('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('getCustomerEmailHistory', () => {
        it('should return email history for customer', async () => {
            const history = [{ id: 1, subject: 'Welcome' }];
            mockEmailService.getEmailHistory.mockResolvedValue(history);

            const result = await controller.getCustomerEmailHistory('test-store', '123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    // ==================== SOCIAL LOGIN ====================

    describe('socialLogin', () => {
        const mockSocialUser = {
            provider: 'google' as const,
            providerId: 'google-123',
            email: 'user@gmail.com',
            firstName: 'Test',
            lastName: 'User',
        };

        it('should login with social account and return session', async () => {
            mockSocialAuthService.findOrCreateBySocialLogin.mockResolvedValue({
                customerId: 1,
                email: 'user@gmail.com',
                isNew: false,
            });
            mockSocialAuthService.createSession.mockResolvedValue('session-token-123');

            const result = await controller.socialLogin(
                'test-store',
                mockSocialUser,
                'Chrome/Windows',
                '192.168.1.1',
            );

            expect(result.success).toBe(true);
            expect(result.data.sessionToken).toBe('session-token-123');
            expect(result.data.customerId).toBe(1);
            expect(result.message).toBe('Login successful');
        });

        it('should create new customer on first social login', async () => {
            mockSocialAuthService.findOrCreateBySocialLogin.mockResolvedValue({
                customerId: 5,
                email: 'new@gmail.com',
                isNew: true,
            });
            mockSocialAuthService.createSession.mockResolvedValue('new-session-token');

            const result = await controller.socialLogin('test-store', mockSocialUser);

            expect(result.message).toBe('Account created successfully');
        });

        it('should reject without provider', async () => {
            await expect(controller.socialLogin('test-store', {
                provider: '' as any,
                providerId: '123',
                email: 'test@test.com',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== SESSION MANAGEMENT ====================

    describe('validateSession', () => {
        it('should return success for valid session', async () => {
            mockSocialAuthService.validateSession.mockResolvedValue({
                customer_id: 100,
                expires_at: new Date(Date.now() + 3600000),
            });

            const result = await controller.validateSession('test-store', 'Bearer session-token');

            expect(result.success).toBe(true);
            expect(result.data.customer_id).toBe(100);
        });

        it('should return success false for missing auth header', async () => {
            const result = await controller.validateSession('test-store', undefined);

            expect(result.success).toBe(false);
            expect(result.message).toBe('No session token provided');
        });

        it('should return success based on session existence', async () => {
            mockSocialAuthService.validateSession.mockResolvedValue(null);

            const result = await controller.validateSession('test-store', 'Bearer invalid-token');

            expect(result.success).toBe(false);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            mockSocialAuthService.logout.mockResolvedValue(undefined);

            const result = await controller.logout('test-store', 'Bearer session-token');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Logged out successfully');
            expect(mockSocialAuthService.logout).toHaveBeenCalled();
        });

        it('should throw error for missing auth header', async () => {
            await expect(controller.logout('test-store', undefined))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== PASSWORD RESET ====================

    describe('forgotPassword', () => {
        it('should create reset token for existing email', async () => {
            mockSocialAuthService.createPasswordResetToken.mockResolvedValue('reset-token-123');

            const result = await controller.forgotPassword('test-store', {
                email: 'user@test.com',
            });

            expect(result.success).toBe(true);
        });

        it('should return success even for non-existent email (security)', async () => {
            mockSocialAuthService.createPasswordResetToken.mockResolvedValue(null);

            const result = await controller.forgotPassword('test-store', {
                email: 'nonexistent@test.com',
            });

            expect(result.success).toBe(true);
        });

        it('should reject without email', async () => {
            await expect(controller.forgotPassword('test-store', {
                email: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('validateResetToken', () => {
        it('should return valid for correct token', async () => {
            mockSocialAuthService.validateResetToken.mockResolvedValue(123);

            const result = await controller.validateResetToken('test-store', 'valid-token');

            expect(result.success).toBe(true);
            expect(result.valid).toBe(true);
        });

        it('should return invalid for expired token', async () => {
            mockSocialAuthService.validateResetToken.mockResolvedValue(null);

            const result = await controller.validateResetToken('test-store', 'expired-token');

            expect(result.success).toBe(false);
            expect(result.valid).toBe(false);
        });
    });
});
