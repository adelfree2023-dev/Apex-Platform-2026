import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

import { CacheService } from '../../caching/cache.service';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly nestJwt: NestJwtService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) { }

  async sign(payload: any, options?: any): Promise<string> {
    return this.nestJwt.sign(payload, options);
  }

  async verify(token: string, options?: any): Promise<any> {
    return this.nestJwt.verify(token, options);
  }

  async verifyWithRevocation(token: string, tenantId: string): Promise<any> {
    try {
      const payload = await this.verify(token);

      // S10: التحقق من القائمة السوداء باستخدام البصمة (hash) مع fallback
      const tokenId = crypto.createHash('sha256').update(token).digest('hex');
      let isRevoked = null;

      try {
        isRevoked = await this.cacheService.get(`revoked_token:${tenantId}:${tokenId}`);
      } catch (cacheError) {
        this.logger.warn('Cache unavailable for revocation check, falling back to database', cacheError);
        // Fallback: التحقق من DATABASE_URL إذا فشل الـ Redis
        const dbRevoked = await this.prisma.revokedToken.findUnique({
          where: { tokenHash: tokenId }
        });
        isRevoked = !!dbRevoked;
      }

      if (isRevoked) {
        throw new Error('تم إبطال الرمز المميز');
      }

      return payload;
    } catch (error) {
      this.logger.error('Verification failed', error);
      throw error;
    }
  }

  async revokeToken(token: string, tenantId: string, userId: string, expiresAt: number): Promise<void> {
    const tokenId = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

    await this.cacheService.set(`revoked_token:${tenantId}:${tokenId}`, true, ttl);
    // Sync to DB for persistence
    await this.prisma.revokedToken.upsert({
      where: { tokenHash: tokenId },
      update: {},
      create: {
        tokenHash: tokenId,
        tenantId,
        userId,
        expiresAt: new Date(expiresAt * 1000)
      }
    });
  }
}
