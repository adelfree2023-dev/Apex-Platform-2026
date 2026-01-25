import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface ITenantContext {
    tenantId: string;
    userId?: string;
    schemaName: string;
    subdomain?: string;
}

@Injectable()
export class TenantContextService {
    private readonly storage = new AsyncLocalStorage<ITenantContext>();

    // 🛡️ المرجع لخدمة التدقيق (حقن اختياري)
    public auditService: any = null;

    setContext(tenantId: string, userId?: string) {
        const context: ITenantContext = {
            tenantId,
            userId: userId || 'anonymous',
            schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
        };
        // Note: For persistent setting in middlewares, wrap request in storage.run
        // For simple setter (legacy support), we'll try to update current context
        const current = this.storage.getStore();
        if (current) {
            Object.assign(current, context);
        }
    }

    /**
     * 🛡️ ASMP: Start a scoped context (to be used in middleware)
     */
    runWithContext<T>(context: ITenantContext, callback: () => T): T {
        return this.storage.run(context, callback);
    }

    /**
     * 🛡️ ASMP: Security Hardened Context Setter
     */
    setTenantContext(tenantId: string, schemaName: string, subdomain: string) {
        const current = this.storage.getStore();
        if (current) {
            current.tenantId = tenantId;
            current.schemaName = schemaName;
            current.subdomain = subdomain;
        }
    }

    setTenantId(tenantId: string) {
        const current = this.storage.getStore();
        if (current) {
            current.tenantId = tenantId;
            current.schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        }
    }

    clearTenantId() {
        // AsyncLocalStorage context clears automatically after the run() callback
    }

    getCurrentTenant() {
        const ctx = this.storage.getStore();
        if (!ctx) return null;
        return {
            id: ctx.tenantId,
            schemaName: ctx.schemaName,
            subdomain: ctx.subdomain
        };
    }

    getTenantId(): string | null {
        return this.storage.getStore()?.tenantId || null;
    }

    getUserId(): string | null {
        return this.storage.getStore()?.userId || null;
    }

    getSchemaName(): string | null {
        return this.storage.getStore()?.schemaName || null;
    }

    getSubdomain(): string | null {
        return this.storage.getStore()?.subdomain || null;
    }

    async getTenantSchema(tenantId: string): Promise<string> {
        return `tenant_${tenantId.replace(/-/g, '_')}`;
    }
}
