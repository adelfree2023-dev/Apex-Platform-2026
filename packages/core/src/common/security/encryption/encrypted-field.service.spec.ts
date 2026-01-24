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
        expect(encrypted).toContain(':'); // version:iv:authTag:data

        const decrypted = service.decrypt(tenantId, encrypted);
        expect(decrypted).toBe(plainText);
    });

    it('should support legacy version (v1) decryption', () => {
        const encryptedV1 = service.encrypt(tenantId, plainText, 'v1');
        expect(encryptedV1.startsWith('v1:')).toBe(true);

        const decrypted = service.decrypt(tenantId, encryptedV1);
        expect(decrypted).toBe(plainText);
    });

    it('should support hashing and verification', () => {
        const { hash, salt } = service.hashData(plainText);
        expect(hash).toBeDefined();
        expect(salt).toBeDefined();
        expect(service.verifyHash(plainText, hash, salt)).toBe(true);
        expect(service.verifyHash('wrong', hash, salt)).toBe(false);
    });

    it('should generate random tokens', () => {
        const token = service.generateRandomToken();
        expect(token).toHaveLength(64); // 32 bytes hex
    });

    it('should rotate keys for a set of data (S7)', async () => {
        const oldVersion = 'v2025Q4';
        const newVersion = 'v2026Q1';
        const data = [
            service.encrypt(tenantId, 'secret1', oldVersion),
            service.encrypt(tenantId, 'secret2', oldVersion),
        ];

        const rotated = await service.rotateKeys(tenantId, oldVersion, newVersion, data);
        expect(rotated[0].startsWith(`${newVersion}:`)).toBe(true);
        expect(rotated[1].startsWith(`${newVersion}:`)).toBe(true);
        expect(service.decrypt(tenantId, rotated[0])).toBe('secret1');
        expect(service.decrypt(tenantId, rotated[1])).toBe('secret2');
    });

    it('should handle decryption failures gracefully', () => {
        const result = service.decrypt(tenantId, 'v1:iv:tag:invalid');
        expect(result).toBe('[ENCRYPTED_FAILURE]');
    });

    it('should handle encryption failure and return original in dev', () => {
        // Force an error in crypto
        jest.spyOn(require('crypto'), 'createCipheriv').mockImplementation(() => {
            throw new Error('Crypto fail');
        });
        const result = service.encrypt(tenantId, plainText);
        expect(result).toBe(plainText);
        jest.restoreAllMocks();
    });

    it('should handle rotation failure gracefully', async () => {
        const data = ['v1:definitely:not:valid'];
        const result = await service.rotateKeys(tenantId, 'v1', 'v2', data);
        expect(result[0]).toBe('v1:definitely:not:valid'); // Decrypt will return failure, rotate returns original
    });

    it('should throw error in production if key is missing', () => {
        process.env.NODE_ENV = 'production';
        const oldKey = process.env.ENCRYPTION_MASTER_KEY;
        delete process.env.ENCRYPTION_MASTER_KEY;

        expect(() => new (require('./encrypted-field.service').EncryptedFieldService)()).toThrow();

        process.env.NODE_ENV = 'test';
        process.env.ENCRYPTION_MASTER_KEY = oldKey;
    });
});
