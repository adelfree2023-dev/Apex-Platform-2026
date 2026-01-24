import { Module, Global, Provider, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityContext } from './security.context';
import { AuditService } from '../monitoring/audit/audit.service';

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
    ],
    providers: [
        SecurityContext,
        {
            provide: 'SECURITY_LOGGER_FACTORY',
            useFactory: (configService: ConfigService, auditService?: AuditService) => {
                return {
                    createLogger: (context: string) => {
                        return {
                            logEvent: (event: string, details: any) => {
                                if (auditService) {
                                    auditService.logSecurityEvent(event, { ...details, context });
                                } else {
                                    console.log(`[FALLBACK_LOG] ${context}: ${event}`, details);
                                }
                            }
                        };
                    }
                };
            },
            inject: [ConfigService, { token: AuditService, optional: true }],
        },
    ],
    exports: [
        SecurityContext,
        'SECURITY_LOGGER_FACTORY',
    ],
})
export class SecurityContextModule { }
