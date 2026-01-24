import { TenantMiddleware } from './tenant.middleware';
import { Request, Response } from 'express';

describe('TenantMiddleware', () => {
    let middleware: TenantMiddleware;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        middleware = new TenantMiddleware();
        mockRequest = {
            headers: {},
        };
        mockResponse = {};
        nextFunction = jest.fn();
    });

    it('should extract tenant id from x-tenant-id header', () => {
        mockRequest.headers = { 'x-tenant-id': 'test-tenant' };
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
        expect((mockRequest as any).tenantId).toBe('test-tenant');
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should proceed without tenantId if header is missing', () => {
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
        expect((mockRequest as any).tenantId).toBeUndefined();
        expect(nextFunction).toHaveBeenCalled();
    });
});
