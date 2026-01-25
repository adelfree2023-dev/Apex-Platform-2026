import { Module, Global } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/monitoring/audit/audit.module';
import { TenantContextModule } from '../../common/security/tenant-context/tenant-context.module';
import { EncryptionModule } from '../../common/security/encryption/encryption.module';
import { AccessControlModule } from '../../common/access-control/access-control.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        AuditModule,
        TenantContextModule,
        EncryptionModule,
        AccessControlModule,
    ],
    controllers: [TenantsController],
    providers: [
        TenantsService,
    ],
    exports: [TenantsService],
})
export class TenantsModule { }
