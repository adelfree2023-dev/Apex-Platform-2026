import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getCommonProviders } from '../../../../test/test-utils';

describe('AuditModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuditService,
        ...getCommonProviders([AuditService]),
      ],
    }).compile();
  });

  it('exports AuditService', () => {
    expect(module.get<AuditService>(AuditService)).toBeDefined();
  });
});
