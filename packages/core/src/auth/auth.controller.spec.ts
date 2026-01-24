import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { TenantScopedGuard } from '../common/access-control/guards/tenant-scoped.guard';
import { LicenseGuard } from '../common/access-control/guards/license.guard';
import { DefenseInterceptor } from '../common/presentation/interceptors/defense.interceptor';
import { AuditLoggerInterceptor } from '../common/monitoring/audit/audit-logger.interceptor';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockAuthService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }),
    register: jest.fn().mockResolvedValue({ success: true }),
  };
  const mockTenantContext = { setTenantId: jest.fn(), clearTenantId: jest.fn() };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockValidator = { secureValidate: jest.fn().mockImplementation(async (_, data) => data) };
  const mockRateLimiter = { consume: jest.fn().mockResolvedValue({ allowed: true }) };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: InputValidatorService, useValue: mockValidator },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: SecurityContext, useValue: mockSecurity },
      ],
    })
      .overrideGuard(TenantScopedGuard).useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.tenantId = req.headers['x-tenant-id'];
          return true;
        }
      })
      .overrideGuard(LicenseGuard).useValue({ canActivate: () => true })
      .overrideInterceptor(DefenseInterceptor).useValue({ intercept: (_: any, next: any) => next.handle() })
      .overrideInterceptor(AuditLoggerInterceptor).useValue({ intercept: (_: any, next: any) => next.handle() })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurity.logSecurityEvent.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenantId = 'tenant-uuid';
  const ip = '1.2.3.4';

  describe('POST /login', () => {
    const validLogin: LoginDto = {
      email: 'user@example.com',
      password: 'ValidPass123!',
    };

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('x-tenant-id', tenantId)
        .set('X-Forwarded-For', ip)
        .send(validLogin)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ accessToken: 'tok', refreshToken: 'ref' });
      expect(mockAuthService.login).toHaveBeenCalledWith(validLogin, tenantId, expect.anything());
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'LOGIN_ATTEMPT',
        expect.objectContaining({ email: 'user@example.com', tenantId })
      );
    });

    it('should handle login exceptions', async () => {
      mockAuthService.login.mockRejectedValueOnce(new Error('Auth Fail'));

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('x-tenant-id', tenantId)
        .send(validLogin)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'LOGIN_FAILURE',
        expect.objectContaining({ errorType: 'Error' })
      );
    });
  });

  describe('POST /register', () => {
    const validRegister: RegisterDto = {
      email: 'newuser@example.com',
      password: 'SuperStrongPass123!',
      name: 'New User',
    };

    it('should register successfully with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('x-tenant-id', tenantId)
        .set('X-Forwarded-For', ip)
        .send(validRegister)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ success: true });
    });

    it('should handle registration exceptions', async () => {
      mockAuthService.register.mockRejectedValueOnce(new Error('Reg Fail'));

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('x-tenant-id', tenantId)
        .send(validRegister)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'REGISTRATION_FAILURE',
        expect.objectContaining({ email: 'newuser@example.com' })
      );
    });
  });
});
