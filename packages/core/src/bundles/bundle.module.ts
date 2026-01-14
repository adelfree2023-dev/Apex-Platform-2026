/**
 * Bundle Module
 */

import { Module } from '@nestjs/common';
import { BundleService } from './bundle.service';
import { BundleController } from './bundle.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BundleController],
    providers: [BundleService],
    exports: [BundleService],
})
export class BundleModule { }
