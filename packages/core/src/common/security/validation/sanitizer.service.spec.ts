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

    it('should sanitize nested objects recursively', () => {
        const input = {
            name: '<b>John</b>',
            meta: {
                bio: '<script>hack()</script>Safe',
                tags: ['<i>api</i>', 'clean'],
                age: 30
            },
            data: [
                { id: 1, text: '<img src=x onerror=alert(1)>' },
                { id: 2, text: 'valid' }
            ]
        };
        const expected = {
            name: 'John',
            meta: {
                bio: 'Safe',
                tags: ['api', 'clean'],
                age: 30
            },
            data: [
                { id: 1, text: '' },
                { id: 2, text: 'valid' }
            ]
        };
        expect(service.sanitizeObject(input)).toEqual(expected);
    });

    it('should handle null, undefined, and non-string values gracefully', () => {
        expect(service.sanitize(null as any)).toBe(null);
        expect(service.sanitize(undefined as any)).toBe(undefined);
        expect(service.sanitize(123 as any)).toBe(123);
        
        const obj = { a: null, b: 123, c: '<b>hi</b>' };
        expect(service.sanitizeObject(obj)).toEqual({ a: null, b: 123, c: 'hi' });
    });

    it('should handle arrays correctly in sanitizeObject', () => {
        const input = ['<b>bold</b>', { text: '<i>italic</i>' }];
        const expected = ['bold', { text: 'italic' }];
        expect(service.sanitizeObject(input)).toEqual(expected);
    });
});
