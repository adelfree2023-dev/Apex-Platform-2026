import { Module, Global, Provider, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityContext } from './security.context';
import { AuditModule } from '../monitoring/audit/audit.module';

/**
* 🏰 Digital Fortress: SecurityContext Module (S5)
* - وحدة مخصصة لتوفير SecurityContext
* - فصل التبعيات وإزالة الحلقات الدائرية
* - ضمان توفر الخدمات المطلوبة
* - دعم التهيئة قبل بدء التطبيق
*/
@Global()
@Module({
    imports: [
        ConfigModule,
        forwardRef(() => AuditModule), // للحصول على AuditService
    ],
    providers: [
        SecurityContext,
        {
            provide: 'SECURITY_CONTEXT_FACTORY',
            useFactory: (configService: ConfigService) => {
                return {
                    validateEnvironment: () => SecurityContext.validateEnvironment(configService),
                    create: () => new SecurityContext(undefined, configService),
                };
            },
            inject: [ConfigService],
        },
    ],
    exports: [
        SecurityContext,
        'SECURITY_CONTEXT_FACTORY',
    ],
})
export class SecurityContextModule { }
