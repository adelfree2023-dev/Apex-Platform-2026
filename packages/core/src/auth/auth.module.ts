import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../common/security/encryption/encrypted-field.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';

/**
 * 🏰 Digital Fortress: Auth Module
 * - مسؤول عن جميع عمليات المصادقة والتفويض
 * - يطبق ممارسات الأمان الصارمة
 * - يدعم عزل المستأجرين وتسجيل التدقيق
 */
@Global()
@Module({
    imports: [
        PrismaModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_SECRET || 'apex-platform-secret-key-change-in-production',
                signOptions: {
                    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
                    algorithm: 'HS256',
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        TenantContextService,
        EncryptedFieldService,
        AnomalyDetectionService,
        RateLimiterService,
        AuditService,
        SecurityContext,
        InputValidatorService,
    ],
    exports: [AuthService],
})
export class AuthModule { }

