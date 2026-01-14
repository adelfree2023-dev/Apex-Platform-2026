import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [EventsModule],
    providers: [TenantsService],
    controllers: [TenantsController],
    exports: [TenantsService],
})
export class TenantsModule { }
