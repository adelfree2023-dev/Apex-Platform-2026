/**
 * Audit Service Unit Tests
 * Root-analyzed: Uses PrismaService with $executeRawUnsafe, $queryRawUnsafe
 * Methods: createAuditTable, log, logLogin, logPasswordChange, logAdminAction, logSecurityEvent, getAuditLogs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
    let service: AuditService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        jest.clearAllMocks();
        // Silence logger for tests
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== CREATE AUDIT TABLE ====================

    describe('createAuditTable', () => {
        it('should create audit table and index', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createAuditTable('tenant_test_store');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
            // First call creates table
            expect(mockPrismaService.$executeRawUnsafe.mock.calls[0][0])
                .toContain('CREATE TABLE IF NOT EXISTS');
            expect(mockPrismaService.$executeRawUnsafe.mock.calls[0][0])
                .toContain('vendure_audit_log');
            // Second call creates index
            expect(mockPrismaService.$executeRawUnsafe.mock.calls[1][0])
                .toContain('CREATE INDEX IF NOT EXISTS');
        });

        it('should include correct columns in table', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createAuditTable('tenant_test_store');

            const tableCreationQuery = mockPrismaService.$executeRawUnsafe.mock.calls[0][0];
            expect(tableCreationQuery).toContain('action');
            expect(tableCreationQuery).toContain('user_id');
            expect(tableCreationQuery).toContain('ip_address');
            expect(tableCreationQuery).toContain('user_agent');
            expect(tableCreationQuery).toContain('details');
            expect(tableCreationQuery).toContain('severity');
        });
    });

    // ==================== LOG ====================

    describe('log', () => {
        it('should log audit event', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.log('tenant_test_store', {
                action: 'USER_LOGIN',
                userId: 100,
                ip: '192.168.1.1',
                userAgent: 'Chrome/120',
                details: { browser: 'Chrome' },
                severity: 'info',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO'),
                'USER_LOGIN',
                100,
                '192.168.1.1',
                'Chrome/120',
                JSON.stringify({ browser: 'Chrome' }),
                'info'
            );
        });

        it('should handle null userId', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.log('tenant_test_store', {
                action: 'ANONYMOUS_ACTION',
                severity: 'info',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'ANONYMOUS_ACTION',
                null,
                null,
                null,
                '{}',
                'info'
            );
        });

        it('should not throw on database error', async () => {
            mockPrismaService.$executeRawUnsafe.mockRejectedValue(new Error('DB Error'));

            // Should not throw
            await expect(service.log('tenant_test_store', {
                action: 'TEST',
                severity: 'info',
            })).resolves.not.toThrow();
        });
    });

    // ==================== LOG LOGIN ====================

    describe('logLogin', () => {
        it('should log successful login', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logLogin('tenant_test_store', 100, '192.168.1.1', true);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'LOGIN_SUCCESS',
                100,
                '192.168.1.1',
                null,
                JSON.stringify({ success: true }),
                'info'
            );
        });

        it('should log failed login with warning severity', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logLogin('tenant_test_store', 100, '192.168.1.1', false);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'LOGIN_FAILED',
                100,
                '192.168.1.1',
                null,
                JSON.stringify({ success: false }),
                'warning'
            );
        });
    });

    // ==================== LOG PASSWORD CHANGE ====================

    describe('logPasswordChange', () => {
        it('should log password change', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logPasswordChange('tenant_test_store', 100, '192.168.1.1');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'PASSWORD_CHANGED',
                100,
                '192.168.1.1',
                null,
                '{}',
                'info'
            );
        });
    });

    // ==================== LOG ADMIN ACTION ====================

    describe('logAdminAction', () => {
        it('should log admin action with ADMIN_ prefix', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logAdminAction('tenant_test_store', 100, 'create_user', { username: 'newuser' });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'ADMIN_CREATE_USER',
                100,
                null,
                null,
                JSON.stringify({ username: 'newuser' }),
                'info'
            );
        });

        it('should handle action without details', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logAdminAction('tenant_test_store', 100, 'delete_product');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'ADMIN_DELETE_PRODUCT',
                100,
                null,
                null,
                expect.any(String),
                'info'
            );
        });
    });

    // ==================== LOG SECURITY EVENT ====================

    describe('logSecurityEvent', () => {
        it('should log security event with SECURITY_ prefix and warning severity', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.logSecurityEvent('tenant_test_store', 'suspicious_activity', '192.168.1.1', {
                reason: 'Multiple failed attempts',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                'SECURITY_SUSPICIOUS_ACTIVITY',
                null,
                '192.168.1.1',
                null,
                JSON.stringify({ reason: 'Multiple failed attempts' }),
                'warning'
            );
        });
    });

    // ==================== GET AUDIT LOGS ====================

    describe('getAuditLogs', () => {
        it('should return audit logs', async () => {
            const mockLogs = [
                { id: BigInt(1), action: 'LOGIN_SUCCESS', user_id: 100, ip_address: '192.168.1.1', severity: 'info', created_at: new Date() },
                { id: BigInt(2), action: 'PASSWORD_CHANGED', user_id: 100, ip_address: '192.168.1.1', severity: 'info', created_at: new Date() },
            ];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockLogs);

            const result = await service.getAuditLogs('tenant_test_store');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[0].action).toBe('LOGIN_SUCCESS');
        });

        it('should apply limit option', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', { limit: 50 });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                50,
                0
            );
        });

        it('should apply offset option', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', { limit: 10, offset: 20 });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                10,
                20
            );
        });

        it('should filter by action', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', { action: 'LOGIN_SUCCESS' });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('action = $'),
                'LOGIN_SUCCESS',
                100, // default limit
                0    // default offset
            );
        });

        it('should filter by severity', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', { severity: 'warning' });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('severity = $'),
                'warning',
                100,
                0
            );
        });

        it('should filter by userId', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', { userId: 100 });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('user_id = $'),
                100,
                100, // default limit
                0
            );
        });

        it('should filter by date range', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-15');

            await service.getAuditLogs('tenant_test_store', { startDate, endDate });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('created_at >='),
                startDate,
                endDate,
                100,
                0
            );
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Query failed'));

            const result = await service.getAuditLogs('tenant_test_store');

            expect(result).toEqual([]);
        });

        it('should use default limit of 100', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getAuditLogs('tenant_test_store', {});

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                100,
                0
            );
        });
    });
});
