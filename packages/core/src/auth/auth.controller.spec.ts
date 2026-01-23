import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../common/decorators/public.decorator';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockAuthService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }),
    register: jest.fn().mockResolvedValue({ success: true }),
  };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockValidator = {
    secureValidate: jest.fn((_, payload) => Promise.resolve(payload)),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SecurityContext, useValue: mockSecurity },
        { provide: InputValidatorService, useValue: mockValidator },
        JwtService, // real – not used in tests
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login – success', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password123' })
      .expect(HttpStatus.OK)
      .expect({ accessToken: 'tok', refreshToken: 'ref' });

    expect(mockValidator.secureValidate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: 'user@example.com' }),
      'auth.login',
    );
    expect(mockAuthService.login).toHaveBeenCalled();
    expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
      'LOGIN_ATTEMPT',
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });

  it('POST /api/auth/login – validation error → 401', async () => {
    mockValidator.secureValidate.mockRejectedValueOnce(new Error('Bad schema'));
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'invalid', password: 'short' })
      .expect(HttpStatus.UNAUTHORIZED);
    expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
      'LOGIN_FAILURE',
      expect.objectContaining({ email: '[REDACTED]' }),
    );
  });

  it('POST /api/auth/register – success', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'StrongPass1234',
        name: 'Ali',
      })
      .expect(HttpStatus.CREATED)
      .expect({ success: true });
    expect(mockAuthService.register).toHaveBeenCalled();
  });
});
