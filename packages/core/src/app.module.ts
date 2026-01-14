import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { VendureModule } from './vendors/vendure.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { NotificationModule } from './notifications/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { PromotionsModule } from './promotions/promotions.module';
import { I18nModule } from './i18n/i18n.module';
import { AuthModule } from './auth/auth.module';
import { ShippingModule } from './shipping/shipping.module';
import { BundleModule } from './bundles/bundle.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
    imports: [
        PrismaModule,
        TenantsModule,
        EventsModule,
        VendureModule,
        PaymentsModule,
        AdminModule,
        NotificationModule,
        AnalyticsModule,
        SearchModule,
        PromotionsModule,
        I18nModule,
        AuthModule,
        ShippingModule,
        BundleModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .exclude('health', 'api/admin/(.*)', 'api/shop/(.*)', 'api/webhooks/(.*)')
            .forRoutes('*');
    }
}

