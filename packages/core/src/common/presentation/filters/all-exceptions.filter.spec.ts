import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const mockHost = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
    }),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  it('handles HttpException correctly', () => {
    const exception = new HttpException('Bad', HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.BAD_REQUEST, message: 'Bad' }),
    );
  });

  it('handles generic Error as 500', () => {
    const exception = new Error('boom');
    filter.catch(exception, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' }),
    );
  });
});
