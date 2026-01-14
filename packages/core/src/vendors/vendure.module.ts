import { Module } from '@nestjs/common';
import { VendureService } from './vendure.service';
import { VendureController } from './vendure.controller';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [EventsModule],
    providers: [VendureService],
    controllers: [VendureController],
    exports: [VendureService],
})
export class VendureModule { }
