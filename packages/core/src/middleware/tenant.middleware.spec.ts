/**
 * Tenant Middleware Unit Tests
 * ROOT-ANALYZED: P0 CRITICAL - Tenant isolation security
 * Methods: use, extractSubdomain, isMarketingOrAdmin
 */

import { TenantMiddleware } from './tenant.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { HttpStatus } from '@nestjs/common';

describe('TenantMiddleware', () => {
    let middleware: TenantMiddleware;
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: jest.Mock;

    const mockPrismaService = {
        tenant: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(() => {
        middleware = new TenantMiddleware(mockPrismaService as unknown as PrismaService);

        mockRequest = {
            headers: {
                host: 'store1.apex-platform.com',
            },
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        mockNext = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    // ==================== HOST VALIDATION ====================

    describe('Host header validation', () => {
        it('should return 400 when host header is missing', async () => {
            mockRequest.headers.host = undefined;

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Host header missing',
                code: 'MISSING_HOST',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    // ==================== SUBDOMAIN VALIDATION ====================

    describe('Subdomain validation (SECURITY CRITICAL)', () => {
        it('should reject invalid subdomain with special characters', async () => {
            mockRequest.headers.host = 'store!@#.apex-platform.com';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid subdomain format',
                code: 'INVALID_SUBDOMAIN',
            });
        });

        it('should reject subdomain starting with number', async () => {
            mockRequest.headers.host = '123store.apex-platform.com';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        });

        it('should reject subdomain with SQL injection attempt', async () => {
            mockRequest.headers.host = "store'; DROP TABLE tenants;--.apex-platform.com";

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid subdomain format',
                code: 'INVALID_SUBDOMAIN',
            });
        });

        it('should accept valid subdomain with lowercase letters', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'My Store',
                subdomain: 'mystore',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should accept subdomain with numbers after first letter', async () => {
            mockRequest.headers.host = 'store123.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'Store 123',
                subdomain: 'store123',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should accept subdomain with hyphens', async () => {
            mockRequest.headers.host = 'my-store-name.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'My Store Name',
                subdomain: 'my-store-name',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    // ==================== MARKETING/ADMIN SKIP ====================

    describe('Marketing and Admin subdomain bypass', () => {
        it('should skip tenant context for www subdomain', async () => {
            mockRequest.headers.host = 'www.apex-platform.com';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockPrismaService.tenant.findUnique).not.toHaveBeenCalled();
        });

        it('should skip tenant context for admin subdomain', async () => {
            mockRequest.headers.host = 'admin.apex-platform.com';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockPrismaService.tenant.findUnique).not.toHaveBeenCalled();
        });

        it('should skip tenant context for api subdomain', async () => {
            mockRequest.headers.host = 'api.apex-platform.com';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should skip tenant context for localhost', async () => {
            mockRequest.headers.host = 'localhost:3000';

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    // ==================== TENANT LOOKUP ====================

    describe('Tenant lookup', () => {
        it('should return 404 when tenant not found', async () => {
            mockRequest.headers.host = 'nonexistent.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Store not found',
                code: 'TENANT_NOT_FOUND',
                subdomain: 'nonexistent',
            });
        });

        it('should lookup tenant by subdomain', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'My Store',
                subdomain: 'mystore',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { subdomain: 'mystore' },
            });
        });
    });

    // ==================== TENANT STATUS ====================

    describe('Tenant status validation', () => {
        it('should return 403 when tenant is suspended', async () => {
            mockRequest.headers.host = 'suspended-store.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'Suspended Store',
                subdomain: 'suspended-store',
                status: 'suspended',
                suspendedReason: 'Payment overdue',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'This store is currently suspended',
                code: 'TENANT_SUSPENDED',
                reason: 'Payment overdue',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should use default reason when suspendedReason is null', async () => {
            mockRequest.headers.host = 'suspended.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                status: 'suspended',
                suspendedReason: null,
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'This store is currently suspended',
                code: 'TENANT_SUSPENDED',
                reason: 'Contact support for more information',
            });
        });
    });

    // ==================== CONTEXT INJECTION ====================

    describe('Tenant context injection (ISOLATION CRITICAL)', () => {
        it('should inject tenantId into request', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-abc-123',
                name: 'My Store',
                subdomain: 'mystore',
                status: 'active',
                territory: 'Egypt',
                businessType: 'electronics',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.tenantId).toBe('tenant-abc-123');
        });

        it('should inject tenantSchema with correct format', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-abc-123',
                name: 'My Store',
                subdomain: 'mystore',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            // tenant_abc_123 (dashes replaced with underscores)
            expect(mockRequest.tenantSchema).toBe('tenant_tenant_abc_123');
        });

        it('should inject territory and businessType', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'My Store',
                subdomain: 'mystore',
                status: 'active',
                territory: 'Egypt',
                businessType: 'fashion',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.territory).toBe('Egypt');
            expect(mockRequest.businessType).toBe('fashion');
        });

        it('should inject tenantName', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                name: 'متجر أحمد للإلكترونيات',
                subdomain: 'mystore',
                status: 'active',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.tenantName).toBe('متجر أحمد للإلكترونيات');
        });
    });

    // ==================== ERROR HANDLING ====================

    describe('Error handling', () => {
        it('should return 500 on database error', async () => {
            mockRequest.headers.host = 'mystore.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockRejectedValue(new Error('DB connection lost'));

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Failed to resolve tenant',
                code: 'TENANT_RESOLUTION_ERROR',
            });
        });
    });

    // ==================== SUBDOMAIN EXTRACTION ====================

    describe('Subdomain extraction', () => {
        it('should extract subdomain from standard domain', async () => {
            mockRequest.headers.host = 'store1.apex-platform.com';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 't1', subdomain: 'store1', status: 'active', name: 'S1',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { subdomain: 'store1' },
            });
        });

        it('should handle host with port number', async () => {
            mockRequest.headers.host = 'store1.apex-platform.com:8080';
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 't1', subdomain: 'store1', status: 'active', name: 'S1',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { subdomain: 'store1' },
            });
        });
    });
});
