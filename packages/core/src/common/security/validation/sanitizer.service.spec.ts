import { Test, TestingModule } from '@nestjs/testing';
import { SanitizerService } from './sanitizer.service';

describe('SanitizerService', () => {
    let service: SanitizerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SanitizerService],
        }).compile();

        service = module.get<SanitizerService>(SanitizerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should remove script tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        expect(service.sanitize(input)).toBe('Hello');
    });

    it('should remove event handlers', () => {
        const input = '<img src="x" onerror="alert(1)">';
        // With whiteList: {}, all tags are stripped
        expect(service.sanitize(input)).toBe('');
    });

    it('should sanitize nested objects', () => {
        const input = {
            name: '<b>John</b>',
            meta: {
                bio: '<script>hack()</script>Safe',
                age: 30
            }
        };
        const expected = {
            name: 'John',
            meta: {
                bio: 'Safe',
                age: 30
            }
        };
        expect(service.sanitizeObject(input)).toEqual(expected);
    });

    it('should return non-string values as is', () => {
        expect(service.sanitize(null as any)).toBe(null);
        expect(service.sanitize(123 as any)).toBe(123);
    });
});
