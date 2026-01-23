import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { PrismaService } from './prisma/prisma.service';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import { SystemInitializationService } from './common/core/system-initialization.service';
import { AuditService } from './common/monitoring/audit/audit.service';

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
  // AllExceptionsFilter تستخدم DI في AppModule، لذا لا نحتاج لتعيينها يدوياً هنا إذا كانت APP_FILTER
  // لكن للضمان اليدوي والتحكم الكامل:
  // app.useGlobalFilters(app.get(AllExceptionsFilter));

  // باقي إعدادات الأمان
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
  }));

  // رؤوس الأمان (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
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
  logger.log(`🚀 Apex Core is running on port ${port}`);
}

bootstrap().catch(error => {
  console.error('❌ Application Critical Startup Failure:', error);
  process.exit(1);
});
