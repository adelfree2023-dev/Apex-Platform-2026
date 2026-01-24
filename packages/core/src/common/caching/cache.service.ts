import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private cache = new Map<string, any>();

    async get<T>(key: string): Promise<T | null> {
        return this.cache.get(key) || null;
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        this.cache.set(key, value);
    }

    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}
