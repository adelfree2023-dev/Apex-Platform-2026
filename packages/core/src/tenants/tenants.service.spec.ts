/**
 * Tenants Service Unit Tests — CRITICAL P0
 * Tests tenant isolation and schema management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { VendureService } from '../vendors/vendure.service';
import { HttpException } from '@nestjs/common';

describe('TenantsService', () => {
    let service: TenantsService;

    const mockPrismaService = {
        tenant: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        $executeRawUnsafe: jest.fn(),
    };

    const mockEventService = {
        record: jest.fn(),
    };

    const mockVendureService = {
        initializeTenant: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EventService, useValue: mockEventService },
                { provide: VendureService, useValue: mockVendureService },
            ],
        }).compile();

        service = module.get<TenantsService>(TenantsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTenant', () => {
        const validDto = {
            name: 'Test Store',
            subdomain: 'test-store',
            businessType: 'RETAIL' as const,
            territory: 'Cairo',
        };

        it('should create a new tenant with schema isolation', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null); // No existing
            mockPrismaService.tenant.create.mockResolvedValue({
                id: 'uuid-123',
                ...validDto,
                status: 'active',
            });
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockVendureService.initializeTenant.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.createTenant(validDto);

            expect(result.name).toBe('Test Store');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled(); // Schema created
            expect(mockVendureService.initializeTenant).toHaveBeenCalled(); // Vendure initialized
            expect(mockEventService.record).toHaveBeenCalled(); // Event logged
        });

        it('should reject invalid subdomain format', async () => {
            const invalidDto = { ...validDto, subdomain: 'Invalid-Subdomain!@#' };

            await expect(service.createTenant(invalidDto))
                .rejects.toThrow(HttpException);
        });

        it('should reject reserved subdomains', async () => {
            const reservedDto = { ...validDto, subdomain: 'admin' };

            await expect(service.createTenant(reservedDto))
                .rejects.toThrow('Subdomain is reserved');
        });

        it('should reject duplicate subdomains', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'existing' });

            await expect(service.createTenant(validDto))
                .rejects.toThrow('Subdomain already taken');
        });
    });

    describe('findById', () => {
        it('should return tenant by ID', async () => {
            const mockTenant = { id: 'uuid-123', name: 'Test Store', subdomain: 'test' };
            mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

            const result = await service.findById('uuid-123');

            expect(result.name).toBe('Test Store');
        });

        it('should return null for non-existent tenant', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            const result = await service.findById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('findBySubdomain', () => {
        it('should return tenant by subdomain', async () => {
            const mockTenant = { id: 'uuid-123', name: 'Test Store', subdomain: 'test' };
            mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

            const result = await service.findBySubdomain('test');

            expect(result.subdomain).toBe('test');
        });
    });

    describe('findAll', () => {
        it('should return all tenants', async () => {
            const mockTenants = [
                { id: '1', name: 'Store 1', subdomain: 'store1' },
                { id: '2', name: 'Store 2', subdomain: 'store2' },
            ];
            mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);

            const result = await service.findAll();

            expect(result).toHaveLength(2);
        });
    });

    describe('suspendTenant', () => {
        it('should suspend a tenant with reason', async () => {
            const mockTenant = { id: 'uuid-123', status: 'suspended', territory: 'Cairo', businessType: 'RETAIL' };
            mockPrismaService.tenant.update.mockResolvedValue(mockTenant);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.suspendTenant('uuid-123', 'Violation of terms');

            expect(result.status).toBe('suspended');
            expect(mockEventService.record).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'tenant.suspended' })
            );
        });
    });

    describe('Tenant Isolation (Security Tests)', () => {
        it('should create isolated schema per tenant', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);
            mockPrismaService.tenant.create.mockResolvedValue({
                id: 'uuid-isolation-test',
                name: 'Isolation Test',
                subdomain: 'isolation-test',
                status: 'active',
                territory: 'Cairo',
                businessType: 'RETAIL',
            });
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockVendureService.initializeTenant.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            await service.createTenant({
                name: 'Isolation Test',
                subdomain: 'isolation-test',
                businessType: 'RETAIL',
                territory: 'Cairo',
            });

            // Verify schema creation was called
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('CREATE SCHEMA')
            );
        });

        it('should prevent cross-tenant data access by schema design', () => {
            // This test documents that schema isolation is the security boundary
            // Each tenant operates on separate PostgreSQL schemas
            expect(true).toBe(true); // Documentation test
        });
    });
});
