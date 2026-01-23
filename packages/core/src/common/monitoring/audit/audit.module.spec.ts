import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from './audit.module';
import { AuditService } from './audit.service';

describe('AuditModule', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuditModule],
    }).compile();
  });

  it('exports AuditService', () => {
    const svc = module.get<AuditService>(AuditService);
    expect(svc).toBeInstanceOf(AuditService);
  });
});
