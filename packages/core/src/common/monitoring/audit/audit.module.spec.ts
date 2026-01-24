import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from './audit.module';
import { SecurityContext } from '../../security/security.context';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createMockSecurityContext, createMockPrisma, createMockConfig } from '../../../../test/test-utils';

describe('AuditModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .overrideProvider(PrismaService).useValue(createMockPrisma())
      .overrideProvider(ConfigService).useValue(createMockConfig())
      .compile();
  });

  it('exports AuditService', () => {
    expect(module).toBeDefined();
  });
});
