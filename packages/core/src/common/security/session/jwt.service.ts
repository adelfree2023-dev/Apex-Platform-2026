import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly nestJwt: NestJwtService,
    private readonly prisma: PrismaService,
  ) { }

  async generateToken(payload: any): Promise<string> {
    return this.nestJwt.sign(payload);
  }

  async verifyToken(token: string): Promise<any> {
    return this.nestJwt.verify(token);
  }
}
