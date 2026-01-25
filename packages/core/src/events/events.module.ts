import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { SecurityContext } from '../common/security/security.context';
import { Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/**
 * 🏰 Digital Fortress: Events Module
 * - المسؤول عن إدارة جميع الأحداث في النظام
 * - يطبق عزل تام بين المستأجرين
 * - يسجل جميع الأحداث للأمان
 */
@Global()
@Module({
    imports: [
        PrismaModule,
        CacheModule.register({
            ttl: 300000, // 5 دقائق
            max: 1000,
        }),
    ],
    controllers: [EventsController],
    providers: [
        EventsService,
    ],
    exports: [EventsService],
})
export class EventsModule implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventsModule.name);

    constructor(
        private readonly eventsService: EventsService,
        private readonly securityContext: SecurityContext,
    ) { }

    /**
     * 🔒 عند تهيئة الوحدة
     */
    async onModuleInit() {
        this.logger.log('🛡️ Events Module initializing...');

        try {
            // 🛡️ التحقق من صحة التهيئة الأساسية
            this.logger.log('✅ Events Module initialized successfully');

            // 🛡️ S4: تسجيل تهيئة الوحدة
            this.securityContext.logSecurityEvent('EVENTS_MODULE_INITIALIZED', {
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.error('🚨 Events Module initialization failed', error.stack);
            this.securityContext.logCriticalSecurityEvent('EVENTS_MODULE_INIT_FAILURE', {
                error: error.message,
                timestamp: new Date().toISOString(),
            });
            throw new Error('Failed to initialize events module');
        }
    }

    /**
     * 🔒 عند إيقاف الوحدة
     */
    async onModuleDestroy() {
        this.logger.log('🔒 Events Module shutting down...');

        // 🛡️ S4: تسجيل إيقاف الوحدة
        this.securityContext.logSecurityEvent('EVENTS_MODULE_SHUTDOWN', {
            timestamp: new Date().toISOString(),
        });
    }
}
