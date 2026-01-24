import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
    let service: CacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CacheService],
        }).compile();

        service = module.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should set and get values', async () => {
        await service.set('test-key', 'test-value');
        expect(await service.get('test-key')).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
        expect(await service.get('missing')).toBeNull();
    });

    it('should delete keys', async () => {
        await service.set('key-to-del', 'val');
        await service.del('key-to-del');
        expect(await service.get('key-to-del')).toBeNull();
    });

    it('should clear all keys', async () => {
        await service.set('k1', 'v1');
        await service.set('k2', 'v2');
        await service.clear();
        expect(await service.get('k1')).toBeNull();
        expect(await service.get('k2')).toBeNull();
    });
});
