import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';

@Controller('api')
export class ModuleHealthController {
    @Public()
    @Get('storefront/shop/health')
    shopHealth() {
        return { status: 'ok', module: 'shop' };
    }

    @Public()
    @Get('storefront/payment/health')
    paymentHealth() {
        return { status: 'ok', module: 'payment' };
    }

    @Public()
    @Get('categories/health')
    categoriesHealth() {
        return { status: 'ok', module: 'categories' };
    }
}
