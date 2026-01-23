import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { safeRedactError } from '../../utils/security.utils';

/**
 * 🏰 Digital Fortress: Encrypted Field Service (S7)
 */
@Injectable()
export class EncryptedFieldService implements OnModuleInit {
    private readonly logger = new Logger(EncryptedFieldService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly IV_LENGTH = 12;
    private readonly KEY_LENGTH = 32;

    private readonly masterKey: Buffer;
    private readonly isProduction = process.env.NODE_ENV === 'production';

    constructor() {
        const keyStr = process.env.ENCRYPTION_MASTER_KEY;

        if (!keyStr) {
            if (this.isProduction) {
                throw new InternalServerErrorException('Critical security configuration error - encryption key missing');
            }
            this.logger.warn('⚠️ WARNING: Development mode - using temporary encryption key');
            this.masterKey = Buffer.from('apex-fortress-temporary-development-key-not-for-production-use-2026');
        } else {
            this.masterKey = Buffer.from(keyStr, 'utf8');
            this.validateKeyStrength(keyStr);
        }
    }

    onModuleInit() {
        this.verifyCryptoImplementation();
    }

    private validateKeyStrength(keyStr: string): void {
        if (this.isProduction && keyStr.length < 64) {
            throw new InternalServerErrorException('Critical security configuration error - encryption key too weak');
        }
    }

    private verifyCryptoImplementation(): void {
        crypto.randomBytes(16);
        // Fix: Type casting to any for crypto parameters (Lint fix)
        crypto.hkdfSync('sha256', Buffer.from('test') as any, Buffer.from('test') as any, Buffer.from('test') as any, 32);
    }

    private deriveTenantKey(tenantId: string, version: string): Buffer {
        const salt = crypto.createHash('sha256').update(tenantId).digest();
        const info = Buffer.from(`tenant-key-${version}`, 'utf8');
        // Fix: Type casting to any for crypto parameters (Lint fix)
        return Buffer.from(crypto.hkdfSync('sha256', this.masterKey as any, salt as any, info as any, this.KEY_LENGTH));
    }

    encrypt(tenantId: string, text: string, version: string = 'v1'): string {
        if (!text || typeof text !== 'string') return text;
        try {
            const key = this.deriveTenantKey(tenantId, version);
            const iv = crypto.randomBytes(this.IV_LENGTH);
            // Fix: Type casting to any for crypto parameters (Lint fix)
            const cipher = crypto.createCipheriv(this.algorithm as any, key as any, iv as any);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag().toString('hex');
            return `${version}:${iv.toString('hex')}:${authTag}:${encrypted}`;
        } catch (error) {
            this.logger.error(`[S7] Encryption Failure: ${error.message}`);
            return this.isProduction ? '[ENCRYPTION_ERROR]' : text;
        }
    }

    decrypt(tenantId: string, cipherText: string): string {
        if (!cipherText || !cipherText.includes(':')) return cipherText;
        try {
            const [version, ivHex, authTagHex, encryptedData] = cipherText.split(':');
            const key = this.deriveTenantKey(tenantId, version);
            // Fix: Type casting to any for crypto parameters (Lint fix)
            const decipher = crypto.createDecipheriv(this.algorithm as any, key as any, Buffer.from(ivHex, 'hex') as any);
            decipher.setAuthTag(Buffer.from(authTagHex, 'hex') as any);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            return '[ENCRYPTED_FAILURE]';
        }
    }

    async rotateKeys(tenantId: string, oldVersion: string, newVersion: string, data: string[]): Promise<string[]> {
        return data.map(item => {
            const plain = this.decrypt(tenantId, item);
            return plain === '[ENCRYPTED_FAILURE]' ? item : this.encrypt(tenantId, plain, newVersion);
        });
    }

    hashData(data: string, salt?: string): { hash: string; salt: string } {
        const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
        // Fix: Type casting to any for crypto parameters (Lint fix)
        const hash = crypto.pbkdf2Sync(data as any, generatedSalt as any, 100000, 64, 'sha512').toString('hex');
        return { hash, salt: generatedSalt };
    }

    verifyHash(data: string, hash: string, salt: string): boolean {
        const { hash: newHash } = this.hashData(data, salt);
        return crypto.timingSafeEqual(Buffer.from(newHash), Buffer.from(hash));
    }
}
