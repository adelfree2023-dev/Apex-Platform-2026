import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantScopedGuard } from '../src/common/guards/tenant-scoped.guard';
import { ExecutionContext } from '@nestjs/common';
import { getTenantSchemaName } from '../src/common/utils/tenant.utils';
import { TenantContextService } from '../src/common/utils/tenant-context.service';
import { EncryptedFieldService } from '../src/common/services/encrypted-field.service';
import { EventService } from '../src/events/event.service';

/**
 * Standardized Test Utils for Apex Platform (Phase 0)
 */

export const MOCK_TENANT_ID = 'test-tenant-uuid-123';
export const MOCK_SCHEMA = getTenantSchemaName(MOCK_TENANT_ID);

/**
 * Deep Mock for PrismaService with Tenant Isolation Enforcement
 */
export const createMockPrisma = () => {
    const mockPrisma: any = {
        $queryRawUnsafe: jest.fn(),
        $queryRaw: jest.fn(),
        $executeRawUnsafe: jest.fn(),
        $transaction: jest.fn(),
        // Add common models as needed
        customer: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        product: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        vendor: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        tenant: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        auditLog: { create: jest.fn(), findMany: jest.fn() },
        license: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
        subscription: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    // Support the new .client accessor and security helpers
    mockPrisma.client = mockPrisma;

    // S9/S7 Hardening: _checkSchema now defaults to checking the raw query mock result
    // for information_schema/pg_namespace to ensure consistency in tests.
    mockPrisma._checkSchema = jest.fn().mockImplementation(async (tenantId: string) => {
        const result = await mockPrisma.$queryRawUnsafe('SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = $1)', getTenantSchemaName(tenantId));
        return result[0]?.exists || false;
    });

    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    // Enforcement Logic for Raw Queries
    const enforceIsolation = (query: string) => {
        const q = query.toLowerCase();
        // S7: Aggressive matching for schema readiness checks
        // Supports both information_schema and pg_namespace queries
        if (q.includes('exists') || q.includes('information_schema') || q.includes('pg_namespace') || q.includes('nspname') || q.includes('schemata')) {
            return Promise.resolve([{ exists: true }]);
        }

        const expectedSchema = MOCK_SCHEMA.replace(/-/g, '_');
        if (!query.includes(`"${MOCK_SCHEMA}"`) && !query.includes(MOCK_SCHEMA)) {
            // Fallback check for unquoted schema names in queries
            if (!query.toLowerCase().includes(expectedSchema.toLowerCase())) {
                throw new Error(`TEST VIOLATION: Query does not target correct tenant schema ("${MOCK_SCHEMA}").`);
            }
        }
        return Promise.resolve([]);
    };

    mockPrisma.$queryRawUnsafe.mockImplementation(enforceIsolation);
    mockPrisma.$queryRaw.mockImplementation(enforceIsolation);
    mockPrisma.$executeRawUnsafe.mockImplementation(enforceIsolation);

    return mockPrisma;
};

/**
 * Standard Mock for TenantScopedGuard
 */
export const mockTenantScopedGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.tenantId = MOCK_TENANT_ID;
    }),
};

/**
 * Standard Mock for TenantContextService
 * Hardened: No default return value for getTenantId() to ensure S9 protocol
 * enforcement in tests. Developers MUST call .mockReturnValue() explicitly.
 */
export const mockTenantContext = {
    getTenantId: jest.fn(),
    getStore: jest.fn().mockReturnValue({ tenantId: MOCK_TENANT_ID }),
    run: jest.fn((store: any, callback: any) => callback()),
};

/**
 * Standard Mock for EncryptedFieldService
 */
export const mockEncryption = {
    encrypt: jest.fn((val: string) => `enc_${val}`),
    decrypt: jest.fn((val: string) => val?.startsWith('enc_') ? val.replace('enc_', '') : val),
};

/**
 * Standard Mock for EventService
 */
export const mockEventService = {
    record: jest.fn().mockResolvedValue({ id: 1 }),
};

/**
 * Helper to create a standardized testing module
 */
export async function createStandardTestingModule(
    providers: any[] = [],
    controllers: any[] = []
): Promise<TestingModule> {
    return await Test.createTestingModule({
        controllers,
        providers: [
            { provide: PrismaService, useValue: createMockPrisma() },
            { provide: TenantContextService, useValue: mockTenantContext },
            { provide: EncryptedFieldService, useValue: mockEncryption },
            { provide: EventService, useValue: mockEventService },
            ...providers,
        ],
    })
        .overrideGuard(TenantScopedGuard)
        .useValue(mockTenantScopedGuard)
        .compile();
}
