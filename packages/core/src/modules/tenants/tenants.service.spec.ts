import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ConflictException,
    InternalServerErrorException
} from '@nestjs/common';
import {
    getCommonProviders,
    createMockPrisma,
} from '../../../test/test-utils';

describe('TenantsService', () => {
    let service: TenantsService;
    let mockPrisma: any;

    beforeEach(async () => {
        mockPrisma = createMockPrisma();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantsService,
                ...getCommonProviders([TenantsService]),
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<TenantsService>(TenantsService);
    });

    describe('createTenantWithStore', () => {
        const validDto = {
            storeName: 'Test Store',
            subdomain: 'teststore',
            businessType: 'retail',
            email: 'owner@teststore.com',
            password: 'SuperStrongPass123!',
        };

        it('should create tenant successfully with all steps', async () => {
            mockPrisma.tenant.findFirst.mockResolvedValueOnce(null); // No existing subdomain
            mockPrisma.tenant.create.mockResolvedValueOnce({
                id: 'tenant-uuid',
                name: 'Test Store',
                subdomain: 'teststore',
                schemaName: 'tenant_mocked_uuid',
                status: 'provisioning'
            });
            mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrisma.user.create.mockResolvedValueOnce({ id: 'user-1' });

            const result = await service.createTenantWithStore(validDto as any);

            expect(result).toMatchObject({
                id: 'tenant-uuid',
                subdomain: 'teststore',
                storeUrl: expect.stringContaining('teststore'),
            });

            expect(mockPrisma.tenant.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if subdomain exists', async () => {
            mockPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 'existing' });

            await expect(service.createTenantWithStore(validDto as any))
                .rejects.toThrow(ConflictException);
        });

        it('should handle transaction failure with proper error', async () => {
            mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
            // Simulate transaction failure
            mockPrisma.tenant.create.mockRejectedValueOnce(new Error('Database error'));

            await expect(service.createTenantWithStore(validDto as any))
                .rejects.toThrow(InternalServerErrorException);
        });
    });
});
