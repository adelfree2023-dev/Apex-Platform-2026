import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SecurityContext } from './common/security/security.context';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './common/monitoring/audit/audit.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime: number;
  private databaseConnectionVerified = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly securityContext: SecurityContext,
  ) {
    this.startTime = Date.now();
    this.initializeDatabaseConnection();
  }

  async getHealth(includeDetails: boolean = false): Promise<any> {
    const uptime = Date.now() - this.startTime;
    try {
      const databaseStatus = await this.getDatabaseHealth();
      const securityHealth = await this.getSecurityHealth();

      const baseHealth = {
        status: databaseStatus.status === 'healthy' ? 'ok' : 'degraded',
        service: 'apex-core',
        timestamp: new Date().toISOString(),
        version: this.configService.get('APP_VERSION') || '1.0.0-secure',
        uptime: uptime,
      };

      if (!includeDetails) return baseHealth;

      return {
        ...baseHealth,
        details: {
          database: databaseStatus,
          security: securityHealth,
        },
      };
    } catch (error) {
      this.securityContext.logSecurityEvent('HEALTH_CHECK_FAILURE', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return { status: 'error', timestamp: new Date().toISOString() };
    }
  }

  private async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'degraded' };
    }
  }

  async verifyDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.databaseConnectionVerified = true;
      return true;
    } catch (error) {
      this.databaseConnectionVerified = false;
      this.securityContext.logSecurityEvent('DATABASE_CONNECTION_FAILURE', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  private async initializeDatabaseConnection() {
    try {
      await this.verifyDatabaseConnection();
    } catch (error) {
      this.securityContext.logCriticalSecurityEvent('DATABASE_INIT_FAILURE', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async getSecurityHealth() {
    return { auditLogging: true, rateLimiting: true, encryptionEnabled: true };
  }
}
