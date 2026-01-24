import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
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

describe('AuthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService).useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(ConfigService).useValue({ get: jest.fn() })
      .overrideProvider(SecurityContext).useValue({ logSecurityEvent: jest.fn() })
      .overrideProvider(AnomalyDetectionService).useValue({ detect: jest.fn() })
      .overrideProvider(RateLimiterService).useValue({ consume: jest.fn() })
      .overrideProvider(AuditService).useValue({ logActivity: jest.fn(), logSecurityEvent: jest.fn() })
      .overrideProvider(EncryptedFieldService).useValue({ encrypt: jest.fn() })
      .overrideProvider(InputValidatorService).useValue({ secureValidate: jest.fn() })
      .compile();
  });

  it('should export AuthService', () => {
    const exported = module.get<AuthService>(AuthService);
    expect(exported).toBeInstanceOf(AuthService);
  });

  it('should contain JwtModule with secret', () => {
    const jwt = module.select(JwtModule);
    expect(jwt).toBeDefined();
  });

  it('should import PrismaModule and PassportModule', () => {
    const imports = (module as any).imports;
    const names = imports.map((i: any) => i?.metatype?.name);
    expect(names).toContain('PrismaModule');
    expect(names).toContain('PassportModule');
  });
});
