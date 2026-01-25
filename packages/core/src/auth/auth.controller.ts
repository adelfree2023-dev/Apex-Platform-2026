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
import { Action } from '../common/decorators/action.decorator';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
        private readonly rateLimiter: RateLimiterService,
    ) { }

    @Post('login')
    @ApiSecurity('X-Request-ID')
    @ApiOperation({ summary: 'تسجيل الدخول' })
    async login(@Body() loginDto: LoginDto, @Req() request: Request, @Res() response: Response, @Ip() ip: string) {
        const body = loginDto;
        const tenantId = (request as any).tenant?.id || (request as any).tenantId;

        // ✅ S6: تطبيق حدود المعدل على مستوى المستخدم والمستأجر
        const rateKey = `login:${body.email}:${tenantId || ip}`;
        const rateLimitResult = await this.rateLimiter.consume(rateKey, 5, 2);

        if (!rateLimitResult.allowed) {
            this.logger.warn(`محاولة تسجيل دخول كثيرة من: ${body.email} للمستأجر ${tenantId}`);
            this.securityContext.logSecurityEvent('RATE_LIMIT_EXCEEDED', { email: body.email, tenantId, ip });
            return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'عدد المحاولات تجاوز الحد المسموح به. الرجاء المحاولة لاحقاً',
                timestamp: new Date().toISOString(),
            });
        }

        try {
            // ✅ S3: التحقق والتطهير من المدخلات
            const ctx = require('../common/utils/security.utils').extractContext(request);
            const validated = await this.inputValidator.secureValidate(LoginRequestSchema, body, 'auth.login');

            this.securityContext.logSecurityEvent('LOGIN_ATTEMPT', {
                email: validated.email,
                ...ctx
            });

            const result = await this.authService.login(validated, tenantId, ctx.ip);
            return response.status(HttpStatus.OK).json(result);
        } catch (error) {
            const ctx = require('../common/utils/security.utils').extractContext(request);
            this.securityContext.logSecurityEvent('LOGIN_FAILURE', {
                email: body?.email || '[REDACTED]',
                errorType: error.name,
                ...ctx
            });
            // ✅ S12: إضافة تأخير زمني متغير لمنع هجمات القوة الغاشمة
            const variableDelay = Math.floor(Math.random() * 1000) + 1500; // 1500-2500ms
            await constantTimeDelay(variableDelay);
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
    async register(@Body() registerDto: RegisterDto, @Req() request: Request, @Res() response: Response, @Ip() ip: string) {
        const body = registerDto;
        const tenantId = (request as any).tenant?.id || (request as any).tenantId;

        // ✅ S6: حماية ضد هجمات إنشاء الحسابات
        const rateKey = `register:${body.email}:${ip}`;
        const rateLimitResult = await this.rateLimiter.consume(rateKey, 3, 1);

        if (!rateLimitResult.allowed) {
            return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'تم تجاوز حد إنشاء الحسابات. الرجاء المحاولة لاحقاً',
                timestamp: new Date().toISOString(),
            });
        }

        try {
            const ctx = require('../common/utils/security.utils').extractContext(request);
            const validated = await this.inputValidator.secureValidate(RegisterRequestSchema, body, 'auth.register');

            this.securityContext.logSecurityEvent('REGISTRATION_ATTEMPT', {
                email: validated.email,
                tenantId,
                ...ctx
            });

            const result = await this.authService.register(validated, tenantId, ip);
            return response.status(HttpStatus.CREATED).json(result);
        } catch (error) {
            const ctx = require('../common/utils/security.utils').extractContext(request);
            this.securityContext.logSecurityEvent('REGISTRATION_FAILURE', {
                email: body?.email || '[REDACTED]',
                errorType: error.name,
                tenantId,
                ...ctx
            });
            await constantTimeDelay(1000);
            return response.status(HttpStatus.BAD_REQUEST).json({
                statusCode: HttpStatus.BAD_REQUEST,
                message: error.message || 'فشل في إنشاء الحساب',
                timestamp: new Date().toISOString(),
            });
        }
    }
}
