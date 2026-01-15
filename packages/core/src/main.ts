/**
 * Apex Platform - Main Entry Point
 * Security: Helmet + CORS + Rate Limiting
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ✅ Security: Helmet Middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false, // للسماح بالـ iframes إذا لزم
        hsts: { maxAge: 31536000, includeSubDomains: true },
        frameguard: { action: 'deny' },
        noSniff: true,
        xssFilter: true,
    }));

    // ✅ Security: Production CORS
    const isProd = process.env.NODE_ENV === 'production';
    app.enableCors({
        origin: isProd
            ? [
                'https://www.apex-platform.com',
                'https://hq.apex-platform.com',
                /\.apex-platform\.com$/,
            ]
            : true, // Development: السماح لكل المصادر
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
        maxAge: 86400, // 24 hours
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Apex Core is running on port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
    console.log(`🔒 Security: Helmet + CORS enabled`);
}

bootstrap();

