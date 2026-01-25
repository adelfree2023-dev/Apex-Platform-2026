import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { Logger, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import { CSPConfig } from './common/presentation/security-headers/csp.config';
import { SystemInitializationService } from './common/core/system-initialization.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import rateLimit from 'express-rate-limit';
import { SystemHealthService } from './common/core/system-health.service';

// ✅ S8: تحسين معالجة الأخطاء النهائية
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

/*** 🏰 Apex Core: ASMP Bootstrap - Final Enhanced Version
* - S1: Environment Validation
* - S8: Unified Content Security Policy (CSP)
* - S6: Context Isolation*/
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ✅ S1: Create context just for config first to validate environment
  logger.log('🚀 Phase 1: Creating Application Context...');
  const appContext = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log', 'debug', 'verbose'] });
  logger.log('✅ Phase 1 Complete: App Context Created');
  const configService = appContext.get(ConfigService);

  try {
    logger.log('🚀 Phase 2: Validating Environment...');
    // Basic validation of critical variables
    validateEnvironment(configService);
    logger.log('✅ Phase 2 Complete: Environment Validated');
    await appContext.close();
  } catch (error: any) {
    logger.error('❌ Proactive Environment Validation Failed', error.message);
    process.exit(1);
  }

  logger.log('🚀 Phase 3: Creating Full Application...');
  const app = await NestFactory.create(AppModule);
  logger.log('✅ Phase 3 Complete: Full App Created');

  // Get services from the main app context
  const appConfigService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const auditService = app.get(AuditService);
  const cspConfig = app.get(CSPConfig);

  logger.debug(`🔧 DATABASE_URL Check: ${appConfigService.get('DATABASE_URL') ? 'LOADED' : 'MISSING'}`);
  logger.debug(`🔧 Prisma Service exists: ${!!prismaService}`);

  // ✅ S1: Database Connection Check
  try {
    logger.log('📡 Verifying database connectivity...');
    await prismaService.$connect();
    logger.log('✅ Database connection established');
  } catch (error: any) {
    logger.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }

  // ✅ System Initialization
  try {
    logger.log('🔧 Starting System Initialization (ASMP Protocol)...');
    const systemInit = app.get(SystemInitializationService);
    await systemInit.initializeSystem();
    auditService.setIsSystemReady(true);
    logger.log('✅ System Initialized Successfully');
  } catch (error: any) {
    logger.error('❌ System Initialization Failed', error.message);
    auditService.setIsSystemReady(false);
    logger.warn('⚠️ Warning: Continuing in safe mode despite initialization failure');
  }

  // ✅ Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
  }));

  // ✅ S8: Apply Security Headers & CSP
  applySecurityHeaders(app, cspConfig);

  // ✅ S6: Global Rate Limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req, res) => {
      // Dynamic limit based on tenant tier would go here
      // For now using safe defaults
      return 1000;
    },
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.url.startsWith('/api/app/health');
    }
  }));

  // ✅ API Documentation
  setupSwagger(app);

  const port = appConfigService.get('PORT') || 3001;
  await app.listen(port);
  logger.log(`🚀 Apex Core is running on port ${port} with ENHANCED SECURITY`);
}

// ✅ S1: Central Environment Validation
function validateEnvironment(configService: ConfigService) {
  const env = configService.get('NODE_ENV') || 'development';

  const requiredVars = [
    { name: 'JWT_SECRET', condition: (v: string) => v && v.length >= 32 },
    { name: 'DATABASE_URL', condition: (v: string) => v && v.startsWith('postgresql://') },
  ];

  requiredVars.forEach(({ name, condition }) => {
    const value = configService.get(name);
    if (env === 'production' && (!value || !condition(value))) {
      throw new InternalServerErrorException(
        `S1 PROTOCOL VIOLATION: ${name} is missing or invalid in production environment`
      );
    }

    if (env === 'development' && (!value)) {
      console.warn(`⚠️  Development warning: ${name} is not set`);
    }
  });
}

// ✅ S8: Apply Security Headers
function applySecurityHeaders(app: any, cspConfig: CSPConfig) {
  // ✅ S8: CSP with Dynamic Nonce
  app.use((req: any, res: any, next: any) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  // 🛡️ S6: Circuit Breaker Middleware
  const systemHealth = app.get(SystemHealthService);
  const audit = app.get(AuditService);
  app.use((req: any, res: any, next: any) => {
    if (systemHealth?.isOverloaded?.()) {
      audit?.logSecurityEvent?.('SYSTEM_OVERLOAD_PROTECTION', {
        path: req.url,
        ip: req.ip
      });
      return res.status(503).json({
        statusCode: 503,
        message: 'System is currently overloaded. Please try again later.',
        retryAfter: 30
      });
    }
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: cspConfig.getCSPDirectives(undefined, process.env.NODE_ENV || 'development'),
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
  }));

  app.enableCors({
    origin: '*', // Should be restricted in production config
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
}

// ✅ S8: Secure Swagger Options
function setupSwagger(app: any) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Apex Platform API')
    .setDescription('Secure API Documentation with ASMP Protocol')
    .setVersion('1.0.0-asmp')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

bootstrap();