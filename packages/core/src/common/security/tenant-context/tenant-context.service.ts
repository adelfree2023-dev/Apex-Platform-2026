import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
    private tenantId: string | null = null;
    private userId: string | null = null;
    private schemaName: string | null = null;
    private subdomain: string | null = null;

    // 🛡️ المرجع لخدمة التدقيق (سيتم حقنه اختيارياً لتجنب الدوائر التكرارية)
    public auditService: any = null;

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

    // ✅ التوافق مع PrismaService
    setTenantId(tenantId: string) {
        this.tenantId = tenantId;
        this.schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    }

    clearTenantId() {
        this.tenantId = null;
        this.schemaName = null;
    }

    getCurrentTenant() {
        if (!this.tenantId) return null;
        return {
            id: this.tenantId,
            schemaName: this.schemaName,
            subdomain: this.subdomain
        };
    }

    getTenantId(): string | null { return this.tenantId; }
    getUserId(): string | null { return this.userId; }
    getSchemaName(): string | null { return this.schemaName; }
    getSubdomain(): string | null { return this.subdomain; }

    async getTenantSchema(tenantId: string): Promise<string> {
        return `tenant_${tenantId.replace(/-/g, '_')}`;
    }
}
