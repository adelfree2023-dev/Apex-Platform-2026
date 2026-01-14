/**
 * Payments Module
 * Multi-channel payment integration for Apex Platform
 */

import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController, StripeWebhookController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        PrismaModule,
        EventsModule,
    ],
    controllers: [PaymentsController, StripeWebhookController],
    providers: [PaymentsService, PaymentGatewayService],
    exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule { }

