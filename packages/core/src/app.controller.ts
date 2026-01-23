/**
 * App Controller - نقاط نهاية الصحة والجذر
 * الأمان: جميع نقاط النهاية تتضمن رؤوس أمان وتسجيل مراجعة
 */
import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  HttpStatus,
  Headers,
  Ip,
  UseGuards,
  Query,
  Optional
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { Request, Response } from 'express';
import { z } from 'zod';
import { TenantScopedGuard } from './common/access-control/guards/tenant-scoped.guard';
import { SecurityContext } from './common/security/security.context';
import { Logger } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

// 🔒 مخطط التحقق من صحة معلمات الصحة
const healthCheckSchema = z.object({
  includeDetails: z.boolean().optional(),
  tenantId: z.string().uuid().optional(),
});

@ApiTags('health')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly auditService: AuditService,
    @Optional() private readonly securityContext?: SecurityContext
  ) { }

  /**
   * 🔒 فحص صحة الجذر - محدود بالحدود وآمن
   */
  @Public()
  @Get('health')
  @ApiSecurity('X-Request-ID')
  @ApiOperation({
    summary: 'فحص صحة النظام',
    description: 'إرجاع حالة صحة النظام الكاملة مع رؤوس أمان',
  })
  @ApiResponse({
    status: 200,
    description: 'النظام سليم',
  })
  async healthCheck(
    @Req() request: Request,
    @Res() response: Response,
    @Ip() ip: string,
    @Headers() headers: Record<string, string>,
    @Query('includeDetails') includeDetails?: string,
  ) {
    try {
      const validatedParams = healthCheckSchema.parse({
        includeDetails: includeDetails === 'true',
        tenantId: headers['x-tenant-id'] || (request as any).params?.tenantId,
      });

      await this.auditService.logOperation({
        tenantId: 'system',
        userId: 'anonymous',
        action: 'health_check',
        target: 'platform',
        details: {
          ip: ip,
          userAgent: headers['user-agent'] || 'unknown',
          includeDetails: validatedParams.includeDetails
        },
        ip: ip
      });

      const healthData = await this.appService.getHealth(validatedParams.includeDetails);

      response.header('X-Content-Type-Options', 'nosniff');
      response.header('X-Frame-Options', 'DENY');
      response.header('X-XSS-Protection', '1; mode=block');
      response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      return response.status(HttpStatus.OK).json(healthData);
    } catch (error) {
      this.securityContext?.logSecurityEvent?.('HEALTH_CHECK_ERROR', {
        error: error.message,
        ip: ip,
        timestamp: new Date().toISOString(),
      });

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'فشل فحص الصحة',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Public()
  @Get('api/app/health')
  @ApiOperation({ summary: 'System Health Check' })
  async appHealth() {
    return {
      status: 'ok',
      module: 'app-root',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/infra/prisma/health')
  async prismaHealth(@Ip() ip: string) {
    try {
      const isDatabaseHealthy = await this.appService.verifyDatabaseConnection();
      if (!isDatabaseHealthy) {
        this.securityContext?.logSecurityEvent?.('DATABASE_HEALTH_FAILURE', {
          ip: ip,
          timestamp: new Date().toISOString(),
        });
        return { status: 'degraded', module: 'prisma-layer' };
      }
      return { status: 'ok', module: 'prisma-layer' };
    } catch (error) {
      this.securityContext?.logSecurityEvent?.('DATABASE_HEALTH_ERROR', {
        error: error.message,
        ip: ip,
        timestamp: new Date().toISOString(),
      });
      return { status: 'error', module: 'prisma-layer' };
    }
  }

  @Get('api/modules/:moduleName/health')
  @UseGuards(TenantScopedGuard)
  async moduleHealth(
    @Param('moduleName') moduleName: string,
    @Ip() ip: string,
    @Req() request: Request
  ) {
    const tenantId = (request as any)['tenantId'];
    try {
      await this.auditService.logOperation({
        tenantId: tenantId || 'system',
        userId: (request as any)['user']?.id || 'anonymous',
        action: 'module_health_check',
        target: moduleName,
        ip: ip
      });
      return { status: 'ok', module: moduleName, timestamp: new Date().toISOString() };
    } catch (error) {
      this.securityContext?.logSecurityEvent?.('MODULE_HEALTH_FAILURE', {
        module: moduleName,
        error: error.message,
        ip: ip,
        timestamp: new Date().toISOString(),
      });
      return { status: 'error', module: moduleName };
    }
  }
}
