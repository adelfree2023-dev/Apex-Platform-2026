import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextService],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get tenant ID and derive schema name', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    service.setTenantId(tenantId);
    expect(service.getTenantId()).toBe(tenantId);
    expect(service.getSchemaName()).toBe('tenant_00000000_0000_0000_0000_000000000001');
  });

  it('should set full context', () => {
    const tenantId = 't1';
    const userId = 'u1';
    service.setContext(tenantId, userId);
    expect(service.getTenantId()).toBe(tenantId);
    expect(service.getUserId()).toBe(userId);
    expect(service.getSchemaName()).toBe('tenant_t1');
  });

  it('should set tenant context with specific schema and subdomain', () => {
    service.setTenantContext('t1', 'custom_schema', 'sub1');
    expect(service.getTenantId()).toBe('t1');
    expect(service.getSchemaName()).toBe('custom_schema');
    expect(service.getSubdomain()).toBe('sub1');
  });

  it('should clear tenant ID', () => {
    service.setTenantId('t1');
    service.clearTenantId();
    expect(service.getTenantId()).toBeNull();
    expect(service.getSchemaName()).toBeNull();
  });

  it('should return current tenant object', () => {
    service.setTenantContext('t1', 'tenant_t1', 'sub1');
    const tenant = service.getCurrentTenant();
    expect(tenant).toEqual({
      id: 't1',
      schemaName: 'tenant_t1',
      subdomain: 'sub1'
    });
  });

  it('should return null if tenant ID is not set', () => {
    expect(service.getCurrentTenant()).toBeNull();
  });

  it('should derive tenant schema from static method', async () => {
    const schema = await service.getTenantSchema('t-123');
    expect(schema).toBe('tenant_t_123');
  });
});
