import { Provider } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/common/monitoring/audit/audit.service';
import { SecurityContext } from '../src/common/security/security.context';
import { TenantContextService } from '../src/common/security/tenant-context/tenant-context.service';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export const mockPrisma: any = {
    tenant: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    product: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    order: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
};

export const mockAudit = {
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn(),
    logOperation: jest.fn(),
    logCriticalSecurityEvent: jest.fn(),
};

export const mockSecurityContext = {
    logSecurityEvent: jest.fn(),
    logCriticalSecurityEvent: jest.fn(),
    captureException: jest.fn(),
    getIpFromRequest: jest.fn().mockReturnValue('127.0.0.1'),
};

export const mockTenantContext = {
    getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
    getUserId: jest.fn().mockReturnValue('test-user-id'),
    getSchemaName: jest.fn().mockReturnValue('tenant_test'),
    getTenantSchema: jest.fn().mockResolvedValue('tenant_test'),
    setTenantId: jest.fn(),
    clearTenantId: jest.fn(),
    getCurrentTenant: jest.fn().mockReturnValue({ id: 'test-tenant-id', schemaName: 'tenant_test' }),
};

export const mockConfig = {
    get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return 'test-value';
    }),
};

export const commonProviders: Provider[] = [
    { provide: PrismaService, useValue: mockPrisma },
    { provide: AuditService, useValue: mockAudit },
    { provide: SecurityContext, useValue: mockSecurityContext },
    { provide: TenantContextService, useValue: mockTenantContext },
    { provide: ConfigService, useValue: mockConfig },
    Reflector,
];
