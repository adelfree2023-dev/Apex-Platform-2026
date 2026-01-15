/**
 * Email Service Unit Tests
 * Covers: Email sending, templates, history
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmailService, EmailMessage } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmailService', () => {
    let service: EmailService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    const mockEmailMessage: EmailMessage = {
        to: 'customer@test.com',
        subject: 'Order Confirmation',
        template: 'order-confirmation',
        variables: {
            orderNumber: 'ORD-001',
            totalAmount: '150.00',
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EmailService>(EmailService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== TABLE CREATION ====================

    describe('createEmailTables', () => {
        it('should create email and template tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createEmailTables('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    // ==================== SEND EMAIL ====================

    describe('sendEmail', () => {
        it('should log email to database', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            const result = await service.sendEmail('tenant_test', mockEmailMessage, 123);

            expect(result.id).toBe(1);
            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
        });

        it('should send email without customer id', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 2 }]);

            const result = await service.sendEmail('tenant_test', mockEmailMessage);

            expect(result.id).toBe(2);
        });

        it('should handle HTML content', async () => {
            const htmlEmail: EmailMessage = {
                to: 'user@test.com',
                subject: 'Welcome',
                html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
            };
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 3 }]);

            const result = await service.sendEmail('tenant_test', htmlEmail);

            expect(result.id).toBe(3);
        });
    });

    // ==================== TEMPLATES ====================

    describe('getTemplate', () => {
        it('should return template by name', async () => {
            const template = { subject: 'Hello {{name}}', body: '<p>Welcome {{name}}!</p>' };
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([template]);

            const result = await service.getTemplate('tenant_test', 'welcome', 'en');

            expect(result!.subject).toBe('Hello {{name}}');
            expect(result!.body).toContain('Welcome');
        });

        it('should return null for non-existent template', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getTemplate('tenant_test', 'nonexistent', 'en');

            expect(result).toBeNull();
        });

        it('should support different languages', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ subject: 'مرحبا', body: '<p>أهلا بك</p>' }]);

            const result = await service.getTemplate('tenant_test', 'welcome', 'ar');

            expect(result!.subject).toBe('مرحبا');
        });
    });

    describe('sendTemplatedEmail', () => {
        it('should send email using template', async () => {
            const template = { subject: 'Order {{orderId}} Confirmed', body: '<p>Your order {{orderId}} is confirmed.</p>' };
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([template]) // getTemplate
                .mockResolvedValueOnce([{ id: 1 }]); // sendEmail

            const result = await service.sendTemplatedEmail(
                'tenant_test',
                'user@test.com',
                'order-confirmation',
                { orderId: 'ORD-123' },
                'en',
                100
            );

            expect(result.id).toBe(1);
        });

        it('should throw if template not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.sendTemplatedEmail(
                'tenant_test',
                'user@test.com',
                'nonexistent-template',
                {},
            )).rejects.toThrow();
        });
    });

    describe('getTemplates', () => {
        it('should return all templates', async () => {
            const templates = [
                { name: 'welcome', language: 'en' },
                { name: 'order-confirmation', language: 'en' },
            ];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(templates);

            const result = await service.getTemplates('tenant_test');

            expect(result).toHaveLength(2);
        });
    });

    // ==================== EMAIL HISTORY ====================

    describe('getEmailHistory', () => {
        it('should return email history for customer', async () => {
            const history = [
                { id: 1, subject: 'Welcome', sent_at: new Date() },
                { id: 2, subject: 'Order Shipped', sent_at: new Date() },
            ];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(history);

            const result = await service.getEmailHistory('tenant_test', 123);

            expect(result).toHaveLength(2);
            expect(result[0].subject).toBe('Welcome');
        });

        it('should return empty array for customer with no emails', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getEmailHistory('tenant_test', 999);

            expect(result).toEqual([]);
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases', () => {
        it('should handle email with all optional fields', async () => {
            const fullEmail: EmailMessage = {
                to: 'full@test.com',
                subject: 'Full Email',
                template: 'custom',
                html: '<p>HTML</p>',
                variables: { key: 'value' },
            };
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            const result = await service.sendEmail('tenant_test', fullEmail);
            expect(result).toBeDefined();
        });

        it('should handle special characters in email content', async () => {
            const email: EmailMessage = {
                to: 'user@test.com',
                subject: 'Special: <script> & "quotes"',
                html: '<p>Content with & < > " characters</p>',
            };
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            const result = await service.sendEmail('tenant_test', email);
            expect(result).toBeDefined();
        });
    });
});
