import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { EncryptedFieldService } from '../common/security/encryption/encrypted-field.service';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { SecurityContext } from '../common/security/security.context';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { generateSecureHash, verifySecureHash } from '../common/utils/crypto.utils';
import * as bcrypt from 'bcryptjs';

jest.mock('../common/utils/crypto.utils', () => ({
  generateSecureHash: jest.fn().mockResolvedValue('hashed-pwd'),
  verifySecureHash: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
  const mockJwt = { sign: jest.fn().mockReturnValue('jwt-token') };
  const mockTenantContext = { getTenantSchema: jest.fn().mockResolvedValue('public') };
  const mockEncryption = { encrypt: jest.fn() };
  const mockAnomaly = { detect: jest.fn() };
  const mockRateLimiter = { consume: jest.fn().mockResolvedValue(true) };
  const mockAudit = { logOperation: jest.fn() };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockInputValidator = {
    secureValidate: jest.fn((_, payload) => Promise.resolve(payload)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: EncryptedFieldService, useValue: mockEncryption },
        { provide: AnomalyDetectionService, useValue: mockAnomaly },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: AuditService, useValue: mockAudit },
        { provide: SecurityContext, useValue: mockSecurity },
        { provide: InputValidatorService, useValue: mockInputValidator },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'user@example.com',
      password: 'Password123',
    };
    const tenantId = 'tenant-uuid';
    const ip = '1.2.3.4';

    it('should succeed with correct credentials', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 42,
          email: 'user@example.com',
          password_hash: 'hashed-pwd',
          role: 'customer',
        },
      ]);

      const result = await service.login(loginDto, tenantId, ip);
      expect(result).toEqual({
        accessToken: 'jwt-token',
        refreshToken: 'jwt-token',
      });
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockRateLimiter.consume).toHaveBeenCalled();
      expect(mockAudit.logOperation).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on bad password', async () => {
      // make verifySecureHash return false
      (verifySecureHash as jest.Mock).mockResolvedValueOnce(false);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 42,
          email: 'user@example.com',
          password_hash: 'hashed-pwd',
          role: 'customer',
        },
      ]);

      await expect(service.login(loginDto, tenantId, ip)).rejects.toThrow(
        'UnauthorizedException',
      );
    });

    it('throws ForbiddenException when rate‑limit is exceeded', async () => {
      mockRateLimiter.consume.mockResolvedValueOnce(false);
      await expect(service.login(loginDto, tenantId, ip)).rejects.toThrow(
        'ForbiddenException',
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      password: 'StrongPass1234',
      name: 'Ali',
    };
    const tenantId = 'tenant-uuid';
    const ip = '5.6.7.8';

    it('creates a new user and returns success flag', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(undefined);
      const result = await service.register(registerDto, tenantId, ip);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(generateSecureHash).toHaveBeenCalledWith(registerDto.password);
    });
  });
});
