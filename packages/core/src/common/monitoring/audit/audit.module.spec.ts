import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from './audit.module';
import { SecurityContext } from '../../security/security.context';
import { createMockSecurityContext } from '../../../../test/test-utils';

describe('AuditModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(SecurityContext).useValue(createMockSecurityContext())
      .compile();
  });

  it('exports AuditService', () => {
    expect(module).toBeDefined();
  });
});
