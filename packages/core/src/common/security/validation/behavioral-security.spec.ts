import { SafeTextSchema, ExternalIdSchema } from './dto/base.dto';
import { UpdateProductSchema } from './dto/product.dto';

describe('Behavioral Security Tests (ASMP S3)', () => {
    describe('XSS Prevention (Cross-Site Scripting)', () => {
        const xssPayloads = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<svg/onload=alert(1)>',
            '"><script>alert(1)</script>',
            'javascript:alert(1)',
            '<a href="javascript:alert(1)">Click me</a>',
            '<div style="width: expression(alert(1));">',
            '<% alert(1) %>', // Template injection attempt
            '{{ 7*7 }}'        // Template injection attempt
        ];

        it('should strip or neutralize all XSS payloads in SafeTextSchema', () => {
            xssPayloads.forEach(payload => {
                const result = SafeTextSchema.parse(payload);
                // Result should NOT contain script tags or event handlers, or should be [removed]
                expect(result).not.toContain('<script');
                expect(result).not.toContain('onerror');
                expect(result).not.toContain('onload');

                if (payload.includes('javascript:') && result.includes('javascript:')) {
                    expect(result).toContain('[removed]');
                }

                // Ensure no raw script tags ever leak
                expect(result).not.toContain('<script');
            });
        });
    });

    describe('SQLi Prevention (SQL Injection)', () => {
        const sqliPayloads = [
            "' OR 1=1 --",
            "'; DROP TABLE users; --",
            "\" OR \"1\"=\"1",
            "admin'--",
            "1 UNION SELECT 1,2,3",
            "1; WAITFOR DELAY '0:0:5'",
            "../../etc/passwd" // Path traversal test
        ];

        it('should treat SQLi payloads as literal strings in ExternalIdSchema', () => {
            sqliPayloads.forEach(payload => {
                // ExternalIdSchema is a trimmed string. It should NOT throw, 
                // but it must NOT strip characters that would change the intent if it were being used in a raw query.
                // The security here is that Prisma (used elsewhere) parameterizes these.
                // However, we verify that the schema doesn't "clean" it in a way that might be bypassed.
                const result = ExternalIdSchema.parse(payload);
                expect(result).toBe(payload.trim());
            });
        });
    });

    describe('Mass Assignment Prevention', () => {
        it('should reject unexpected sensitive fields in UpdateProductSchema', () => {
            const maliciousPayload = {
                id: 1,
                name: 'Normal Update',
                isAdmin: true,           // Mass assignment attempt
                roles: ['SUPER_ADMIN'],  // Mass assignment attempt
                tenantId: 'hacked-id'    // Shouldn't be allowed in UpdateProductSchema if not defined
            };

            // Zod by default ignores extra fields if not using .strict(), 
            // but UpdateProductSchema is built from ProductObject which doesn't have these.
            const result = UpdateProductSchema.parse(maliciousPayload);

            expect(result).not.toHaveProperty('isAdmin');
            expect(result).not.toHaveProperty('roles');
            expect(result).not.toHaveProperty('tenantId');
            expect(result).toMatchObject({ id: 1, name: 'Normal Update' });
        });
    });
});
