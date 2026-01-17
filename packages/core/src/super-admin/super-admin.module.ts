/**
 * Admin Module
 */

import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { HQAuthService } from './hq-auth.service';
import { HQAuthController } from './hq-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SuperAdminController, HQAuthController],
    providers: [SuperAdminService, HQAuthService],
    exports: [SuperAdminService, HQAuthService],
})
export class SuperAdminModule { }
