import { Module, Global } from '@nestjs/common';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantContextModule } from '../security/tenant-context/tenant-context.module';
import { SecurityContextModule } from '../security/security.context.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        TenantContextModule,
        SecurityContextModule,
    ],
    providers: [
        AnomalyDetectionService,
        RateLimiterService,
    ],
    exports: [
        AnomalyDetectionService,
        RateLimiterService,
    ],
})
export class AccessControlModule { }
