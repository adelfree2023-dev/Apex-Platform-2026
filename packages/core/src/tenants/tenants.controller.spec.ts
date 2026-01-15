/**
 * Tenants Controller Unit Tests
 * Covers: Tenant CRUD, Suspend, Migration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { VendureService } from '../vendors/vendure.service';

describe('TenantsController', () => {
    let controller: TenantsController;

    const mockTenantsService = {
        createTenant: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        suspendTenant: jest.fn(),
    };

    const mockVendureService = {
        initializeTenant: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TenantsController],
            providers: [
                { provide: TenantsService, useValue: mockTenantsService },
                { provide: VendureService, useValue: mockVendureService },
            ],
        }).compile();

        controller = module.get<TenantsController>(TenantsController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== CREATE ====================

    describe('create', () => {
        const validDto = {
            name: 'Cairo Fashion Store',
            subdomain: 'cairo-fashion',
            businessType: 'RETAIL' as const,
            territory: 'Cairo',
        };

        it('should create a new tenant', async () => {
            const createdTenant = { id: 'uuid-123', ...validDto, status: 'active' };
            mockTenantsService.createTenant.mockResolvedValue(createdTenant);

            const result = await controller.create(validDto);

            expect(result.id).toBe('uuid-123');
            expect(result.status).toBe('active');
            expect(mockTenantsService.createTenant).toHaveBeenCalledWith(validDto);
        });

        it('should pass validation errors from service', async () => {
            mockTenantsService.createTenant.mockRejectedValue(new Error('Subdomain already taken'));

            await expect(controller.create(validDto))
                .rejects.toThrow('Subdomain already taken');
        });
    });

    // ==================== FIND ALL ====================

    describe('findAll', () => {
        it('should return all tenants', async () => {
            const tenants = [
                { id: '1', name: 'Store 1', subdomain: 'store1' },
                { id: '2', name: 'Store 2', subdomain: 'store2' },
            ];
            mockTenantsService.findAll.mockResolvedValue(tenants);

            const result = await controller.findAll();

            expect(result).toHaveLength(2);
        });

        it('should return empty array if no tenants', async () => {
            mockTenantsService.findAll.mockResolvedValue([]);

            const result = await controller.findAll();

            expect(result).toEqual([]);
        });
    });

    // ==================== FIND BY ID ====================

    describe('findById', () => {
        it('should return tenant by ID', async () => {
            const tenant = { id: 'uuid-123', name: 'Test Store', subdomain: 'test' };
            mockTenantsService.findById.mockResolvedValue(tenant);

            const result = await controller.findById('uuid-123');

            expect(result).not.toBeNull();
            expect(result?.name).toBe('Test Store');
        });

        it('should return null for non-existent tenant', async () => {
            mockTenantsService.findById.mockResolvedValue(null);

            const result = await controller.findById('non-existent');

            expect(result).toBeNull();
        });
    });

    // ==================== SUSPEND ====================

    describe('suspend', () => {
        it('should suspend tenant with reason', async () => {
            const suspendedTenant = { id: 'uuid-123', status: 'suspended' };
            mockTenantsService.suspendTenant.mockResolvedValue(suspendedTenant);

            const result = await controller.suspend('uuid-123', 'Violation of terms');

            expect(result.status).toBe('suspended');
            expect(mockTenantsService.suspendTenant).toHaveBeenCalledWith('uuid-123', 'Violation of terms');
        });
    });

    // ==================== MIGRATE ====================

    describe('migrateTenant', () => {
        it('should migrate existing tenant', async () => {
            const tenant = {
                id: 'uuid-123-456',
                name: 'Test Store',
                territory: 'Cairo',
                businessType: 'RETAIL',
            };
            mockTenantsService.findById.mockResolvedValue(tenant);
            mockVendureService.initializeTenant.mockResolvedValue(undefined);

            const result = await controller.migrateTenant('uuid-123-456');

            expect(result.success).toBe(true);
            expect(result.message).toContain('migrated');
            expect(result.tenantSchema).toBe('tenant_uuid_123_456');
            expect(mockVendureService.initializeTenant).toHaveBeenCalled();
        });

        it('should return error for non-existent tenant', async () => {
            mockTenantsService.findById.mockResolvedValue(null);

            const result = await controller.migrateTenant('non-existent');

            expect(result.error).toBe('Tenant not found');
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases', () => {
        it('should handle UUID with special format', async () => {
            const tenant = {
                id: '53d1ae6e-5d9e-498f-9453-e8208608331a',
                name: 'Test',
                territory: 'Cairo',
                businessType: 'RETAIL',
            };
            mockTenantsService.findById.mockResolvedValue(tenant);
            mockVendureService.initializeTenant.mockResolvedValue(undefined);

            const result = await controller.migrateTenant('53d1ae6e-5d9e-498f-9453-e8208608331a');

            expect(result.tenantSchema).toBe('tenant_53d1ae6e_5d9e_498f_9453_e8208608331a');
        });
    });
});
