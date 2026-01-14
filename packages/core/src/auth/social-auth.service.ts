/**
 * Social Login Service
 * Handles OAuth with Google, Facebook, Apple
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SocialUser {
    provider: 'google' | 'facebook' | 'apple';
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
}

@Injectable()
export class SocialAuthService {
    private readonly logger = new Logger(SocialAuthService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create social auth tables
     */
    async createSocialAuthTables(tenantSchema: string): Promise<void> {
        // Social accounts table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_social_account" (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES "${tenantSchema}"."vendure_customer"(id),
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        avatar VARCHAR(500),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_id)
      )
    `);

        // Auth sessions table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_auth_session" (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES "${tenantSchema}"."vendure_customer"(id),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(50),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Password reset tokens
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_password_reset" (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES "${tenantSchema}"."vendure_customer"(id),
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Find or create customer by social login
     */
    async findOrCreateBySocialLogin(tenantSchema: string, socialUser: SocialUser): Promise<any> {
        // Check if social account exists
        const existingAccount = await this.prisma.$queryRawUnsafe(`
      SELECT sa.*, c.id as customer_id, c.email as customer_email, c.first_name
      FROM "${tenantSchema}"."vendure_social_account" sa
      JOIN "${tenantSchema}"."vendure_customer" c ON c.id = sa.customer_id
      WHERE sa.provider = $1 AND sa.provider_id = $2
    `, socialUser.provider, socialUser.providerId);

        if ((existingAccount as any[]).length > 0) {
            const account = (existingAccount as any[])[0];
            return {
                customerId: Number(account.customer_id),
                email: account.customer_email,
                firstName: account.first_name,
                isNew: false,
            };
        }

        // Check if customer with email exists
        const existingCustomer = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_customer"
      WHERE email = $1
    `, socialUser.email);

        let customerId: number;

        if ((existingCustomer as any[]).length > 0) {
            customerId = Number((existingCustomer as any[])[0].id);
        } else {
            // Create new customer
            const newCustomer = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_customer" (email, first_name, last_name)
        VALUES ($1, $2, $3)
        RETURNING *
      `, socialUser.email, socialUser.firstName || '', socialUser.lastName || '');

            customerId = Number((newCustomer as any[])[0].id);
        }

        // Link social account
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_social_account" 
      (customer_id, provider, provider_id, email, avatar)
      VALUES ($1, $2, $3, $4, $5)
    `, customerId, socialUser.provider, socialUser.providerId, socialUser.email, socialUser.avatar || null);

        return {
            customerId,
            email: socialUser.email,
            firstName: socialUser.firstName,
            isNew: true,
        };
    }

    /**
     * Create auth session
     */
    async createSession(tenantSchema: string, customerId: number, deviceInfo?: string, ipAddress?: string): Promise<string> {
        const sessionToken = this.generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_auth_session" 
      (customer_id, session_token, device_info, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, customerId, sessionToken, deviceInfo || null, ipAddress || null, expiresAt);

        return sessionToken;
    }

    /**
     * Validate session
     */
    async validateSession(tenantSchema: string, sessionToken: string): Promise<any | null> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT s.*, c.email, c.first_name
      FROM "${tenantSchema}"."vendure_auth_session" s
      JOIN "${tenantSchema}"."vendure_customer" c ON c.id = s.customer_id
      WHERE s.session_token = $1 AND s.expires_at > NOW()
    `, sessionToken);

        const session = (result as any[])[0];
        return session ? {
            customerId: Number(session.customer_id),
            email: session.email,
            firstName: session.first_name,
            expiresAt: session.expires_at,
        } : null;
    }

    /**
     * Create password reset token
     */
    async createPasswordResetToken(tenantSchema: string, email: string): Promise<string | null> {
        const customer = await this.prisma.$queryRawUnsafe(`
      SELECT id FROM "${tenantSchema}"."vendure_customer"
      WHERE email = $1
    `, email);

        if ((customer as any[]).length === 0) {
            return null;
        }

        const customerId = Number((customer as any[])[0].id);
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_password_reset" 
      (customer_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, customerId, token, expiresAt);

        return token;
    }

    /**
     * Validate reset token
     */
    async validateResetToken(tenantSchema: string, token: string): Promise<number | null> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT customer_id FROM "${tenantSchema}"."vendure_password_reset"
      WHERE token = $1 AND expires_at > NOW() AND used = false
    `, token);

        return (result as any[])[0]?.customer_id ? Number((result as any[])[0].customer_id) : null;
    }

    /**
     * Mark reset token as used
     */
    async useResetToken(tenantSchema: string, token: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_password_reset"
      SET used = true
      WHERE token = $1
    `, token);
    }

    /**
     * Logout (delete session)
     */
    async logout(tenantSchema: string, sessionToken: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_auth_session"
      WHERE session_token = $1
    `, sessionToken);
    }

    private generateToken(): string {
        return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
}
