import { Injectable, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { Response } from 'express';

/**
 * 🏰 Digital Fortress: Helmet Configuration Service (S8)
 */
@Injectable()
export class HelmetConfig {
    private readonly logger = new Logger(HelmetConfig.name);
    private readonly isProduction = process.env.NODE_ENV === 'production';

    private readonly defaultDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        fontSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:', 'http:'],
        frameSrc: ["'self'", 'https:', 'http:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
    };

    /**
     * 🛡️ S8: Get helmet middleware
     */
    getHelmetMiddleware(tenantId?: string) {
        return helmet({
            contentSecurityPolicy: this.getContentSecurityPolicy(tenantId),
            xssFilter: true,
            noSniff: true,
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            hsts: this.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : undefined,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            crossOriginResourcePolicy: { policy: 'same-origin' },
            crossOriginOpenerPolicy: { policy: 'same-origin' },
            dnsPrefetchControl: { allow: false },
            ieNoOpen: true,
        });
    }

    private getContentSecurityPolicy(tenantId?: string) {
        if (!this.isProduction) {
            return {
                directives: {
                    ...this.defaultDirectives,
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:', 'ws:', 'wss:'],
                    connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
                    imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:']
                }
            };
        }

        const directives = {
            ...this.defaultDirectives,
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://*.googleapis.com'],
            connectSrc: ["'self'", 'https://api.example.com', 'wss://*.example.com'],
            imgSrc: ["'self'", 'data:', 'https://*.s3.amazonaws.com', 'https://*.gstatic.com'],
            frameSrc: ["'self'", 'https://*.stripe.com', 'https://*.youtube.com'],
        };

        return { directives };
    }

    applyTenantCachingHeaders(res: Response, tenantId: string) {
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300');
        res.setHeader('Surrogate-Key', `tenant-${tenantId}`);
    }
}
