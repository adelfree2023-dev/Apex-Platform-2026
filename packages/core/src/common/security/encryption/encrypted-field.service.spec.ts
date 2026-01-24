import { Test, TestingModule } from '@nestjs/testing';
import { EncryptedFieldService } from './encrypted-field.service';

describe('EncryptedFieldService', () => {
    let service: EncryptedFieldService;
    const tenantId = 'test-tenant-123';
    const plainText = 'sensitive-data';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EncryptedFieldService],
        }).compile();

        service = module.get<EncryptedFieldService>(EncryptedFieldService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should encrypt and decrypt text with the current version', () => {
        const encrypted = service.encrypt(tenantId, plainText);
        expect(encrypted).toBeDefined();
        expect(encrypted).not.toBe(plainText);
        expect(encrypted).toContain('|'); // version|iv|data

        const decrypted = service.decrypt(tenantId, encrypted);
        expect(decrypted).toBe(plainText);
    });

    it('should support legacy version (v1) decryption', () => {
        const encryptedV1 = service.encrypt(tenantId, plainText, 'v1');
        expect(encryptedV1.startsWith('v1|')).toBe(true);

        const decrypted = service.decrypt(tenantId, encryptedV1);
        expect(decrypted).toBe(plainText);
    });

    it('should handle automated key rotation (S7)', () => {
        const currentVersion = service.getCurrentVersion();
        const encrypted = service.encrypt(tenantId, plainText);
        expect(encrypted.startsWith(`${currentVersion}|`)).toBe(true);
    });

    it('should return same value if input is not a string or empty', () => {
        expect(service.encrypt(tenantId, null as any)).toBe(null);
        expect(service.decrypt(tenantId, null as any)).toBe(null);
        expect(service.encrypt(tenantId, '')).toBe('');
    });

    it('should throw error on invalid ciphertext format', () => {
        expect(() => service.decrypt(tenantId, 'invalid-format')).toThrow();
    });

    it('should handle decryption with wrong tenant ID (should fail or return trash)', () => {
        const encrypted = service.encrypt(tenantId, plainText);
        // Decrypting with wrong tenant should throw due to auth tag or bad padding
        expect(() => service.decrypt('wrong-tenant', encrypted)).toThrow();
    });
});
