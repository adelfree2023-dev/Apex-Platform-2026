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
import { CSPConfig } from './common/presentation/security-headers/csp.config';
import * as crypto from 'crypto';

/**
* 🏰 Apex Core: ASMP Bootstrap - النسخة النهائية المحسّنة
* - S1: التحقق من البيئة قبل التشغيل
* - S8: سياسة أمان محتوى موحدة (CSP)
* - S6: تحديد الحدود مع فصل السياقات
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
  const prismaService = app.get(PrismaService);
  const auditService = app.get(AuditService);
  const cspConfig = app.get(CSPConfig);

  // ✅ حل المشكلة: التحقق من اتصال قاعدة البيانات مع إعادة المحاولة
  try {
    await prismaService.connectWithRetry(3, 2000);
  } catch (error) {
    logger.error('❌ فشل الاتصال بقاعدة البيانات بعد عدة محاولات', error);
    process.exit(1);
  }

  try {
    logger.log('🔧 بدء تهيئة النظام الأساسي (ASMP Protocol)...');
    const systemInitializationService = app.get(SystemInitializationService);
    await systemInitializationService.initializeSystem();
    auditService.setIsSystemReady(true);
    logger.log('✅ تم تهيئة النظام بنجاح');
  } catch (error) {
    logger.error('❌ فشل تهيئة النظام', error.message);
    // ✅ حل المشكلة: وضع احتياطي آمن مع تسجيل الأخطاء
    auditService.setIsSystemReady(false);
    logger.warn('⚠️ تحذير: الاستمرار في وضع آمن رغم فشل التهيئة الكاملة');
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
  }));

  // ✅ S8: سياسة CSP محسّنة بدون 'unsafe-inline' و 'unsafe-eval'
  app.use(helmet({
    contentSecurityPolicy: {
      directives: cspConfig.getCSPDirectives(undefined, process.env.NODE_ENV || 'development'),
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

  // ✅ S6: حدود أكثر مرونة مع آلية استرداد
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req, res) => {
      const tenantId = (req as any).tenantId || 'FREE';
      const limits = {
        'FREE': 100,
        'PRO': 500,
        'ENTERPRISE': 2000,
        'SUPER_ADMIN': 10000
      };
      return limits[tenantId] || limits['FREE'];
    },
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const path = req.url || '';
      return path.startsWith('/health') || path.startsWith('/api/app/health');
    }
  }));

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
  
  // ✅ S8: التحقق من صحة رؤوس الأمان
  const server = app.getHttpServer();
  server.on('response', (res) => {
    const headers = res.getHeaders();
    if (!headers['content-security-policy']) {
      logger.warn('🚨 تحذير أمني: لم يتم تعيين رؤوس CSP بشكل صحيح');
    }
  });
}
bootstrap().catch(error => {
  console.error('❌ Application Critical Startup Failure:', error);
  process.exit(1);
});