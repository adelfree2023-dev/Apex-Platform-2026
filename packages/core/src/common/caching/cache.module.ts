import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import * as redisStore from 'cache-manager-redis-store';

@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                store: redisStore,
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                ttl: 600,
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [CacheService],
    exports: [CacheService, NestCacheModule],
})
export class CacheModule { }
