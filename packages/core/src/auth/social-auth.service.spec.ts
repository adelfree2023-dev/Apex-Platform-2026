/**
 * Social Auth Service Unit Tests
 * Covers: Social login, sessions, password reset, security
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SocialAuthService, SocialUser } from './social-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SocialAuthService', () => {
    let service: SocialAuthService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    const mockSocialUser: SocialUser = {
        provider: 'google',
        providerId: 'google-123456',
        email: 'user@gmail.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://photo.url/avatar.jpg',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SocialAuthService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SocialAuthService>(SocialAuthService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== TABLE CREATION ====================

    describe('createSocialAuthTables', () => {
        it('should create all social auth tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createSocialAuthTables('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });

        // Note: validateTenantSchema validation happens inside the method
        // but only logs a warning for invalid schemas in this implementation
    });

    // ==================== SOCIAL LOGIN ====================

    describe('findOrCreateBySocialLogin', () => {
        it('should return existing account if social login exists', async () => {
            const existingAccount = [{
                customer_id: 1,
                customer_email: 'user@gmail.com',
                first_name: 'Test'
            }];
            mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce(existingAccount);

            const result = await service.findOrCreateBySocialLogin('tenant_test', mockSocialUser);

            expect(result.customerId).toBe(1);
            expect(result.isNew).toBe(false);
        });

        it('should create new customer if social account not found', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing social account
                .mockResolvedValueOnce([]) // No existing customer
                .mockResolvedValueOnce([{ id: 5 }]); // New customer created
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.findOrCreateBySocialLogin('tenant_test', mockSocialUser);

            expect(result.customerId).toBe(5);
            expect(result.isNew).toBe(true);
        });

        it('should link to existing customer if email exists', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing social account
                .mockResolvedValueOnce([{ id: 10 }]); // Existing customer by email
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.findOrCreateBySocialLogin('tenant_test', mockSocialUser);

            expect(result.customerId).toBe(10);
            expect(result.isNew).toBe(true); // isNew because social link is new
        });

        it('should handle all social providers', async () => {
            const providers: Array<'google' | 'facebook' | 'apple'> = ['google', 'facebook', 'apple'];

            for (const provider of providers) {
                const socialUser: SocialUser = { ...mockSocialUser, provider };
                mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ customer_id: 1, customer_email: 'test@test.com' }]);

                const result = await service.findOrCreateBySocialLogin('tenant_test', socialUser);
                expect(result).toBeDefined();
            }
        });
    });

    // ==================== SESSION MANAGEMENT ====================

    describe('createSession', () => {
        it('should create a session and return token', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const token = await service.createSession('tenant_test', 1, 'Chrome/Windows', '192.168.1.1');

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(20);
        });

        it('should work without optional parameters', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const token = await service.createSession('tenant_test', 1);

            expect(token).toBeDefined();
        });
    });

    describe('validateSession', () => {
        it('should return session data for valid token', async () => {
            // Mock returns raw DB data with customer_id, service transforms to customerId
            const sessionData = [{ id: 1, customer_id: 100, email: 'test@test.com', first_name: 'Test', expires_at: new Date(Date.now() + 3600000) }];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(sessionData);

            const result = await service.validateSession('tenant_test', 'valid-token');

            expect(result).toBeDefined();
            expect(result!.customerId).toBe(100); // Service returns customerId, not customer_id
        });

        it('should return null for invalid session', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.validateSession('tenant_test', 'invalid-token');

            expect(result).toBeNull();
        });
    });

    describe('logout', () => {
        it('should delete the session', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logout('tenant_test', 'session-token');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('DELETE'),
                'session-token'
            );
        });
    });

    // ==================== PASSWORD RESET ====================

    describe('createPasswordResetToken', () => {
        it('should create token for existing email', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const token = await service.createPasswordResetToken('tenant_test', 'user@test.com');

            expect(token).toBeDefined();
            expect(token!.length).toBeGreaterThan(20);
        });

        it('should return null for non-existent email', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const token = await service.createPasswordResetToken('tenant_test', 'nonexistent@test.com');

            expect(token).toBeNull();
        });
    });

    describe('validateResetToken', () => {
        it('should return customer id for valid token', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ customer_id: 123 }]);

            const customerId = await service.validateResetToken('tenant_test', 'valid-reset-token');

            expect(customerId).toBe(123);
        });

        it('should return null for invalid token', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const customerId = await service.validateResetToken('tenant_test', 'invalid-token');

            expect(customerId).toBeNull();
        });
    });

    describe('useResetToken', () => {
        it('should mark token as used', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.useResetToken('tenant_test', 'reset-token');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE'),
                'reset-token'
            );
        });
    });

    // ==================== SECURITY (via public methods) ====================

    describe('Security (via public methods)', () => {
        it('should generate unique session tokens via createSession', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const token1 = await service.createSession('tenant_test', 1);
            const token2 = await service.createSession('tenant_test', 1);

            expect(token1).not.toBe(token2);
            expect(token1.length).toBeGreaterThan(20);
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases', () => {
        it('should handle social user without optional fields', async () => {
            const minimalUser: SocialUser = {
                provider: 'apple',
                providerId: 'apple-id',
                email: 'user@icloud.com',
            };
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ customer_id: 1, customer_email: 'user@icloud.com' }]);

            const result = await service.findOrCreateBySocialLogin('tenant_test', minimalUser);
            expect(result).toBeDefined();
        });
    });
});
