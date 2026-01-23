import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto validation', () => {
  const valid = {
    email: 'new@example.com',
    password: 'SuperStrongPass12345',
    name: 'Ali',
  };

  it('passes with valid data', async () => {
    const dto = plainToInstance(RegisterDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when email format is wrong', async () => {
    const dto = plainToInstance(RegisterDto, { ...valid, email: 'bad' });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('email');
  });

  it('fails when password is too short', async () => {
    const dto = plainToInstance(RegisterDto, { ...valid, password: 'short' });
    const errors = await validate(dto);
    expect(errors[0].property).toBe('password');
  });
});
