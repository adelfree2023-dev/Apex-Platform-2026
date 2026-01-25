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
        const store = this.storage.getStore();
        if (store) return store;
        return this.fallbackStore;
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
        if (this.storage.getStore()) {
            // Context-bound stores clear automatically, but we can reset the fallback
        }
        this.fallbackStore.tenantId = null;
        this.fallbackStore.schemaName = null;
        this.fallbackStore.subdomain = null;
    }

    getCurrentTenant() {
        const ctx = this.getStore();
        if (!ctx || !ctx.tenantId) return null;
        return {
            id: ctx.tenantId,
            schemaName: ctx.schemaName,
            subdomain: ctx.subdomain
        };
    }

    getTenantId(): string | null {
        const store = this.getStore();
        return store ? store.tenantId : null;
    }

    getUserId(): string | null {
        const store = this.getStore();
        return store ? (store.userId || null) : null;
    }

    getSchemaName(): string | null {
        const store = this.getStore();
        return store ? store.schemaName : null;
    }

    getSubdomain(): string | null {
        const store = this.getStore();
        return store ? (store.subdomain || null) : null;
    }

    async getTenantSchema(tenantId: string): Promise<string> {
        return `tenant_${tenantId.replace(/-/g, '_')}`;
    }
}
