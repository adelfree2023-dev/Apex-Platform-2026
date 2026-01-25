import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: PrismaClient;

  constructor(
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {
    this.client = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('📡 Connecting to database via Prisma client...');
      await this.client.$connect();
      this.logger.log('✅ Prisma connected to database successfully');

      // ✅ S2: إعداد مستمع للاستعلامات لتطبيق عزل المستأجرين
      (this.client as any).$on('query', async (event: any) => {
        const currentTenant = this.tenantContextService.getCurrentTenant();

        if (currentTenant && event.query.includes('WHERE') && !event.query.includes('tenantId')) {
          this.logger.warn(`Potential tenant isolation violation: ${event.query}`);

          const auditService = (this.tenantContextService as any).auditService;
          if (auditService) {
            await auditService.logSecurityEvent('TENANT_ISOLATION_VIOLATION', {
              query: event.query.substring(0, 200) + '...',
              tenantId: currentTenant.id,
              severity: 'HIGH'
            });
          }
        }
      });
    } catch (error) {
      this.logger.error('🚨 Prisma connection failed:', error);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  // Delegate common methods to the client
  get tenant() { return this.client.tenant; }
  get user() { return this.client.user; }
  get systemSetting() { return this.client.systemSetting; }
  get product() { return this.client.product; }
  get order() { return this.client.order; }
  get payment() { return this.client.payment; }
  get customer() { return this.client.customer; }
  get revokedToken() { return this.client.revokedToken; }
  get refund() { return this.client.refund; }
  get systemConfig() { return this.client.systemConfig; }
  get orderItem() { return this.client.orderItem; }
  // ... add more as needed or use client directly

  // Helper for raw queries used in audit/tenants
  get $queryRaw() { return this.client.$queryRaw.bind(this.client); }
  get $queryRawUnsafe() { return this.client.$queryRawUnsafe.bind(this.client); }
  get $executeRawUnsafe() { return this.client.$executeRawUnsafe.bind(this.client); }
  get $connect() { return this.client.$connect.bind(this.client); }
  get $disconnect() { return this.client.$disconnect.bind(this.client); }

  async connectWithRetry(maxRetries = 3, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.$connect();
        return;
      } catch (error) {
        this.logger.warn(`Prisma connection attempt ${i + 1} failed: ${error.message}`);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // ✅ S2: طريقة آمنة للحصول على المستأجر الحالي في الاستعلامات
  withTenant<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for tenant-scoped operations');
    }

    try {
      this.tenantContextService.setTenantId(tenantId);
      return callback();
    } finally {
      this.tenantContextService.clearTenantId();
    }
  }
}