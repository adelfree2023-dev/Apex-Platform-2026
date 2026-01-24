import { CreateTenantSchema, UpdateTenantSchema, TenantSearchSchema } from './tenant.dto';

describe('TenantDTO Validation', () => {
    const validTenant = {
        name: 'Main Store',
        subdomain: 'main-store',
        businessType: 'RETAIL',
        territory: 'Egypt',
        contactEmail: 'contact@example.com',
        contactPhone: '+201234567890'
    };

    describe('CreateTenantSchema', () => {
        it('should validate a correct tenant', () => {
            expect(CreateTenantSchema.parse(validTenant)).toMatchObject(validTenant);
        });

        it('should reject reserved subdomains', () => {
            expect(() => CreateTenantSchema.parse({ ...validTenant, subdomain: 'admin' })).toThrow('النطاق الفرعي محجوز');
            expect(() => CreateTenantSchema.parse({ ...validTenant, subdomain: 'api' })).toThrow();
        });

        it('should validate phone number format', () => {
            expect(() => CreateTenantSchema.parse({ ...validTenant, contactPhone: '123' })).toThrow();
        });

        it('should apply defaults for currency and language', () => {
            const result = CreateTenantSchema.parse(validTenant);
            expect(result.currency).toBe('EGP');
            expect(result.language).toBe('ar');
        });
    });

    describe('UpdateTenantSchema', () => {
        it('should require a valid UUID ID', () => {
            const uuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(UpdateTenantSchema.parse({ id: uuid })).toBeDefined();
            expect(() => UpdateTenantSchema.parse({ id: 'short' })).toThrow();
        });
    });

    describe('TenantSearchSchema', () => {
        it('should validate date ranges', () => {
            const validDate = new Date().toISOString();
            expect(TenantSearchSchema.parse({ startDate: validDate })).toBeDefined();
            expect(() => TenantSearchSchema.parse({ startDate: 'invalid' })).toThrow();
        });
    });
});
