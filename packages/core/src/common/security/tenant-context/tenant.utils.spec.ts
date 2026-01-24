import { TenantUtils, getTenantSchemaName, ensureValidTenantId, isTenantSchemaReady } from './tenant.utils';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('TenantUtils', () => {
    describe('validateTenantAccess', () => {
        it('should return true for matching IDs', () => {
            expect(TenantUtils.validateTenantAccess('t1', 't1')).toBe(true);
        });

        it('should return false and log warning for mismatching IDs', () => {
            expect(TenantUtils.validateTenantAccess('t1', 't2')).toBe(false);
        });

        it('should throw ForbiddenException if IDs are missing', () => {
            expect(() => TenantUtils.validateTenantAccess('', 't2')).toThrow(ForbiddenException);
            expect(() => TenantUtils.validateTenantAccess('t1', '')).toThrow(ForbiddenException);
        });
    });

    describe('getTenantIdFromRequest', () => {
        it('should extract from header', () => {
            const mockReq: any = { headers: { 'x-tenant-id': 'tenant-long-uuid' }, query: {}, body: {} };
            expect(TenantUtils.getTenantIdFromRequest(mockReq)).toBe('tenant-long-uuid');
        });

        it('should extract from query', () => {
            const mockReq: any = { headers: {}, query: { tenantId: 'tenant-long-uuid' }, body: {} };
            expect(TenantUtils.getTenantIdFromRequest(mockReq)).toBe('tenant-long-uuid');
        });

        it('should extract from body', () => {
            const mockReq: any = { headers: {}, query: {}, body: { tenantId: 'tenant-long-uuid' } };
            expect(TenantUtils.getTenantIdFromRequest(mockReq)).toBe('tenant-long-uuid');
        });

        it('should throw if missing', () => {
            const mockReq: any = { headers: {}, query: {}, body: {} };
            expect(() => TenantUtils.getTenantIdFromRequest(mockReq)).toThrow(BadRequestException);
        });

        it('should throw if invalid format', () => {
            const mockReq: any = { headers: { 'x-tenant-id': 'short' } };
            expect(() => TenantUtils.getTenantIdFromRequest(mockReq)).toThrow('معرف المستأجر غير صالح');

            const mockReq2: any = { headers: { 'x-tenant-id': 123 } };
            expect(() => TenantUtils.getTenantIdFromRequest(mockReq2)).toThrow();
        });
    });

    describe('getTenantSchemaName', () => {
        it('should normalize and format schema name', () => {
            expect(getTenantSchemaName('My-Tenant')).toBe('tenant_my_tenant');
            expect(getTenantSchemaName('  spaces  ')).toBe('tenant_spaces');
            expect(getTenantSchemaName('A-B-C')).toBe('tenant_a_b_c');
        });

        it('should throw if invalid', () => {
            expect(() => getTenantSchemaName('')).toThrow(BadRequestException);
            expect(() => getTenantSchemaName('a')).toThrow(BadRequestException);
        });
    });

    describe('ensureValidTenantId', () => {
        const validUuid = '12345678-1234-1234-1234-123456789012';

        it('should return trimmed valid UUID', () => {
            expect(ensureValidTenantId(` ${validUuid} `)).toBe(validUuid);
        });

        it('should throw if not a string', () => {
            expect(() => ensureValidTenantId(123 as any)).toThrow(BadRequestException);
        });

        it('should throw if too short', () => {
            expect(() => ensureValidTenantId('abc')).toThrow(BadRequestException);
        });

        it('should throw if invalid UUID format', () => {
            expect(() => ensureValidTenantId('not-a-uuid-format-long-enough-36-chars')).toThrow('معرف المستأجر يجب أن يكون بصيغة UUID صالحة');
        });
    });

    describe('isTenantSchemaReady', () => {
        let mockPrisma: any;

        beforeEach(() => {
            mockPrisma = {
                $queryRaw: jest.fn(),
            };
        });

        it('should return true if schema and tables exist', async () => {
            mockPrisma.$queryRaw
                .mockResolvedValueOnce([{ exists: true }]) // schema exists
                .mockResolvedValueOnce([{ table_count: 3 }]); // tables count

            const ready = await isTenantSchemaReady(mockPrisma, 't-ready-id');
            expect(ready).toBe(true);
        });

        it('should return false if schema missing', async () => {
            mockPrisma.$queryRaw.mockResolvedValueOnce([{ exists: false }]);
            const ready = await isTenantSchemaReady(mockPrisma, 't-missing-id');
            expect(ready).toBe(false);
        });

        it('should return false if tables missing', async () => {
            mockPrisma.$queryRaw
                .mockResolvedValueOnce([{ exists: true }])
                .mockResolvedValueOnce([{ table_count: 2 }]);
            const ready = await isTenantSchemaReady(mockPrisma, 't-partial-id');
            expect(ready).toBe(false);
        });

        it('should return false and log error on exception', async () => {
            mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const ready = await isTenantSchemaReady(mockPrisma, 't-fail-id');
            expect(ready).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
