import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { VendureModule } from './vendors/vendure.module';
import { PaymentsModule } from './payments/payments.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { NotificationModule } from './notifications/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { PromotionsModule } from './promotions/promotions.module';
import { I18nModule } from './i18n/i18n.module';
import { AuthModule } from './auth/auth.module';
import { ShippingModule } from './shipping/shipping.module';
import { BundleModule } from './bundles/bundle.module';
import { WishlistModule } from './wishlists/wishlist.module';
import { SeoModule } from './seo/seo.module';
import { CsvModule } from './csv/csv.module';
import { RfqModule } from './rfq/rfq.module';
import { SubscriptionModule } from './subscriptions/subscription.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { BookingModule } from './bookings/booking.module';
import { AiModule } from './ai/ai.module';
import { AffiliateModule } from './affiliates/affiliate.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AuditModule } from './audit/audit.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
    imports: [
        // ✅ Security: Rate Limiting (Plan-Based)
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,    // 1 second
                limit: 5,     // 5 requests per second
            },
            {
                name: 'medium',
                ttl: 10000,   // 10 seconds
                limit: 30,    // 30 requests per 10 seconds
            },
            {
                name: 'long',
                ttl: 60000,   // 1 minute
                limit: 100,   // 100 requests per minute (Starter plan)
            },
        ]),
        PrismaModule,
        TenantsModule,
        EventsModule,
        VendureModule,
        PaymentsModule,
        SuperAdminModule,
        NotificationModule,
        AnalyticsModule,
        SearchModule,
        PromotionsModule,
        I18nModule,
        AuthModule,
        ShippingModule,
        BundleModule,
        WishlistModule,
        SeoModule,
        CsvModule,
        RfqModule,
        SubscriptionModule,
        LoyaltyModule,
        BookingModule,
        AiModule,
        AffiliateModule,
        MarketplaceModule,
        AuditModule, // ✅ Security: Audit Logging
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // ✅ Security: Global Rate Limiting Guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .exclude('health', 'api/admin/(.*)', 'api/shop/(.*)', 'api/webhooks/(.*)')
            .forRoutes('*');
    }
}

