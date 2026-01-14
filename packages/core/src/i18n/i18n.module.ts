/**
 * i18n Module
 */

import { Module } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { SmsService } from './sms.service';
import { I18nController } from './i18n.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [I18nController],
    providers: [I18nService, SmsService],
    exports: [I18nService, SmsService],
})
export class I18nModule { }
