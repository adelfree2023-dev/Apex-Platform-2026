import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../../common/security/encryption/encrypted-field.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('TenantsService', () => {
  let service: TenantsService;
  const mockPrisma = {
    tenant: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
    user: { create: jest.fn() },
  };
  const mockTenantCtx = {};
  const mockEncryption = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantCtx },
        { provide: EncryptedFieldService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  it('rejects reserved subdomain', async () => {
    const dto: CreateTenantDto = {
      storeName: 'Demo',
      subdomain: 'admin', // reserved
      businessType: 'retail',
      email: 'owner@example.com',
      password: 'StrongPass1234',
    };
    await expect(service.createTenantWithStore(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate subdomain', async () => {
    const dto: CreateTenantDto = {
      storeName: 'Demo',
      subdomain: 'demo',
      businessType: 'retail',
      email: 'owner@example.com',
      password: 'StrongPass1234',
    };
    mockPrisma.tenant.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(service.createTenantWithStore(dto)).rejects.toThrow(ConflictException);
  });

  it('creates tenant successfully', async () => {
    const dto: CreateTenantDto = {
      storeName: 'Demo',
      subdomain: 'demo',
      businessType: 'retail',
      email: 'owner@example.com',
      password: 'StrongPass1234',
    };
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    const tenantRecord = { id: 'tenant-uuid', subdomain: 'demo' };
    mockPrisma.tenant.create.mockResolvedValueOnce(tenantRecord);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);
    mockPrisma.user.create.mockResolvedValue(undefined);
    const result = await service.createTenantWithStore(dto);
    expect(result).toMatchObject({
      id: 'tenant-uuid',
      subdomain: 'demo',
      schemaName: expect.stringContaining('tenant_'),
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('handles unexpected DB error with InternalServerErrorException', async () => {
    const dto: CreateTenantDto = {
      storeName: 'Demo',
      subdomain: 'demo2',
      businessType: 'retail',
      email: 'owner@example.com',
      password: 'StrongPass1234',
    };
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    mockPrisma.tenant.create.mockRejectedValueOnce(new Error('boom'));
    await expect(service.createTenantWithStore(dto)).rejects.toThrow(InternalServerErrorException);
  });
});
