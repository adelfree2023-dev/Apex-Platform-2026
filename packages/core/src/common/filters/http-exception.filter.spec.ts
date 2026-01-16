/**
 * HTTP Exception Filter Unit Tests
 * Root-analyzed: AllExceptionsFilter with catch method, handles prod/dev modes
 */

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let mockResponse: any;
    let mockRequest: any;
    let mockHost: any;

    beforeEach(() => {
        filter = new AllExceptionsFilter();

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        mockRequest = {
            method: 'GET',
            url: '/api/test',
        };

        mockHost = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: jest.fn().mockReturnValue(mockResponse),
                getRequest: jest.fn().mockReturnValue(mockRequest),
            }),
        };

        // Silence logger
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    describe('catch', () => {
        it('should handle HttpException with correct status', () => {
            const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should handle generic Error with 500 status', () => {
            const exception = new Error('Something went wrong');

            filter.catch(exception, mockHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        });

        it('should include requestId in response', () => {
            const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.requestId).toBeDefined();
            expect(typeof jsonCall.requestId).toBe('string');
        });

        it('should include timestamp in response', () => {
            const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.timestamp).toBeDefined();
        });

        it('should include path in response', () => {
            const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.path).toBe('/api/test');
        });

        it('should return statusCode in response', () => {
            const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.statusCode).toBe(HttpStatus.FORBIDDEN);
        });

        it('should handle string message', () => {
            const exception = new HttpException('Simple message', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.message).toBe('Simple message');
        });

        it('should handle object message with message property', () => {
            const exception = new HttpException({ message: 'Validation failed' }, HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost);

            const jsonCall = mockResponse.json.mock.calls[0][0];
            expect(jsonCall.message).toBe('Validation failed');
        });

        describe('production mode', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'production';
            });

            afterEach(() => {
                delete process.env.NODE_ENV;
            });

            it('should hide internal error details in production', () => {
                const exception = new Error('Database connection failed');

                filter.catch(exception, mockHost);

                const jsonCall = mockResponse.json.mock.calls[0][0];
                expect(jsonCall.message).toBe('Internal server error');
                expect(jsonCall.stack).toBeUndefined();
            });

            it('should show client error message in production', () => {
                const exception = new HttpException('Invalid input', HttpStatus.BAD_REQUEST);

                filter.catch(exception, mockHost);

                const jsonCall = mockResponse.json.mock.calls[0][0];
                expect(jsonCall.message).toBe('Invalid input');
            });
        });

        describe('development mode', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'development';
            });

            afterEach(() => {
                delete process.env.NODE_ENV;
            });

            it('should include stack trace in development', () => {
                const exception = new Error('Debug error');

                filter.catch(exception, mockHost);

                const jsonCall = mockResponse.json.mock.calls[0][0];
                expect(jsonCall.stack).toBeDefined();
            });

            it('should include error name in development', () => {
                const exception = new Error('Test error');

                filter.catch(exception, mockHost);

                const jsonCall = mockResponse.json.mock.calls[0][0];
                expect(jsonCall.error).toBe('Error');
            });
        });
    });
});
