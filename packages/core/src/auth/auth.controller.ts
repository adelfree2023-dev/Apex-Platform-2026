import { Controller, Post, Body, Req, Res, HttpStatus, Ip, UseGuards, UseInterceptors, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { TenantScopedGuard } from '../common/access-control/guards/tenant-scoped.guard';
import { LicenseGuard } from '../common/access-control/guards/license.guard';
import { DefenseInterceptor } from '../common/presentation/interceptors/defense.interceptor';
import { AuditLoggerInterceptor } from '../common/monitoring/audit/audit-logger.interceptor';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { constantTimeDelay } from '../common/utils/security.utils';
import { z } from 'zod';

const LoginRequestSchema = z.object({
    email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صالحة' }),
    password: z.string().min(8, { message: 'كلمة المرور قصيرة جداً' }),
});

const RegisterRequestSchema = z.object({
    email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صالحة' }),
    password: z.string().min(12, { message: 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل' }).max(128),
    name: z.string().min(2, { message: 'الاسم قصير جداً' }),
});

@ApiTags('auth')
@Controller('api/auth')
@UseGuards(TenantScopedGuard, LicenseGuard)
@UseInterceptors(DefenseInterceptor, AuditLoggerInterceptor)
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(
        private readonly authService: AuthService,
        private readonly securityContext: SecurityContext,
        private readonly inputValidator: InputValidatorService,
    ) { }

    @Post('login')
    @ApiSecurity('X-Request-ID')
    @ApiOperation({ summary: 'تسجيل الدخول' })
    async login(@Body() body: any, @Req() request: Request, @Res() response: Response, @Ip() ip: string) {
        const tenantId = (request as any).tenantId;
        try {
            const validated = await this.inputValidator.secureValidate(LoginRequestSchema, body, 'auth.login');
            this.securityContext.logSecurityEvent('LOGIN_ATTEMPT', { email: validated.email, tenantId, ip });
            const result = await this.authService.login(validated, tenantId, ip);
            return response.status(HttpStatus.OK).json(result);
        } catch (error) {
            this.securityContext.logSecurityEvent('LOGIN_FAILURE', { email: body?.email || '[REDACTED]', tenantId, ip, errorType: error.name });
            await constantTimeDelay(1500);
            return response.status(HttpStatus.UNAUTHORIZED).json({
                statusCode: HttpStatus.UNAUTHORIZED,
                message: 'بيانات اعتماد غير صالحة',
                timestamp: new Date().toISOString(),
            });
        }
    }

    @Post('register')
    @ApiSecurity('X-Request-ID')
    @ApiOperation({ summary: 'إنشاء حساب جديد' })
    async register(@Body() body: any, @Req() request: Request, @Res() response: Response, @Ip() ip: string) {
        const tenantId = (request as any).tenantId;
        try {
            const validated = await this.inputValidator.secureValidate(RegisterRequestSchema, body, 'auth.register');
            const result = await this.authService.register(validated, tenantId, ip);
            return response.status(HttpStatus.CREATED).json(result);
        } catch (error) {
            await constantTimeDelay(1000);
            return response.status(HttpStatus.BAD_REQUEST).json({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'فشل في إنشاء الحساب',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
