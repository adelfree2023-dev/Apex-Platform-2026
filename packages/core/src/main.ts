import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { PrismaService } from './prisma/prisma.service';
import { SystemInitializationService } from './common/core/system-initialization.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import * as crypto from 'crypto';

/**
* 🏰 Apex Core: ASMP Bootstrap
*/
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // التحقق من البيئة قبل إنشاء التطبيق
  const configService = new ConfigService();
  try {
    await SystemInitializationService.validateEnvironment(configService);
  } catch (error) {
    logger.error('❌ فشل التحقق من البيئة الاستباقي', error.message);
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);

  // الحصول على الخدمات الأساسية
  const prismaService = app.get(PrismaService);
  const auditService = app.get(AuditService);

  // ⚡ الحل الجزري: تهيئة النظام بالكامل قبل بدء التشغيل
  try {
    logger.log('🔧 بدء تهيئة النظام الأساسي (ASMP Protocol)...');
    const systemInitializationService = app.get(SystemInitializationService);
    await systemInitializationService.initializeSystem();
    // إخطار نظام التدقيق بأن قاعدة البيانات جاهزة
    auditService.setIsSystemReady(true);
    logger.log('✅ تم تهيئة النظام بنجاح');
  } catch (error) {
    logger.error('❌ فشل تهيئة النظام المعقدة', error.message);
    // الاستمرار في وضع محدود (Standby)
    auditService.setIsSystemReady(false);
    console.error('⚠️ تحذير: الاستمرار في وضع آمن رغم فشل التهيئة الكاملة');
  }

  // إعداد مصفاة الاستثناءات العالمية
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
  }));

  // ✅ الإصلاح الأساسي: CSP محسّن دون 'unsafe-inline'
  // 🔒 S8: سياسة أمان محتوى صارمة
  const cspDirectives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc: [
      "'self'",
      'https://api.stripe.com',
      'https://api.mapbox.com',
      'https://*.apex-platform.com',
      'https://checkout.stripe.com'
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    objectSrc: ["'none'"],
    scriptSrc: [
      "'self'",
      "'strict-dynamic'",
      'https://cdn.jsdelivr.net',
      'https://js.stripe.com',
      'https://maps.googleapis.com',
      'https://*.googleapis.com',
      'https://cdnjs.cloudflare.com'
    ],
    styleSrc: [
      "'self'",
      'https://fonts.googleapis.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net'
    ],
    upgradeInsecureRequests: [],
    reportUri: '/api/report/csp-violation'
  };

  // إضافة nonce للمصادر الداخلية عند الحاجة
  app.use((req: any, res: any, next: any) => {
    res.locals.cspNonce = Buffer.from(crypto.randomBytes(16)).toString('base64');
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...cspDirectives,
        scriptSrc: [...cspDirectives.scriptSrc, (req: any, res: any) => `'nonce-${res.locals.cspNonce}'`],
        styleSrc: [...cspDirectives.styleSrc, (req: any, res: any) => `'nonce-${res.locals.cspNonce}'`],
      },
      reportOnly: process.env.NODE_ENV !== 'production' ? true : false,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true
  }));

  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // تحديد الحدود (Global Rate Limiting)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Apex Platform API')
    .setDescription('Apex Saas Commercial Platform - Secured Core API')
    .setVersion('1.0.0-asmp')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Apex Core is running on port ${port} with ENHANCED CSP SECURITY`);
}

bootstrap().catch(error => {
  console.error('❌ Application Critical Startup Failure:', error);
  process.exit(1);
});
