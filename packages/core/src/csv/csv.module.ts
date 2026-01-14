/**
 * CSV Module
 */

import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';
import { CsvController } from './csv.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CsvController],
    providers: [CsvService],
    exports: [CsvService],
})
export class CsvModule { }
