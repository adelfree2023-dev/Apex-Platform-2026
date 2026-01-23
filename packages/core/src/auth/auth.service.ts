import { Injectable, UnauthorizedException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../common/security/encryption/encrypted-field.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { z } from 'zod';
import { generateSecureHash, verifySecureHash } from '../common/utils/crypto.utils';

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const RegisterSchema = z.object({ email: z.string().email(), password: z.string().min(12).max(128), name: z.string().min(2) });

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptedFieldService,
        private readonly anomalyService: AnomalyDetectionService,
        private readonly rateLimiter: RateLimiterService,
        private readonly auditService: AuditService,
        private readonly securityContext: SecurityContext,
        private readonly inputValidator: InputValidatorService,
    ) { }

    async login(data: LoginDto, tenantId: string, ip: string) {
        const validated = await this.inputValidator.secureValidate<z.infer<typeof LoginSchema>>(LoginSchema, data, 'auth.login');
        const rateLimited = await this.rateLimiter.consume(`auth:${validated.email}:${tenantId}`);
        if (!rateLimited) {
            await this.auditService.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
                severity: 'HIGH',
                details: { email: validated.email, tenantId, ip }
            });
            throw new ForbiddenException('طلبات كثيرة جداً');
        }

        try {
            const schema = await this.tenantContext.getTenantSchema(tenantId);
            const users = (await this.prisma.$queryRawUnsafe(`
                SELECT id, email, password_hash, role FROM "${schema}"."vendure_user" 
                WHERE email = $1 AND status = 'active' LIMIT 1
            `, validated.email.toLowerCase())) as any[];

            if (!users || users.length === 0 || !(await verifySecureHash(validated.password, users[0].password_hash))) {
                // 🛡️ S3: تسجيل محاولة فاشلة في كاش كشف الشذوذ
                this.anomalyService.inspectFailedLogin(tenantId, validated.email, ip);

                // 🛡️ S4: تسجيل محاولة فاشلة في سجلات الأمان
                await this.auditService.logSecurityEvent('LOGIN_FAILED', {
                    severity: 'MEDIUM',
                    details: { email: validated.email, tenantId, ip }
                });

                throw new UnauthorizedException('بيانات الاعتماد غير صالحة');
            }

            // 🛡️ S4: تسجيل نجاح الدخول
            await this.auditService.logActivity({
                tenantId,
                userId: users[0].id.toString(),
                action: 'USER_LOGIN_SUCCESS',
                details: { email: validated.email, ip }
            });

            return this.generateTokens(users[0].id, tenantId, users[0].role);
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ForbiddenException) throw error;

            await this.auditService.logSecurityEvent('AUTH_SYSTEM_ERROR', {
                severity: 'CRITICAL',
                details: { error: error.message, tenantId, context: 'login' }
            });
            throw new InternalServerErrorException('فشل عملية تسجيل الدخول');
        }
    }

    private async generateTokens(userId: number, tenantId: string, role: string) {
        const payload = { sub: userId, tenantId, role };
        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        };
    }

    async register(data: RegisterDto, tenantId: string, ip: string) {
        const validated = await this.inputValidator.secureValidate<z.infer<typeof RegisterSchema>>(RegisterSchema, data, 'auth.register');
        const schema = await this.tenantContext.getTenantSchema(tenantId);
        const passwordHash = await generateSecureHash(validated.password);
        try {
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${schema}"."vendure_user" (email, password_hash, name, role, status, created_at)
                VALUES ($1, $2, $3, 'customer', 'active', NOW())
            `, validated.email.toLowerCase(), passwordHash, validated.name);

            // 🛡️ S4: تسجيل نجاح التسجيل
            await this.auditService.logActivity({
                tenantId,
                userId: 'anonymous', // سيبدأ الاستخدام بعد التفعيل
                action: 'USER_REGISTERED',
                details: { email: validated.email, ip }
            });

            return { success: true };
        } catch (error) {
            await this.auditService.logSecurityEvent('USER_REGISTRATION_FAILED', {
                severity: 'HIGH',
                details: { error: error.message, email: validated.email, tenantId }
            });
            throw new InternalServerErrorException('فشل عملية التسجيل');
        }
    }
}
