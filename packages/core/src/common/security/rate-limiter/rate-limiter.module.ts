import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from '../../access-control/services/rate-limiter.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [RateLimiterService],
    exports: [RateLimiterService],
})
export class RateLimiterModule { }
