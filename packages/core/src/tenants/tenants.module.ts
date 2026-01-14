import { Module, forwardRef } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { EventsModule } from '../events/events.module';
import { VendureModule } from '../vendors/vendure.module';

@Module({
    imports: [
        EventsModule,
        forwardRef(() => VendureModule),
    ],
    providers: [TenantsService],
    controllers: [TenantsController],
    exports: [TenantsService],
})
export class TenantsModule { }

