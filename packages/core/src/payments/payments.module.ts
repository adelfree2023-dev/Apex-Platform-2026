/**
 * Payments Module
 * Stripe payment integration for Apex Platform
 */

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, StripeWebhookController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        PrismaModule,
        EventsModule,
    ],
    controllers: [PaymentsController, StripeWebhookController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
