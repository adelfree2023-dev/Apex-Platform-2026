import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../common/monitoring/audit/audit.service';
import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException
} from '@nestjs/common';

describe('TenantsService', () => {
    let service: TenantsService;
    const mockPrisma: any = {
        tenant: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        user: {
            create: jest.fn(),
        },
        $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
        $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const mockConfig = {
        get: jest.fn((key) => {
            if (key === 'BASE_DOMAIN') return 'apex-platform.com';
            return null;
        }),
    };

    const mockAudit = {
        logActivity: jest.fn(),
        logSecurityEvent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ConfigService, useValue: mockConfig },
                { provide: AuditService, useValue: mockAudit },
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
            mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(undefined);
            mockPrisma.user.create.mockResolvedValueOnce({ id: 'user-1' });

            const result = await service.createTenantWithStore(validDto as any);

            expect(result).toMatchObject({
                id: 'tenant-uuid',
                subdomain: 'teststore',
                schemaName: 'tenant_tenant_uuid',
                storeUrl: expect.stringContaining('teststore'),
            });

            expect(mockPrisma.tenant.create).toHaveBeenCalled();
            expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('CREATE SCHEMA IF NOT EXISTS')
            );
            expect(mockAudit.logActivity).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'TENANT_CREATED' })
            );
        });

        it('should throw ConflictException if subdomain exists', async () => {
            mockPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 'existing' });

            await expect(service.createTenantWithStore(validDto as any))
                .rejects.toThrow(ConflictException);
        });

        it('should handle transaction failure with proper error', async () => {
            mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
            mockPrisma.$transaction.mockRejectedValueOnce(new Error('Database error'));

            await expect(service.createTenantWithStore(validDto as any))
                .rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('getTenantBySubdomain', () => {
        it('should return active tenant by subdomain', async () => {
            const mockTenant = {
                id: 'tenant-1',
                subdomain: 'teststore',
                status: 'active'
            };
            mockPrisma.tenant.findFirst.mockResolvedValueOnce(mockTenant);

            const result = await service.getTenantBySubdomain('teststore');

            expect(result).toBe(mockTenant);
            expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith({
                where: {
                    subdomain: 'teststore',
                    status: 'active'
                }
            });
        });
    });
});
