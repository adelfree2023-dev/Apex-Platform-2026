import { Module, Global } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/monitoring/audit/audit.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        AuditModule,
    ],
    controllers: [TenantsController],
    providers: [
        TenantsService,
    ],
    exports: [TenantsService],
})
export class TenantsModule { }
