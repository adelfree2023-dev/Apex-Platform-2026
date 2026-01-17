/**
 * Auth Module
 */

import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SocialAuthService } from './social-auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [EmailService, SocialAuthService],
    exports: [EmailService, SocialAuthService],
})
export class AuthModule { }

