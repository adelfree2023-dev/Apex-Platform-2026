import { Module, Global } from '@nestjs/common';
import { ApexConfigService } from './apex-config.service';
import { SystemInitializationService } from './system-initialization.service';
import { SystemHealthService } from './system-health.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

/**
 * 🏰 Apex Core: Heart of the System
 * - Providers global shared services
 * - Centralizes configuration and initialization
 */
@Global()
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
    ],
    providers: [
        ApexConfigService,
        SystemInitializationService,
        SystemHealthService,
    ],
    exports: [
        ApexConfigService,
        SystemInitializationService,
        SystemHealthService,
        PrismaModule,
    ],
})
export class CoreModule { }
