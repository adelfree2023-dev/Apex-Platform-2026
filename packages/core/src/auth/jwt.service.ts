/**
 * JWT Service
 * Handles Access Token (15min) + Refresh Token (7 days)
 * Security: Uses crypto for token generation
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';

export interface TokenPayload {
    userId: number;
    tenantId: string;
    tenantSchema: string;
    email: string;
    role?: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class JwtService {
    private readonly accessSecret = process.env.JWT_SECRET || 'apex-dev-secret-change-in-production';
    private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'apex-refresh-secret-change-in-production';

    private readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
    private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

    /**
     * Generate Access Token (short-lived)
     */
    generateAccessToken(payload: TokenPayload): string {
        const header = this.base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const now = Date.now();
        const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + this.ACCESS_TOKEN_EXPIRY,
            type: 'access',
        };
        const encodedPayload = this.base64Encode(JSON.stringify(tokenPayload));
        const signature = this.sign(`${header}.${encodedPayload}`, this.accessSecret);

        return `${header}.${encodedPayload}.${signature}`;
    }

    /**
     * Generate Refresh Token (long-lived)
     */
    generateRefreshToken(payload: TokenPayload): string {
        const header = this.base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const now = Date.now();
        const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + this.REFRESH_TOKEN_EXPIRY,
            type: 'refresh',
            jti: randomBytes(16).toString('hex'), // Unique token ID
        };
        const encodedPayload = this.base64Encode(JSON.stringify(tokenPayload));
        const signature = this.sign(`${header}.${encodedPayload}`, this.refreshSecret);

        return `${header}.${encodedPayload}.${signature}`;
    }

    /**
     * Generate both tokens
     */
    generateTokenPair(payload: TokenPayload): TokenPair {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
            expiresIn: this.ACCESS_TOKEN_EXPIRY / 1000, // in seconds
        };
    }

    /**
     * Verify Access Token
     */
    verifyAccessToken(token: string): TokenPayload {
        return this.verifyToken(token, this.accessSecret, 'access');
    }

    /**
     * Verify Refresh Token
     */
    verifyRefreshToken(token: string): TokenPayload & { jti: string } {
        return this.verifyToken(token, this.refreshSecret, 'refresh') as TokenPayload & { jti: string };
    }

    /**
     * Refresh tokens using refresh token
     */
    refreshTokens(refreshToken: string): TokenPair {
        const payload = this.verifyRefreshToken(refreshToken);

        // Create new payload without old timestamps
        const newPayload: TokenPayload = {
            userId: payload.userId,
            tenantId: payload.tenantId,
            tenantSchema: payload.tenantSchema,
            email: payload.email,
            role: payload.role,
        };

        return this.generateTokenPair(newPayload);
    }

    /**
     * Verify token helper
     */
    private verifyToken(token: string, secret: string, expectedType: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new UnauthorizedException('Invalid token format');
            }

            const [header, payload, signature] = parts;

            // Verify signature
            const expectedSignature = this.sign(`${header}.${payload}`, secret);
            if (signature !== expectedSignature) {
                throw new UnauthorizedException('Invalid token signature');
            }

            // Decode payload
            const decoded = JSON.parse(this.base64Decode(payload));

            // Check expiration
            if (decoded.exp < Date.now()) {
                throw new UnauthorizedException('Token expired');
            }

            // Check token type
            if (decoded.type !== expectedType) {
                throw new UnauthorizedException('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid token');
        }
    }

    /**
     * Sign data with HMAC-SHA256
     */
    private sign(data: string, secret: string): string {
        return createHmac('sha256', secret)
            .update(data)
            .digest('base64url');
    }

    /**
     * Base64 URL encode
     */
    private base64Encode(data: string): string {
        return Buffer.from(data).toString('base64url');
    }

    /**
     * Base64 URL decode
     */
    private base64Decode(data: string): string {
        return Buffer.from(data, 'base64url').toString('utf-8');
    }
}
