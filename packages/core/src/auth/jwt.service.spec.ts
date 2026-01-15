/**
 * JWT Service Unit Tests
 * Covers: Token generation, verification, refresh, expiration
 */

import { UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenPayload } from './jwt.service';

describe('JwtService', () => {
    let service: JwtService;

    const mockPayload: TokenPayload = {
        userId: 1,
        tenantId: 'tenant-123',
        tenantSchema: 'tenant_tenant_123',
        email: 'test@example.com',
        role: 'customer',
    };

    beforeEach(() => {
        service = new JwtService();
    });

    // ==================== TOKEN GENERATION ====================

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = service.generateAccessToken(mockPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT format
        });

        it('should include payload data in token', () => {
            const token = service.generateAccessToken(mockPayload);
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload.userId).toBe(mockPayload.userId);
            expect(payload.email).toBe(mockPayload.email);
            expect(payload.type).toBe('access');
        });

        it('should set expiration time', () => {
            const token = service.generateAccessToken(mockPayload);
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload.exp).toBeGreaterThan(Date.now());
            // Should expire in ~15 minutes
            expect(payload.exp - payload.iat).toBe(15 * 60 * 1000);
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = service.generateRefreshToken(mockPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should include jti (token ID) for refresh tokens', () => {
            const token = service.generateRefreshToken(mockPayload);
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload.jti).toBeDefined();
            expect(payload.jti).toHaveLength(32); // hex string from 16 bytes
        });

        it('should set longer expiration for refresh tokens', () => {
            const token = service.generateRefreshToken(mockPayload);
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Should expire in 7 days
            expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60 * 1000);
        });
    });

    describe('generateTokenPair', () => {
        it('should generate both access and refresh tokens', () => {
            const pair = service.generateTokenPair(mockPayload);

            expect(pair.accessToken).toBeDefined();
            expect(pair.refreshToken).toBeDefined();
            expect(pair.expiresIn).toBe(900); // 15 minutes in seconds
        });

        it('should generate different tokens for access and refresh', () => {
            const pair = service.generateTokenPair(mockPayload);

            expect(pair.accessToken).not.toBe(pair.refreshToken);
        });
    });

    // ==================== TOKEN VERIFICATION ====================

    describe('verifyAccessToken', () => {
        it('should verify a valid access token', () => {
            const token = service.generateAccessToken(mockPayload);
            const decoded = service.verifyAccessToken(token);

            expect(decoded.userId).toBe(mockPayload.userId);
            expect(decoded.email).toBe(mockPayload.email);
        });

        it('should throw on invalid token format', () => {
            expect(() => service.verifyAccessToken('invalid'))
                .toThrow(UnauthorizedException);
        });

        it('should throw on tampered token', () => {
            const token = service.generateAccessToken(mockPayload);
            const tamperedToken = token.slice(0, -5) + 'xxxxx';

            expect(() => service.verifyAccessToken(tamperedToken))
                .toThrow(UnauthorizedException);
        });

        it('should throw on wrong token type (refresh used as access)', () => {
            const refreshToken = service.generateRefreshToken(mockPayload);

            expect(() => service.verifyAccessToken(refreshToken))
                .toThrow(UnauthorizedException);
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify a valid refresh token', () => {
            const token = service.generateRefreshToken(mockPayload);
            const decoded = service.verifyRefreshToken(token);

            expect(decoded.userId).toBe(mockPayload.userId);
            expect(decoded.jti).toBeDefined();
        });

        it('should throw on access token used as refresh', () => {
            const accessToken = service.generateAccessToken(mockPayload);

            expect(() => service.verifyRefreshToken(accessToken))
                .toThrow(UnauthorizedException);
        });
    });

    // ==================== TOKEN REFRESH ====================

    describe('refreshTokens', () => {
        it('should generate new token pair from refresh token', () => {
            const initialPair = service.generateTokenPair(mockPayload);
            const newPair = service.refreshTokens(initialPair.refreshToken);

            expect(newPair.accessToken).toBeDefined();
            expect(newPair.refreshToken).toBeDefined();
            // Refresh tokens always differ due to unique jti
            expect(newPair.refreshToken).not.toBe(initialPair.refreshToken);
        });

        it('should maintain payload data after refresh', () => {
            const initialPair = service.generateTokenPair(mockPayload);
            const newPair = service.refreshTokens(initialPair.refreshToken);
            const decoded = service.verifyAccessToken(newPair.accessToken);

            expect(decoded.userId).toBe(mockPayload.userId);
            expect(decoded.email).toBe(mockPayload.email);
            expect(decoded.tenantId).toBe(mockPayload.tenantId);
        });

        it('should throw on invalid refresh token', () => {
            expect(() => service.refreshTokens('invalid.token.here'))
                .toThrow(UnauthorizedException);
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases', () => {
        it('should handle payload without optional role', () => {
            const payloadNoRole: TokenPayload = {
                userId: 2,
                tenantId: 'tenant-456',
                tenantSchema: 'tenant_tenant_456',
                email: 'norole@test.com',
            };

            const token = service.generateAccessToken(payloadNoRole);
            const decoded = service.verifyAccessToken(token);

            expect(decoded.role).toBeUndefined();
        });

        it('should generate unique tokens for same payload', () => {
            const token1 = service.generateRefreshToken(mockPayload);
            const token2 = service.generateRefreshToken(mockPayload);

            // Different due to jti and timestamp
            expect(token1).not.toBe(token2);
        });
    });

    // ==================== SECURITY TESTS ====================

    describe('Security', () => {
        it('should use HMAC-SHA256 for signing', () => {
            const token = service.generateAccessToken(mockPayload);
            const parts = token.split('.');
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

            expect(header.alg).toBe('HS256');
            expect(header.typ).toBe('JWT');
        });

        it('should reject tokens with invalid signature', () => {
            const token = service.generateAccessToken(mockPayload);
            const parts = token.split('.');
            const invalidToken = `${parts[0]}.${parts[1]}.invalidsignature`;

            expect(() => service.verifyAccessToken(invalidToken))
                .toThrow(UnauthorizedException);
        });
    });
});
