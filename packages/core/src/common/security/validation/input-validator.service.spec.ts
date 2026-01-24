import { Test, TestingModule } from '@nestjs/testing';
import { InputValidatorService } from './input-validator.service';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';
import { getCommonProviders } from '../../../../test/test-utils';

describe('InputValidatorService', () => {
  let service: InputValidatorService;
  const schema = z.object({ name: z.string().min(2) });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputValidatorService,
        ...getCommonProviders([InputValidatorService]),
      ],
    }).compile();

    service = module.get<InputValidatorService>(InputValidatorService);
  });

  it('returns data when valid', async () => {
    const data = { name: 'Ali' };
    const result = await service.secureValidate(schema, data, 'test');
    expect(result).toEqual(data);
  });

  it('throws BadRequestException on invalid data', async () => {
    const data = { name: 'A' };
    await expect(service.secureValidate(schema, data, 'test')).rejects.toThrow(BadRequestException);
  });
});
