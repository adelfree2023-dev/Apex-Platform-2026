import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';

import { ConfigService } from '@nestjs/config';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService).useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(ConfigService).useValue({ get: jest.fn() })
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
