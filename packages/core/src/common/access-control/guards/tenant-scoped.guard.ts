import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { AuditService } from '../../monitoring/audit/audit.service';

/*** 🏰 ASMP: Tenant Scoped Guard (S2 Enforcement) - النسخة المطورة*/
@Injectable()
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantContextService: TenantContextService,
    private prisma: PrismaService,
    @Optional() @Inject(AuditService) private readonly auditService?: AuditService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ✅ S2: السماح للمسارات العامة
    if (isPublic) return true;

    try {
      // ✅ S2: استخراج معرف المستأجر من الطلب
      const tenantId = this.extractTenantId(request);

      // ✅ S2: التحقق الصارم من وجود tenantId وتنسيقه (UUID)
      if (!tenantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
        this.logger.error('معرف مستأجر غير صالح أو مفقود', { tenantId });
        this.logUnauthorizedAccess(request, 'TENANT_ID_INVALID_OR_MISSING');
        throw new ForbiddenException('معرف المستأجر غير صالح');
      }

      // ✅ S2: التحقق من وجود المستأجر في قاعدة البيانات وحالته
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant || (tenant.status !== 'ACTIVE' && tenant.status !== 'active')) {
        this.logger.warn(`مستأجر غير نشط أو غير موجود: ${tenantId}`);
        this.logUnauthorizedAccess(request, 'TENANT_INACTIVE_OR_NOT_FOUND');
        throw new ForbiddenException('المستأجر غير نشط أو غير موجود');
      }

      // ✅ S2: التحقق من عزل البيانات على مستوى قاعدة البيانات
      if (!await this.verifyDatabaseIsolation(tenantId)) {
        this.logger.warn(`Potential isolation failure for tenant ${tenantId}`);
      }

      // ✅ S2: تعيين سياق المستأجر (S7: تطبيق التشفير على البيانات الحساسة إذا لزم الأمر في الطبقات التالية)
      this.tenantContextService.setTenantId(tenantId);
      request.tenant = {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        subdomain: tenant.subdomain
      };

      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('فشل التحقق من المستأجر:', error.message);
      throw new ForbiddenException('فشل التحقق من الهوية');
    }
  }

  private extractTenantId(request: any): string | null {
    // ✅ S2: البحث عن معرف المستأجر في أماكن متعددة
    return (
      request.headers['x-tenant-id'] ||
      request.query.tenantId ||
      request.body.tenantId ||
      request.params.tenantId
    );
  }

  private async verifyDatabaseIsolation(tenantId: string): Promise<boolean> {
    // ✅ S2: التحقق من وجود المخطط المخصص للمستأجر
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    const result: any[] = await this.prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = ${schemaName}
    `;

    if (result.length === 0) {
      // محاولة إنشاء المخطط إذا لم يكن موجوداً (للتطوير فقط)
      if (process.env.NODE_ENV === 'development') {
        try {
          await this.prisma.$executeRawUnsafe(`
            CREATE SCHEMA IF NOT EXISTS "${schemaName}";
            `);
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  private async logUnauthorizedAccess(request: any, reason: string) {
    if (this.auditService) {
      const ip = request.ip || request.connection?.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      await this.auditService.logSecurityEvent('UNAUTHORIZED_TENANT_ACCESS', {
        severity: 'HIGH',
        sourceIp: ip,
        userAgent,
        reason,
        path: request.url,
        method: request.method,
        headers: this.sanitizeHeaders(request.headers)
      });
    }
  }

  private sanitizeHeaders(headers: any): any {
    // ✅ S4: تجنب تسريب رؤوس حساسة
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}