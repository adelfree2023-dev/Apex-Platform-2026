/**
 * Apex Platform - Main Entry Point
 * Security: Helmet + CORS + Rate Limiting + Exception Filter
 * Docs: Swagger API Documentation
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ✅ Security: Global Exception Filter (Error Masking)
    app.useGlobalFilters(new AllExceptionsFilter());

    // ✅ Security: Helmet Middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
            },
        },
        crossOriginEmbedderPolicy: false,
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
            : true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
        maxAge: 86400,
    });

    // ✅ API Docs: Swagger
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Apex Platform API')
        .setDescription(`
## Multi-Tenant E-Commerce Platform API

### Features
- 🏪 Multi-Tenant Architecture (Schema-per-Tenant)
- 🛒 Full E-Commerce (Products, Orders, Payments)
- 🤖 AI-Powered Recommendations
- 📊 Analytics & Insights
- 🚚 Shipping & Delivery
- 💳 Multiple Payment Gateways
- 🎁 Promotions & Loyalty
- 📱 Marketplace Support

### Authentication
All endpoints require Bearer token authentication unless specified.
Include \`X-Tenant-Id\` header for tenant-specific operations.
        `)
        .setVersion('1.0.0')
        .setContact('Apex Team', 'https://apex-platform.com', 'api@apex-platform.com')
        .setLicense('Proprietary', 'https://apex-platform.com/license')
        .addServer('http://localhost:3001', 'Development Server')
        .addServer('https://api.apex-platform.com', 'Production Server')
        .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token',
        }, 'JWT-auth')
        .addApiKey({
            type: 'apiKey',
            in: 'header',
            name: 'X-Tenant-Id',
            description: 'Tenant identifier for multi-tenant operations',
        }, 'X-Tenant-Id')
        .addTag('health', 'Health check endpoints')
        .addTag('auth', 'Authentication & Authorization')
        .addTag('tenants', 'Tenant Management')
        .addTag('shop', 'Storefront Operations')
        .addTag('products', 'Product Catalog')
        .addTag('orders', 'Order Management')
        .addTag('payments', 'Payment Processing')
        .addTag('shipping', 'Shipping & Delivery')
        .addTag('promotions', 'Promotions & Discounts')
        .addTag('analytics', 'Analytics & Reporting')
        .addTag('ai', 'AI & Recommendations')
        .addTag('affiliates', 'Affiliate Marketing')
        .addTag('marketplace', 'Multi-Vendor Marketplace')
        .addTag('admin', 'Admin Operations')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'Apex Platform API',
        customfavIcon: 'https://apex-platform.com/favicon.ico',
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info { margin: 20px 0 }
        `,
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
        },
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Apex Core is running on port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
    console.log(`🔒 Security: Helmet + CORS enabled`);
}

bootstrap();
