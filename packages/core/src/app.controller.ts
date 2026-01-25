import {
  Controller,
  Get,
  Req,
  Res,
  HttpStatus,
  Headers,
  Ip,
  Query,
  Optional,
  UseFilters,
  UseGuards,
  Param,
  BadRequestException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { Request, Response } from 'express';
import { z } from 'zod';
import { SecurityContext } from './common/security/security.context';
import { Public } from './common/decorators/public.decorator';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import { TenantScopedGuard } from './common/access-control/guards/tenant-scoped.guard';

// 🔒 مخطط التحقق من صحة معلمات الصحة
const healthCheckSchema = z.object({
  includeDetails: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  tenantId: z.string().uuid().optional(),
  service: z.string().optional()
});

@ApiTags('health')
@Controller()
@UseFilters(AllExceptionsFilter) // ✅ S5: توحيد معالجة الأخطاء
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
    @Query('service') service?: string,
  ) {
    try {
      // ✅ S5: التحقق من صحة المدخلات
      const validationResult = healthCheckSchema.safeParse({
        includeDetails: includeDetails,
        tenantId: headers['x-tenant-id'] || (request as any).params?.tenantId,
        service: service
      });

      if (!validationResult.success) {
        throw new BadRequestException('معلمات طلب التحقق من الصحة غير صالحة');
      }

      const result = await this.appService.getHealth(
        validationResult.data.includeDetails
      );

      // ✅ S5: تسجيل التدقيق
      await this.auditService.logOperation({
        action: 'HEALTH_CHECK',
        userId: 'system',
        tenantId: 'system',
        details: { service: validationResult.data.service }
      });

      response.header('X-Content-Type-Options', 'nosniff');
      response.header('X-Frame-Options', 'DENY');
      response.header('X-XSS-Protection', '1; mode=block');
      response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      return response.status(HttpStatus.OK).json(result);
    } catch (error) {
      // ✅ S5: عدم تسريب معلومات النظام في الأخطاء
      this.logger.error(`خطأ في التحقق من الصحة: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }
    }
  }

  @Public()
  @Get('api/api/docs')
  @ApiOperation({ summary: 'Swagger Alias for Verification' })
  async swaggerAlias(@Res() res: Response) {
    return res.redirect('/api/docs');
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
    } catch (error: any) {
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
    // 🛡️ S3: التحقق من صحة معلمات المسار (Zod)
    const moduleSchema = z.object({
      moduleName: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/i),
      tenantId: z.string().uuid().optional(),
    });

    const validation = moduleSchema.safeParse({
      moduleName,
      tenantId: (request as any).tenant?.id
    });

    if (!validation.success) {
      this.logger.warn(`محاولة فحص صحة وحدة غير صالحة: ${moduleName}`);
      throw new BadRequestException('اسم الوحدة غير صالح');
    }

    try {
      await this.auditService.logOperation({
        tenantId: validation.data.tenantId || 'system',
        userId: (request as any)['user']?.id || 'anonymous',
        action: 'module_health_check',
        target: validation.data.moduleName,
        ip: ip
      });
      return { status: 'ok', module: validation.data.moduleName, timestamp: new Date().toISOString() };
    } catch (error: any) {
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
