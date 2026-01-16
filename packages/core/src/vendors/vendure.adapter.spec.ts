
import { VendureAdapter, VendureConfig, TenantContext } from './vendure.adapter';

describe('VendureAdapter', () => {
    let adapter: VendureAdapter;
    const mockConfig: VendureConfig = {
        apiUrl: 'http://localhost:3000',
        shopApiPath: '/shop-api',
        adminApiPath: '/admin-api',
        authToken: 'mock-token',
    };

    const mockTenantContext: TenantContext = {
        tenantId: 'tenant-123',
        tenantSchema: 'schema_123',
        businessType: 'B2C',
        territory: 'EG',
        tenantName: 'Test Store',
    };

    beforeEach(() => {
        adapter = new VendureAdapter(mockConfig);
    });

    it('should be defined', () => {
        expect(adapter).toBeDefined();
    });

    describe('Tenant Context', () => {
        it('should throw error if context not set', () => {
            expect(() => adapter.getTenantDatabaseUrl()).toThrow('Tenant context not set');
            expect(() => adapter.getHeaders()).toThrow('Vendure operations require tenant context');
        });

        it('should set tenant context successfully', () => {
            adapter.setTenantContext(mockTenantContext);
            expect(() => adapter.getTenantDatabaseUrl()).not.toThrow();
        });
    });

    describe('URL Generation', () => {
        it('should generate correct Shop API URL', () => {
            expect(adapter.getShopApiUrl()).toBe('http://localhost:3000/shop-api');
        });

        it('should generate correct Admin API URL', () => {
            expect(adapter.getAdminApiUrl()).toBe('http://localhost:3000/admin-api');
        });

        it('should generate correct Database URL with schema', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
            adapter.setTenantContext(mockTenantContext);
            expect(adapter.getTenantDatabaseUrl()).toBe('postgresql://user:pass@localhost:5432/db?schema=schema_123');
        });
    });

    describe('Headers', () => {
        it('should generate correct headers with auth token', () => {
            adapter.setTenantContext(mockTenantContext);
            const headers = adapter.getHeaders();
            expect(headers['X-Tenant-Id']).toBe('tenant-123');
            expect(headers['X-Tenant-Schema']).toBe('schema_123');
            expect(headers['Authorization']).toBe('Bearer mock-token');
        });

        it('should generate headers without auth token if not provided', () => {
            const noAuthAdapter = new VendureAdapter({ ...mockConfig, authToken: undefined });
            noAuthAdapter.setTenantContext(mockTenantContext);
            const headers = noAuthAdapter.getHeaders();
            expect(headers['Authorization']).toBeUndefined();
        });
    });
});
