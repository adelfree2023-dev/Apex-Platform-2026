import { Module, Global, ValidationPipe, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ValidationModule } from './common/security/validation/validation.module';
import { SecurityContextModule } from './common/security/security.context.module';
import { TenantScopedGuard } from './common/access-control/guards/tenant-scoped.guard';
import { DefenseInterceptor } from './common/presentation/interceptors/defense.interceptor';
import { TenantContextService } from './common/security/tenant-context/tenant-context.service';
import { AuditModule } from './common/monitoring/audit/audit.module';
import { AccessControlModule } from './common/access-control/access-control.module';
import { PresentationModule } from './common/presentation/presentation.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import { SecurityContext } from './common/security/security.context';
import { CoreModule } from './common/core/core.module';
import { StorefrontModule } from './modules/storefront/storefront.module';

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
    SecurityContextModule,
    ValidationModule,
    TenantsModule,
    AuthModule,
    EventsModule,
    AuditModule,
    AccessControlModule,
    PresentationModule,
    StorefrontModule,
    CoreModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ✅ S2: Tenant Isolation Guard
    {
      provide: APP_GUARD,
      useClass: TenantScopedGuard,
    },
    // ✅ S6: Defense - Request Behavior
    {
      provide: APP_INTERCEPTOR,
      useClass: DefenseInterceptor,
    },
    // ✅ S3: Input Vaildation
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
    // ✅ S5: Error Handling
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [AppService]
})
export class AppModule { }
