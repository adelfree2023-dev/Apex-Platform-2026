import { Module, Global } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantContextService } from '../../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../../common/security/encryption/encrypted-field.service';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [TenantsController],
    providers: [
        TenantsService,
        TenantContextService,
        EncryptedFieldService,
    ],
    exports: [TenantsService, TenantContextService, EncryptedFieldService],
})
export class TenantsModule { }
