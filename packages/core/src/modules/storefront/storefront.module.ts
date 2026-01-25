import { Module, forwardRef, Global } from '@nestjs/common';
import { ShopController } from './controllers/shop.controller';
import { PaymentController } from './controllers/payment.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ModuleHealthController } from './controllers/health.controller';
import { ShopService } from './services/shop.service';
import { PaymentService } from './services/payment.service';
import { DashboardService } from './services/dashboard.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantContextModule } from '../../common/security/tenant-context/tenant-context.module';
import { AccessControlModule } from '../../common/access-control/access-control.module';
import { EncryptionModule } from '../../common/security/encryption/encryption.module';
import { AuditModule } from '../../common/monitoring/audit/audit.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { MailModule } from '../../common/communication/mail.module';
import { CacheModule } from '../../common/caching/cache.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        TenantContextModule,
        AccessControlModule,
        EncryptionModule,
        AuditModule,
        ProductsModule,
        CategoriesModule,
        MailModule,
        CacheModule,
    ],
    controllers: [
        ShopController,
        PaymentController,
        DashboardController,
        ModuleHealthController,
    ],
    providers: [
        ShopService,
        PaymentService,
        DashboardService,
    ],
    exports: [
        ShopService,
        PaymentService,
        DashboardService,
    ],
})
export class StorefrontModule { }
