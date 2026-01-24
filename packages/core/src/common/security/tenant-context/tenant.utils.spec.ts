import { TenantUtils, getTenantSchemaName, ensureValidTenantId, isTenantSchemaReady } from './tenant.utils';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('TenantUtils', () => {
    describe('validateTenantAccess', () => {
        it('should return true when tenantId matches requestTenantId', () => {
            expect(TenantUtils.validateTenantAccess('t1', 't1')).toBe(true);
        });

        it('should return false and log warning when tenantId does not match', () => {
            expect(TenantUtils.validateTenantAccess('t1', 't2')).toBe(false);
        });

        it('should throw ForbiddenException if any ID is missing', () => {
            expect(() => TenantUtils.validateTenantAccess('', 't1')).toThrow(ForbiddenException);
        });
    });

    describe('getTenantIdFromRequest', () => {
        it('should extract from header', () => {
            const mockReq: any = { headers: { 'x-tenant-id': 'tenant-uuid-long' }, query: {}, body: {} };
            expect(TenantUtils.getTenantIdFromRequest(mockReq)).toBe('tenant-uuid-long');
        });

        it('should throw BadRequestException if missing', () => {
            const mockReq: any = { headers: {}, query: {}, body: {} };
            expect(() => TenantUtils.getTenantIdFromRequest(mockReq)).toThrow(BadRequestException);
        });
    });

    describe('getTenantSchemaName', () => {
        it('should return tenant_ formatted name', () => {
            expect(getTenantSchemaName('my-tenant')).toBe('tenant_my_tenant');
        });

        it('should throw if invalid', () => {
            expect(() => getTenantSchemaName('')).toThrow(BadRequestException);
        });
    });

    describe('ensureValidTenantId', () => {
        it('should return trimmed valid UUID', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(ensureValidTenantId(`  ${uuid}  `)).toBe(uuid);
        });

        it('should throw error for invalid length or format', () => {
            expect(() => ensureValidTenantId('short')).toThrow(BadRequestException);
            expect(() => ensureValidTenantId('invalid-format-but-long-enough-36-chars')).toThrow(BadRequestException);
        });
    });
});
