import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // ✅ Direct initialization ensures availability as a Singleton
  public readonly client = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
    errorFormat: 'pretty',
  });

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TenantContextService))
    private readonly tenantContext: TenantContextService,
  ) {
    this.logger.log('🏗️ PrismaService Singleton initialized');
  }

  // Standard NestJS lifecycle
  async onModuleInit() {
    this.logger.log('📡 onModuleInit: Connecting to database...');
    try {
      await this.$connect();
      this.logger.log('✅ onModuleInit: Connection successful');
    } catch (error: any) {
      this.logger.error(`❌ onModuleInit: Connection failed: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    // Calling the delegated method ensures tests can track the call
    await this.$disconnect();
  }

  // ⚡ High-level methods for external use
  async $connect() {
    return this.client.$connect();
  }

  async $disconnect() {
    return this.client.$disconnect();
  }

  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>;
  $transaction<T>(promises: Promise<T>[]): Promise<T[]>;
  $transaction(arg: any, options?: any) {
    return this.client.$transaction(arg, options);
  }

  async $queryRaw<T = any>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return this.client.$queryRaw<T>(query, ...values);
  }

  async $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
    return this.client.$queryRawUnsafe<T>(query, ...values);
  }

  async $executeRawUnsafe(query: string, ...values: any[]) {
    return this.client.$executeRawUnsafe(query, ...values);
  }

  $on(event: string, callback: any) {
    return (this.client as any).$on(event, callback);
  }

  $use(callback: any) {
    return (this.client as any).$use(callback);
  }

  $extends(options: any) {
    return (this.client as any).$extends(options);
  }

  // ⚡ Model delegates (Getters are safe for Prisma model proxies)
  get tenant() { return this.client.tenant; }
  get user() { return this.client.user; }
  get systemSetting() { return this.client.systemSetting; }
  get systemConfig() { return this.client.systemConfig; }
  get product() { return this.client.product; }
  get order() { return this.client.order; }
  get orderItem() { return this.client.orderItem; }
  get payment() { return this.client.payment; }
  get customer() { return this.client.customer; }
  get refund() { return this.client.refund; }
  get revokedToken() { return this.client.revokedToken; }

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

    if (!this.tenantContext) {
      this.logger.warn('TenantContextService not linked to PrismaService. Context isolation might be bypassed.');
      return callback();
    }

    try {
      this.tenantContext.setTenantId(tenantId);
      return callback();
    } finally {
      this.tenantContext.clearTenantId();
    }
  }
}