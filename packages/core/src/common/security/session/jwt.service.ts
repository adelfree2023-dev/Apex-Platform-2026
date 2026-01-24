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

  async generateToken(payload: any): Promise<string> {
    return this.nestJwt.sign(payload);
  }

  async verifyToken(token: string): Promise<any> {
    return this.nestJwt.verify(token);
  }

  async verifyTokenWithRevocation(token: string, tenantId: string): Promise<any> {
    try {
      const payload = await this.verifyToken(token);

      // S10: التحقق من القائمة السوداء باستخدام البصمة (hash)
      const tokenId = crypto.createHash('sha256').update(token).digest('hex');
      const isRevoked = await this.cacheService.get(`revoked_token:${tenantId}:${tokenId}`);

      if (isRevoked) {
        throw new Error('تم إبطال الرمز المميز');
      }

      return payload;
    } catch (error) {
      this.logger.error('Verification failed', error);
      throw error;
    }
  }
}
