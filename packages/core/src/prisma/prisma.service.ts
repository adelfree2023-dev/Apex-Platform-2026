import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {
    super({
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
      await this.$connect();
      this.logger.log('Prisma connected to database successfully');

      // ✅ S2: إعداد مستمع للاستعلامات لتطبيق عزل المستأجرين
      (this as any).$on('query', async (event: any) => {
        const currentTenant = this.tenantContextService.getCurrentTenant();

        if (currentTenant && event.query.includes('WHERE') && !event.query.includes('tenantId')) {
          this.logger.warn(`Potential tenant isolation violation: ${event.query}`);

          // ✅ S4: تسجيل محاولة الوصول بدون عزل المستأجر
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
      this.logger.error('Prisma connection failed:', error);
      process.exit(1);
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