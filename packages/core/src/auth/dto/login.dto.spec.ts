import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto validation', () => {
  it('validates a correct DTO', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: 'Password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when email is missing', async () => {
    const dto = plainToInstance(LoginDto, {
      password: 'Password123',
    });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('email');
  });

  it('fails when password is too short', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('password');
  });
});
