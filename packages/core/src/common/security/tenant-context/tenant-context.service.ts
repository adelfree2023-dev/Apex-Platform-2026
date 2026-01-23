import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
    private tenantId: string | null = null;
    private userId: string | null = null;
    private schemaName: string | null = null;
    private subdomain: string | null = null;

    setContext(tenantId: string, userId?: string) {
        this.tenantId = tenantId;
        this.userId = userId || null;
        this.schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    }

    /**
     * 🛡️ ASMP: Security Hardened Context Setter
     */
    setTenantContext(tenantId: string, schemaName: string, subdomain: string) {
        this.tenantId = tenantId;
        this.schemaName = schemaName;
        this.subdomain = subdomain;
    }

    getTenantId(): string | null { return this.tenantId; }
    getUserId(): string | null { return this.userId; }
    getSchemaName(): string | null { return this.schemaName; }
    getSubdomain(): string | null { return this.subdomain; }

    async getTenantSchema(tenantId: string): Promise<string> {
        return `tenant_${tenantId.replace(/-/g, '_')}`;
    }
}
