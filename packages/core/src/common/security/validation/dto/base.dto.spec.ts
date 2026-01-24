import { BaseSchema, BaseInputSchema, secureValidate } from './base.dto';

describe('BaseDTO Validation', () => {
    describe('BaseSchema', () => {
        it('should validate correct UUIDs for tenantId and userId', () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(BaseSchema.tenantId.parse(validUuid)).toBe(validUuid);
            expect(BaseSchema.userId.parse(validUuid)).toBe(validUuid);
        });

        it('should reject malformed UUIDs', () => {
            expect(() => BaseSchema.tenantId.parse('not-a-uuid')).toThrow();
            expect(() => BaseSchema.tenantId.parse('123e4567-e89b-12d3-a456-42661417400')).toThrow(); // missing one char
        });

        it('should sanitize safeText and remove all HTML tags', () => {
            const input = '<script>alert(1)</script><b>Bold</b> <a href="http://evil.com">Link</a>';
            const output = BaseSchema.safeText.parse(input);
            expect(output).toBe('Bold Link');
        });

        it('should normalize email addresses', () => {
            expect(BaseSchema.emailAddress.parse('  UPPER@Example.COM  ')).toBe('upper@example.com');
            expect(() => BaseSchema.emailAddress.parse('invalid-email')).toThrow();
        });

        it('should validate and clean phone numbers', () => {
            expect(BaseSchema.phoneNumber.parse('+1 800-555-0199')).toBe('18005550199');
            expect(() => BaseSchema.phoneNumber.parse('123')).toThrow();
        });

        it('should coerce string numbers', () => {
            expect(BaseSchema.number.parse('123.45')).toBe(123.45);
        });

        it('should handle non-string inputs in phoneNumber preprocess', () => {
            expect(BaseSchema.phoneNumber.parse(1234567890 as any)).toBe('1234567890');
        });
    });

    describe('BaseInputSchema', () => {
        it('should strip scripts from all string fields during transform', () => {
            const tenantId = '123e4567-e89b-12d3-a456-426614174000';
            const userId = '123e4567-e89b-12d3-a456-426614174001';
            const input = {
                tenantId,
                userId,
                extra: '<script>evil()</script>content',
                callback: 'javascript:alert(1)',
                event: 'onclick=click()'
            };

            const result = BaseInputSchema.parse(input);
            expect(result.extra).toBe('content');
            expect(result.callback).toBe('alert(1)');
            expect(result.event).toBe('click()');
        });

        it('should reject if timestamp is too old or in future', () => {
            const tenantId = '123e4567-e89b-12d3-a456-426614174000';
            const userId = '123e4567-e89b-12d3-a456-426614174001';

            const tooOld = Date.now() - 70000;
            expect(() => BaseInputSchema.parse({ tenantId, userId, timestamp: tooOld })).toThrow();
        });
    });

    describe('secureValidate', () => {
        it('should successfully validate valid data and inject requestId/timestamp', () => {
            const tenantId = '123e4567-e89b-12d3-a456-426614174000';
            const userId = '123e4567-e89b-12d3-a456-426614174001';
            const data = { tenantId, userId };

            const result = secureValidate(BaseInputSchema, data);
            expect(result.tenantId).toBe(tenantId);
            expect(result.requestId).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });

        it('should use provided requestId and timestamp if present', () => {
            const tenantId = '123e4567-e89b-12d3-a456-426614174000';
            const userId = '123e4567-e89b-12d3-a456-426614174001';
            const requestId = '123e4567-e89b-12d3-a456-426614174002';
            const timestamp = Date.now();
            const data = { tenantId, userId, requestId, timestamp };

            const result = secureValidate(BaseInputSchema, data);
            expect(result.requestId).toBe(requestId);
            expect(result.timestamp).toBe(timestamp);
        });

        it('should throw "فشل التحقق من صحة المدخلات" on validation error', () => {
            expect(() => secureValidate(BaseInputSchema, {})).toThrow('فشل التحقق من صحة المدخلات');
        });

        it('should use fallback requestId generator if randomUUID fails', () => {
            const crypto = require('crypto');
            const originalRandomUUID = crypto.randomUUID;
            crypto.randomUUID = jest.fn().mockImplementation(() => { throw new Error('Not supported'); });

            const data = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                userId: '123e4567-e89b-12d3-a456-426614174001'
            };

            const result = secureValidate(BaseInputSchema, data);
            expect(result.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

            crypto.randomUUID = originalRandomUUID;
        });
    });
});
