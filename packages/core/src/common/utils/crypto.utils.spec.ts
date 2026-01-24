import { generateSecureHash, verifySecureHash } from './crypto.utils';

describe('CryptoUtils', () => {
    describe('generateSecureHash', () => {
        it('should generate a hash with a colon separator', async () => {
            const password = 'Password123!';
            const hash = await generateSecureHash(password);
            expect(hash).toContain(':');
            expect(hash.split(':')).toHaveLength(2);
        });

        it('should use provided salt if given', async () => {
            const password = 'Password123!';
            const salt = 'customsalt';
            const hash = await generateSecureHash(password, salt);
            expect(hash.startsWith(salt + ':')).toBe(true);
        });

        it('should generate different hashes for same password with random salt', async () => {
            const password = 'Password123!';
            const hash1 = await generateSecureHash(password);
            const hash2 = await generateSecureHash(password);
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('verifySecureHash', () => {
        it('should return true for valid password and hash', async () => {
            const password = 'Password123!';
            const hash = await generateSecureHash(password);
            const isValid = await verifySecureHash(password, hash);
            expect(isValid).toBe(true);
        });

        it('should return false for invalid password', async () => {
            const password = 'Password123!';
            const hash = await generateSecureHash(password);
            const isValid = await verifySecureHash('wrongpassword', hash);
            expect(isValid).toBe(false);
        });

        it('should return false for invalid hash format', async () => {
            const isValid = await verifySecureHash('password', 'invalidhash');
            expect(isValid).toBe(false);
        });

        it('should return false for empty hash', async () => {
            const isValid = await verifySecureHash('password', '');
            expect(isValid).toBe(false);
        });

        it('should handle errors gracefully', async () => {
            // Passing null as hash to trigger potential error
            const isValid = await verifySecureHash('password', null as any);
            expect(isValid).toBe(false);
        });
    });
});
