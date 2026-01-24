import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { getCommonProviders } from '../../../test/test-utils';

describe('TenantsController (e2e)', () => {
  let controller: TenantsController;
  const mockService = {
    createTenantWithStore: jest.fn().mockResolvedValue({ id: 't1' }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        { provide: TenantsService, useValue: mockService },
        ...getCommonProviders(),
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
