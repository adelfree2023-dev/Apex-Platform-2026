import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

import { ConfigService } from '@nestjs/config';
import { SecurityContext } from '../common/security/security.context';
import { AnomalyDetectionService } from '../common/access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../common/access-control/services/rate-limiter.service';
import { AuditService } from '../common/monitoring/audit/audit.service';
import { EncryptedFieldService } from '../common/security/encryption/encrypted-field.service';
import { InputValidatorService } from '../common/security/validation/input-validator.service';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';
import { CacheService } from '../common/caching/cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(CACHE_MANAGER).useValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() })
      .overrideProvider(CacheService).useValue({ get: jest.fn(), set: jest.fn(), del: jest.fn(), clear: jest.fn() })
      .overrideProvider(PrismaService).useValue({ $connect: jest.fn(), $disconnect: jest.fn(), $queryRawUnsafe: jest.fn().mockResolvedValue([]), $executeRawUnsafe: jest.fn().mockResolvedValue(1) })
      .overrideProvider(ConfigService).useValue({ get: jest.fn().mockReturnValue('mock-secret') })
      .overrideProvider(SecurityContext).useValue({ logSecurityEvent: jest.fn() })
      .overrideProvider(AnomalyDetectionService).useValue({ detect: jest.fn() })
      .overrideProvider(RateLimiterService).useValue({ consume: jest.fn() })
      .overrideProvider(AuditService).useValue({ logActivity: jest.fn(), logSecurityEvent: jest.fn() })
      .overrideProvider(EncryptedFieldService).useValue({ encrypt: jest.fn() })
      .overrideProvider(InputValidatorService).useValue({ secureValidate: jest.fn() })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should export AuthService', () => {
    const exported = module.get<AuthService>(AuthService);
    expect(exported).toBeInstanceOf(AuthService);
  });

  it('should contain AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should be able to resolve all required providers', async () => {
    expect(module.get(PrismaService)).toBeDefined();
    // Resolve scoped provider
    const tenantContext = await module.resolve(TenantContextService);
    expect(tenantContext).toBeDefined();
  });
});
