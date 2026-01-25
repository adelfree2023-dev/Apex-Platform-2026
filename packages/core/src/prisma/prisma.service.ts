import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

@Injectable()
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: PrismaClient;

  // Explicitly define delegates for TypeScript and runtime visibility
  public $connect: PrismaClient['$connect'];
  public $disconnect: PrismaClient['$disconnect'];
  public $transaction: PrismaClient['$transaction'];
  public $queryRaw: PrismaClient['$queryRaw'];
  public $queryRawUnsafe: PrismaClient['$queryRawUnsafe'];
  public $executeRawUnsafe: PrismaClient['$executeRawUnsafe'];
  public $on: any; // $on is tricky with types, keeping any for now but binding correctly
  public $use: PrismaClient['$use'];
  public $extends: PrismaClient['$extends'];

  // Model delegates
  public tenant: PrismaClient['tenant'];
  public user: PrismaClient['user'];
  public systemSetting: PrismaClient['systemSetting'];
  public systemConfig: PrismaClient['systemConfig'];
  public product: PrismaClient['product'];
  public order: PrismaClient['order'];
  public orderItem: PrismaClient['orderItem'];
  public payment: PrismaClient['payment'];
  public customer: PrismaClient['customer'];
  public refund: PrismaClient['refund'];
  public revokedToken: PrismaClient['revokedToken'];

  constructor(
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {
    this.client = new PrismaClient({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      errorFormat: 'pretty',
    });

    // ⚡ Explicit binding to ensure properties are visible to proxies and scripts
    this.$connect = this.client.$connect.bind(this.client);
    this.$disconnect = this.client.$disconnect.bind(this.client);
    this.$transaction = this.client.$transaction.bind(this.client);
    this.$queryRaw = this.client.$queryRaw.bind(this.client);
    this.$queryRawUnsafe = this.client.$queryRawUnsafe.bind(this.client);
    this.$executeRawUnsafe = this.client.$executeRawUnsafe.bind(this.client);
    this.$on = (this.client as any).$on?.bind(this.client);
    this.$use = (this.client as any).$use?.bind(this.client);
    this.$extends = (this.client as any).$extends?.bind(this.client);

    // ⚡ Model mapping
    this.tenant = this.client.tenant;
    this.user = this.client.user;
    this.systemSetting = this.client.systemSetting;
    this.systemConfig = this.client.systemConfig;
    this.product = this.client.product;
    this.order = this.client.order;
    this.orderItem = this.client.orderItem;
    this.payment = this.client.payment;
    this.customer = this.client.customer;
    this.refund = this.client.refund;
    this.revokedToken = this.client.revokedToken;
  }

  async onModuleInit() {
    try {
      this.logger.log('📡 Verifying database connection...');
      // Note: We don't necessarily need to call $connect() manually as Prisma 6+ handles it,
      // but we do it here for proactive health check.
      await this.$connect();
      this.logger.log('✅ Prisma connected to database successfully');
    } catch (error) {
      this.logger.error('🚨 Prisma connection failed:', error);
      // We don't exit here to allow NestJS to handle the failure or retry
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async connectWithRetry(maxRetries = 3, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        this.logger.warn(`Prisma connection attempt ${i + 1} failed: ${error.message}`);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
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