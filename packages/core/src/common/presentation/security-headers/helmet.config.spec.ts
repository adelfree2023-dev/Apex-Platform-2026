import { Test, TestingModule } from '@nestjs/testing';
import { HelmetConfig } from './helmet.config';
import { Response } from 'express';

describe('HelmetConfig', () => {
    let config: HelmetConfig;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelmetConfig],
        }).compile();

        config = module.get<HelmetConfig>(HelmetConfig);
    });

    it('should be defined', () => {
        expect(config).toBeDefined();
    });

    it('should return helmet middleware configuration', () => {
        const middleware = config.getHelmetMiddleware();
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
    });

    it('should apply tenant caching headers', () => {
        const mockRes = {
            setHeader: jest.fn(),
        } as unknown as Response;

        config.applyTenantCachingHeaders(mockRes, 'tenant-123');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', expect.any(String));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Surrogate-Key', 'tenant-tenant-123');
    });

    it('should provide different CSP directives for production vs development', () => {
        // Accessing private method for test coverage of logic
        const devCsp = (config as any).getContentSecurityPolicy();

        // Simulate production
        (config as any).isProduction = true;
        const prodCsp = (config as any).getContentSecurityPolicy();

        expect(devCsp.directives.scriptSrc).toContain('ws:');
        expect(prodCsp.directives.scriptSrc).toContain('https://cdn.jsdelivr.net');
    });
});
