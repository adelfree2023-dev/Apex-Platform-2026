import { Module, Global } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TenantContextModule } from '../../security/tenant-context/tenant-context.module';
import { ValidationModule } from '../../security/validation/validation.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        TenantContextModule,
        ValidationModule,
    ],
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
