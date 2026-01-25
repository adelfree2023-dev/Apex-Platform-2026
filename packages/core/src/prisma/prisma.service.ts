import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _client: PrismaClient;

  constructor(
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {
    this._client = new PrismaClient({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      errorFormat: 'pretty',
    });
  }

  // Standard NestJS lifecycle
  async onModuleInit() {
    this.logger.log('📡 Initializing database connection...');
    try {
      await this.$connect();
      this.logger.log('✅ Database connection successful');
    } catch (error: any) {
      this.logger.error(`❌ Database connection failed: ${error.message}`);
      // Note: We don't exit here to allow NestJS to finish bootstrapping or main.ts to handle it
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // ⚡ High-level methods for external use
  async $connect() {
    return this._client.$connect();
  }

  async $disconnect() {
    return this._client.$disconnect();
  }

  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>;
  $transaction<T>(promises: Promise<T>[]): Promise<T[]>;
  $transaction(arg: any, options?: any) {
    return this._client.$transaction(arg, options);
  }

  async $queryRaw<T = any>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return this._client.$queryRaw<T>(query, ...values);
  }

  async $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
    return this._client.$queryRawUnsafe<T>(query, ...values);
  }

  async $executeRawUnsafe(query: string, ...values: any[]) {
    return this._client.$executeRawUnsafe(query, ...values);
  }

  $on(event: string, callback: any) {
    return (this._client as any).$on(event, callback);
  }

  $use(callback: any) {
    return (this._client as any).$use(callback);
  }

  $extends(options: any) {
    return (this._client as any).$extends(options);
  }

  // ⚡ Model delegates (Getters are safe for Prisma model proxies)
  get tenant() { return this._client.tenant; }
  get user() { return this._client.user; }
  get systemSetting() { return this._client.systemSetting; }
  get systemConfig() { return this._client.systemConfig; }
  get product() { return this._client.product; }
  get order() { return this._client.order; }
  get orderItem() { return this._client.orderItem; }
  get payment() { return this._client.payment; }
  get customer() { return this._client.customer; }
  get refund() { return this._client.refund; }
  get revokedToken() { return this._client.revokedToken; }

  // ⚡ Maintenance helpers
  async connectWithRetry(maxRetries = 3, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.$connect();
        return;
      } catch (error: any) {
        this.logger.warn(`Connection attempt ${i + 1} failed: ${error.message}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  // ✅ S2: Tenant-scoped operation helper
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