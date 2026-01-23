import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTenantDto } from './create-tenant.dto';

describe('CreateTenantDto validation', () => {
  const valid: CreateTenantDto = {
    storeName: 'Demo Store',
    subdomain: 'demo',
    businessType: 'retail',
    email: 'owner@example.com',
    password: 'SuperStrongPass123',
  };

  it('passes with correct data', async () => {
    const dto = plainToInstance(CreateTenantDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when subdomain contains invalid chars', async () => {
    const dto = plainToInstance(CreateTenantDto, {
      ...valid,
      subdomain: 'bad_subdomain!',
    });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('subdomain');
  });

  it('fails when password is too short', async () => {
    const dto = plainToInstance(CreateTenantDto, {
      ...valid,
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('password');
  });
});
