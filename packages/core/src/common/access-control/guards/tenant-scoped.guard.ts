import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { SecurityContext } from '../../security/security.context';

/**
* 🏰 ASMP: Tenant Scoped Guard (S2 Enforcement)
* - ينفذ العزل الصارم بين المستأجرين
* - يدعم @Public() للنقاط النهائية العامة
* - يسجل محاولات الوصول غير المصرح بها
*/
@Injectable()
export class TenantScopedGuard implements CanActivate {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    @Optional() private readonly reflector?: Reflector,
    @Optional() private readonly securityContext?: SecurityContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. التحقق من نقاط النهاية العامة (مع معالجة السلامة للـ Reflector)
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true; // ✅ ASMP Approved: Public route bypass
      }
    } else {
      // معالجة بديلة عند عدم توفر Reflector
      const request = context.switchToHttp().getRequest();
      const path = request.url || request.path || '';
      if (path.includes('/health') || path.includes('/api/app/health') || path.includes('/api/infra/')) {
        return true;
      }
    }

    // 2. التحقق من سياق المستأجر
    const request = context.switchToHttp().getRequest();
    const subdomain = this.extractSubdomain(request);
    
    if (!subdomain || ['www', 'admin', 'system'].includes(subdomain)) {
      return true; // السماح بالوصول إلى النطاق الرئيسي
    }

    try {
      // 3. الحصول على المستأجر من قاعدة البيانات
      const tenant = await this.prisma.tenant.findFirst({
        where: { subdomain: subdomain.toLowerCase() },
        select: { id: true, schemaName: true, subdomain: true, status: true }
      });

      if (!tenant) {
        this.logSecurityEvent('INVALID_TENANT_SUBDOMAIN', { subdomain });
        throw new ForbiddenException('Invalid tenant subdomain');
      }

      if (tenant.status !== 'active') {
        this.logSecurityEvent('INACTIVE_TENANT_ACCESS_ATTEMPT', { 
          tenantId: tenant.id, 
          status: tenant.status,
          subdomain
        });
        throw new ForbiddenException('Tenant account is not active');
      }

      // 4. تعيين سياق المستأجر بشكل آمن
      this.tenantContext.setTenantContext(tenant.id, tenant.schemaName, tenant.subdomain);
      
      // 5. تهيئة مخطط قاعدة البيانات للمستأجر
      await this.prisma.setTenantSchema(tenant.schemaName);
      
      // 6. التحقق من استعداد مخطط المستأجر
      const isReady = await this.prisma.isSchemaReady(tenant.schemaName);
      if (!isReady) {
        this.logSecurityEvent('TENANT_SCHEMA_NOT_READY', { 
          tenantId: tenant.id, 
          schema: tenant.schemaName 
        });
        throw new ForbiddenException('Tenant schema is not fully initialized');
      }

      return true;
    } catch (error) {
      this.logSecurityEvent('TENANT_ISOLATION_FAILURE', {
        error: error.message,
        subdomain,
        path: request.url || request.path,
        ip: this.getClientIp(request),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private extractSubdomain(request: any): string | null {
    const host = request.headers['host'] || request.hostname;
    if (!host) return null;
    
    const hostParts = host.split(':')[0].split('.');
    if (hostParts.length < 3) return null; // لا يوجد نطاق فرعي
    
    // استخراج النطاق الفرعي (الجزء الأول من النطاق)
    const subdomain = hostParts[0].toLowerCase();
    
    // التحقق من صحة النطاق الفرعي
    const reservedSubdomains = ['www', 'api', 'admin', 'system', 'localhost', 'test', 'dev'];
    if (reservedSubdomains.includes(subdomain)) {
      return null;
    }
    
    return subdomain;
  }

  private getClientIp(request: any): string {
    return (request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown')
      .split(',')[0]
      .trim()
      .replace(/[^a-z0-9\.:]/gi, '')
      .substring(0, 50);
  }

  private logSecurityEvent(event: string, details: any): void {
    if (this.securityContext) {
      this.securityContext.logSecurityEvent(event, {
        ...details,
        timestamp: new Date().toISOString()
      });
    } else {
      const logger = new Logger('TenantScopedGuard');
      logger.warn(`[SECURITY] ${event}: ${JSON.stringify(details)}`);
    }
  }
}