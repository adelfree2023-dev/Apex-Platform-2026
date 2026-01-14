/**
 * SEO Module
 */

import { Module } from '@nestjs/common';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SeoController],
    providers: [SeoService],
    exports: [SeoService],
})
export class SeoModule { }
