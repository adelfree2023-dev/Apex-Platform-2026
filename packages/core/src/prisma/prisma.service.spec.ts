/**
 * Prisma Service Unit Tests
 * Root-analyzed: Database connection and tenant schema operations
 * Note: PrismaService extends PrismaClient, so we test via the actual class
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();

        service = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(async () => {
        // Don't disconnect since we didn't connect
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== INSTANCE CHECKS ====================

    describe('instance', () => {
        it('should be instance of PrismaService', () => {
            expect(service).toBeInstanceOf(PrismaService);
        });

        it('should have $connect method', () => {
            expect(typeof service.$connect).toBe('function');
        });

        it('should have $disconnect method', () => {
            expect(typeof service.$disconnect).toBe('function');
        });

        it('should have $executeRawUnsafe method', () => {
            expect(typeof service.$executeRawUnsafe).toBe('function');
        });

        it('should have $queryRaw method', () => {
            expect(typeof service.$queryRaw).toBe('function');
        });
    });

    // ==================== LIFECYCLE METHODS ====================

    describe('onModuleInit', () => {
        it('should call $connect', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

            await service.onModuleInit();

            expect(connectSpy).toHaveBeenCalled();
        });
    });

    describe('onModuleDestroy', () => {
        it('should call $disconnect', async () => {
            const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalled();
        });
    });

    // ==================== CUSTOM METHODS ====================

    describe('withTenantSchema', () => {
        it('should execute callback within tenant schema context', async () => {
            const executeSpy = jest.spyOn(service, '$executeRawUnsafe').mockResolvedValue(undefined as any);

            const result = await service.withTenantSchema('tenant_store_1', async () => {
                return 'test-result';
            });

            expect(result).toBe('test-result');
            expect(executeSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('createTenantSchema', () => {
        it('should create schema with formatted name', async () => {
            const executeSpy = jest.spyOn(service, '$executeRawUnsafe').mockResolvedValue(undefined as any);

            await service.createTenantSchema('uuid-123-456');

            expect(executeSpy).toHaveBeenCalledWith(
                expect.stringContaining('CREATE SCHEMA IF NOT EXISTS')
            );
        });
    });

    describe('tenantSchemaExists', () => {
        it('should return true when schema exists', async () => {
            jest.spyOn(service, '$queryRaw').mockResolvedValue([{ exists: true }] as any);

            const result = await service.tenantSchemaExists('tenant-123');

            expect(result).toBe(true);
        });

        it('should return false when schema does not exist', async () => {
            jest.spyOn(service, '$queryRaw').mockResolvedValue([{ exists: false }] as any);

            const result = await service.tenantSchemaExists('nonexistent');

            expect(result).toBe(false);
        });
    });
});
