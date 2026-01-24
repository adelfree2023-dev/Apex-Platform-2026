import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from './events.module';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/security/tenant-context/tenant-context.service';

import { commonProviders } from '../../test/test-utils';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(PrismaModule).useValue({ providers: commonProviders })
      .compile();
  });

  it('should provide EventsService', () => {
    const svc = module.get<EventsService>(EventsService);
    expect(svc).toBeInstanceOf(EventsService);
  });

  it('must import PrismaModule', () => {
    const imports = (module as any).imports.map((i: any) => i?.metatype?.name);
    expect(imports).toContain('PrismaModule');
  });

  it('must export EventsService', () => {
    const exports = (module as any).exports.map((e: any) => e?.name);
    expect(exports).toContain('EventsService');
  });
});
