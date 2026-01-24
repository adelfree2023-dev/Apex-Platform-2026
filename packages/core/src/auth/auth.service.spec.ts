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
import { UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { generateSecureHash, verifySecureHash } from '../common/utils/crypto.utils';

jest.mock('../common/utils/crypto.utils', () => ({
  generateSecureHash: jest.fn().mockResolvedValue('hashed-password'),
  verifySecureHash: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    tenant: {
      findUnique: jest.fn(),
    },
  };
  const mockJwt = {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };
  const mockTenantContext = {
    getTenantSchema: jest.fn().mockResolvedValue('tenant_schema'),
  };
  const mockEncryption = {
    encrypt: jest.fn().mockReturnValue('encrypted-data'),
    decrypt: jest.fn().mockReturnValue('decrypted-data'),
  };
  const mockAnomaly = {
    detect: jest.fn(),
    inspectFailedLogin: jest.fn(),
  };
  const mockRateLimiter = {
    consume: jest.fn().mockResolvedValue({ allowed: true }),
  };
  const mockAudit = {
    logOperation: jest.fn(),
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn(),
  };
  const mockSecurity = {
    logSecurityEvent: jest.fn(),
  };
  const mockInputValidator = {
    secureValidate: jest.fn().mockImplementation(async (_, data) => data),
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
    const validLoginDto: LoginDto = {
      email: 'user@example.com',
      password: 'ValidPass123!',
    };
    const tenantId = 'tenant-uuid';
    const ip = '1.2.3.4';

    it('should authenticate user successfully', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 42,
          email: 'user@example.com',
          password_hash: 'hashed-password',
          role: 'customer',
        },
      ]);

      const result = await service.login(validLoginDto, tenantId, ip);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        refreshToken: 'jwt-token',
      });
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockAudit.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          action: 'USER_LOGIN',
        })
      );
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 42,
          email: 'user@example.com',
          password_hash: 'hashed-password',
        },
      ]);
      (verifySecureHash as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login(validLoginDto, tenantId, ip)).rejects.toThrow(UnauthorizedException);
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith(
        'LOGIN_FAILURE',
        expect.objectContaining({ email: 'user@example.com', tenantId })
      );
    });

    it('should reject rate-limited requests', async () => {
      mockRateLimiter.consume.mockResolvedValueOnce({ allowed: false });

      await expect(service.login(validLoginDto, tenantId, ip)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'SuperStrongPass123!',
      name: 'New User',
    };
    const tenantId = 'tenant-uuid';
    const ip = '1.2.3.4';

    it('should register new user successfully', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(undefined);

      const result = await service.register(validRegisterDto, tenantId, ip);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        validRegisterDto.email.toLowerCase(),
        'hashed-password',
        validRegisterDto.name,
      );
    });
  });
});
