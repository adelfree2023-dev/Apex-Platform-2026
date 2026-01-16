/**
 * Prisma Service Unit Tests
 * Root-analyzed: Database connection and tenant schema operations
 */

import { PrismaService } from './prisma.service';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $executeRawUnsafe: jest.fn(),
        $queryRaw: jest.fn(),
    })),
}));

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(() => {
        service = new PrismaService();
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== ON MODULE INIT ====================

    describe('onModuleInit', () => {
        it('should connect to database', async () => {
            service.$connect = jest.fn().mockResolvedValue(undefined);

            await service.onModuleInit();

            expect(service.$connect).toHaveBeenCalled();
        });
    });

    // ==================== ON MODULE DESTROY ====================

    describe('onModuleDestroy', () => {
        it('should disconnect from database', async () => {
            service.$disconnect = jest.fn().mockResolvedValue(undefined);

            await service.onModuleDestroy();

            expect(service.$disconnect).toHaveBeenCalled();
        });
    });

    // ==================== WITH TENANT SCHEMA ====================

    describe('withTenantSchema', () => {
        it('should set search_path before callback', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            await service.withTenantSchema('tenant_store_1', async () => {
                return 'result';
            });

            // First call: SET search_path TO tenant schema
            expect(service.$executeRawUnsafe).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('SET search_path TO')
            );
        });

        it('should reset search_path after callback', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            await service.withTenantSchema('tenant_store_1', async () => {
                return 'result';
            });

            // Last call: SET search_path TO public
            const lastCall = service.$executeRawUnsafe.mock.calls.pop();
            expect(lastCall[0]).toContain('SET search_path TO public');
        });

        it('should return callback result', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            const result = await service.withTenantSchema('tenant_store_1', async () => {
                return { data: 'test' };
            });

            expect(result).toEqual({ data: 'test' });
        });

        it('should reset search_path even on callback error', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            await expect(
                service.withTenantSchema('tenant_store_1', async () => {
                    throw new Error('Callback failed');
                })
            ).rejects.toThrow('Callback failed');

            // Last call should still reset search_path
            const lastCall = service.$executeRawUnsafe.mock.calls.pop();
            expect(lastCall[0]).toContain('SET search_path TO public');
        });
    });

    // ==================== CREATE TENANT SCHEMA ====================

    describe('createTenantSchema', () => {
        it('should create schema with correct name format', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            await service.createTenantSchema('uuid-123-456');

            expect(service.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('CREATE SCHEMA IF NOT EXISTS')
            );
            expect(service.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('tenant_uuid_123_456')
            );
        });

        it('should replace dashes with underscores in tenant ID', async () => {
            service.$executeRawUnsafe = jest.fn().mockResolvedValue(undefined);

            await service.createTenantSchema('abc-def-ghi');

            expect(service.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('tenant_abc_def_ghi')
            );
        });
    });

    // ==================== TENANT SCHEMA EXISTS ====================

    describe('tenantSchemaExists', () => {
        it('should return true when schema exists', async () => {
            service.$queryRaw = jest.fn().mockResolvedValue([{ exists: true }]);

            const result = await service.tenantSchemaExists('tenant-123');

            expect(result).toBe(true);
        });

        it('should return false when schema does not exist', async () => {
            service.$queryRaw = jest.fn().mockResolvedValue([{ exists: false }]);

            const result = await service.tenantSchemaExists('nonexistent-tenant');

            expect(result).toBe(false);
        });

        it('should return false when query returns empty', async () => {
            service.$queryRaw = jest.fn().mockResolvedValue([]);

            const result = await service.tenantSchemaExists('unknown');

            expect(result).toBe(false);
        });
    });
});
