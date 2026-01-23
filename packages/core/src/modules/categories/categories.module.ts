import { Module } from '@nestjs/common';
import { CategoryService } from './services/category.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoriesModule { }
