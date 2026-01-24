import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { safeRedactError } from '../../utils/security.utils';

/**
* 🏰 Digital Fortress: Encrypted Field Service (S7)
* - التنفيذ الكامل للتشفير باستخدام AES-256-GCM
* - استخدام HKDF لاشتقاق المفاتيح
* - دعم تدوير المفاتيح الديناميكي
*/
@Injectable()
export class EncryptedFieldService implements OnModuleInit {
  private readonly logger = new Logger(EncryptedFieldService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly KEY_LENGTH = 32;
  private readonly TAG_LENGTH = 16;
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
    try {
      crypto.randomBytes(16);
      crypto.hkdfSync('sha256', this.masterKey as any, Buffer.from('test-salt') as any, Buffer.from('info') as any, 32);
      this.logger.log('✅ Cryptographic implementation verified');
    } catch (error) {
      this.logger.error('❌ Cryptographic verification failed', error);
      throw new InternalServerErrorException('Failed to verify cryptographic implementation');
    }
  }

  private deriveTenantKey(tenantId: string, version: string): Buffer {
    const salt = crypto.createHash('sha256').update(tenantId).digest();
    const info = Buffer.from(`tenant-key-${version}`, 'utf8');
    return Buffer.from(crypto.hkdfSync('sha256', this.masterKey as any, salt as any, info as any, this.KEY_LENGTH));
  }

  /**
   * 🛡️ S7: الحصول على الإصدار الحالي للمفاتيح بناءً على التاريخ
   * يضمن هذا النمط تدوير المفاتيح بشكل دوري تلقائياً
   */
  getCurrentVersion(): string {
    const date = new Date();
    // تدوير كل ربع سنة (Quarterly rotation)
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `v${date.getFullYear()}Q${quarter}`;
  }

  encrypt(tenantId: string, text: string, version?: string): string {
    if (!text || typeof text !== 'string') return text;
    const v = version || this.getCurrentVersion();
    try {
      const key = this.deriveTenantKey(tenantId, v);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.algorithm, key as any, iv as any);

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
      const decipher = crypto.createDecipheriv(this.algorithm, key as any, Buffer.from(ivHex, 'hex') as any);
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex') as any);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.warn(`[S7] Decryption failure`, {
        error: safeRedactError(error).message,
        timestamp: new Date().toISOString()
      });
      return '[ENCRYPTED_FAILURE]';
    }
  }

  async rotateKeys(tenantId: string, oldVersion: string, newVersion: string, data: string[]): Promise<string[]> {
    return Promise.all(data.map(async (item) => {
      try {
        const plain = this.decrypt(tenantId, item);
        if (plain === '[ENCRYPTED_FAILURE]') return item;
        return this.encrypt(tenantId, plain, newVersion);
      } catch (error) {
        this.logger.error(`Key rotation failed for tenant ${tenantId}`, error);
        return item;
      }
    }));
  }

  hashData(data: string, salt?: string): { hash: string; salt: string } {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      Buffer.from(data) as any,
      Buffer.from(generatedSalt) as any,
      100000,
      64,
      'sha512'
    ).toString('hex');
    return { hash, salt: generatedSalt };
  }

  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: newHash } = this.hashData(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(newHash, 'hex') as any,
      Buffer.from(hash, 'hex') as any
    );
  }

  generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}