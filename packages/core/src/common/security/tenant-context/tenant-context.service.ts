import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface ITenantContext {
    tenantId: string | null;
    userId?: string | null;
    schemaName: string | null;
    subdomain?: string | null;
}

@Injectable()
export class TenantContextService {
    private readonly storage = new AsyncLocalStorage<ITenantContext>();

    // 🛡️ Fallback store for non-request contexts (Bootstrap/Tests)
    private fallbackStore: ITenantContext = {
        tenantId: null,
        userId: 'anonymous',
        schemaName: null,
    };

    public auditService: any = null;

    private getStore(): ITenantContext {
        return this.storage.getStore() || this.fallbackStore;
    }

    setContext(tenantId: string, userId?: string) {
        const store = this.getStore();
        store.tenantId = tenantId;
        store.userId = userId || 'anonymous';
        store.schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    }

    runWithContext<T>(context: ITenantContext, callback: () => T): T {
        return this.storage.run(context, callback);
    }

    setTenantContext(tenantId: string, schemaName: string, subdomain: string) {
        const store = this.getStore();
        store.tenantId = tenantId;
        store.schemaName = schemaName;
        store.subdomain = subdomain;
    }

    setTenantId(tenantId: string) {
        const store = this.getStore();
        store.tenantId = tenantId;
        store.schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    }

    clearTenantId() {
        const store = this.getStore();
        store.tenantId = null;
        store.schemaName = null;
        store.subdomain = null;
    }

    getCurrentTenant() {
        const ctx = this.getStore();
        if (!ctx.tenantId) return null;
        return {
            id: ctx.tenantId,
            schemaName: ctx.schemaName,
            subdomain: ctx.subdomain
        };
    }

    getTenantId(): string | null { return this.getStore().tenantId; }
    getUserId(): string | null { return this.getStore().userId || null; }
    getSchemaName(): string | null { return this.getStore().schemaName; }
    getSubdomain(): string | null { return this.getStore().subdomain || null; }

    async getTenantSchema(tenantId: string): Promise<string> {
        return `tenant_${tenantId.replace(/-/g, '_')}`;
    }
}
