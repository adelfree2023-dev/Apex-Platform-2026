import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductsModule { }
