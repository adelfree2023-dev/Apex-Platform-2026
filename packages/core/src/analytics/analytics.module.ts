/**
 * Analytics Module
 */

import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AnalyticsController, AdvancedAnalyticsController],
    providers: [AnalyticsService, AdvancedAnalyticsService],
    exports: [AnalyticsService, AdvancedAnalyticsService],
})
export class AnalyticsModule { }

