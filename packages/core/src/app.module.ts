import { Module, Global, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ValidationModule } from './common/security/validation/validation.module';
import { SecurityContextModule } from './common/security/security.context.module';
import { TenantScopedGuard } from './common/access-control/guards/tenant-scoped.guard';
import { DefenseInterceptor } from './common/presentation/interceptors/defense.interceptor';
import { TenantContextService } from './common/security/tenant-context/tenant-context.service';
import { AuditModule } from './common/monitoring/audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import { SystemInitializationService } from './common/core/system-initialization.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { EncryptedFieldService } from './common/security/encryption/encrypted-field.service';
import { AnomalyDetectionService } from './common/access-control/services/anomaly-detection.service';
import { RateLimiterService } from './common/access-control/services/rate-limiter.service';

/**
* 🏰 Digital Fortress: Root AppModule
* - S1: Centralized Configuration
* - S2: Multi-tenant Isolation
* - S6: Behavioral Protection
* - S8: Threat Detection
*/
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    PrismaModule,
    SecurityContextModule,
    ValidationModule,
    TenantsModule,
    AuthModule,
    EventsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SystemInitializationService, // ⚡ إضافة خدمة التهيئة الأساسية
    {
      provide: APP_GUARD,
      useClass: TenantScopedGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DefenseInterceptor,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: false },
        validationError: { target: false, value: false },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    EncryptedFieldService,
    AnomalyDetectionService,
    RateLimiterService,
  ],
  exports: [AppService, SystemInitializationService]
})
export class AppModule { }
