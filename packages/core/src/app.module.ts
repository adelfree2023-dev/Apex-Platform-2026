import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { VendureModule } from './vendors/vendure.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
    imports: [
        PrismaModule,
        TenantsModule,
        EventsModule,
        VendureModule,
        PaymentsModule,
        AdminModule,
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

