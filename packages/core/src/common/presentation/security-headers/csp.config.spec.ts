import { Test, TestingModule } from '@nestjs/testing';
import { CSPConfig } from './csp.config';

describe('CSPConfig', () => {
    let config: CSPConfig;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CSPConfig],
        }).compile();

        config = module.get<CSPConfig>(CSPConfig);
    });

    it('should be defined', () => {
        expect(config).toBeDefined();
    });

    it('should generate a unique nonce', () => {
        const nonce1 = config.generateNonce('req1');
        const nonce2 = config.generateNonce('req2');
        expect(nonce1).toBeDefined();
        expect(nonce2).toBeDefined();
        expect(nonce1).not.toBe(nonce2);
    });

    it('should validate a correct nonce', () => {
        const nonce = config.generateNonce('req1');
        expect(config.validateNonce('req1', nonce)).toBe(true);
    });

    it('should invalidate an incorrect or expired nonce', () => {
        config.generateNonce('req1');
        expect(config.validateNonce('req1', 'wrong-nonce')).toBe(false);
        expect(config.validateNonce('non-existent', 'any')).toBe(false);
    });

    it('should get correct CSP directives for development', () => {
        const directives = config.getCSPDirectives(undefined, 'development');
        expect(directives.scriptSrc).toContain('http://localhost:*');
        expect(directives.upgradeInsecureRequests).toEqual([]);
    });

    it('should get correct CSP directives for production', () => {
        const directives = config.getCSPDirectives(undefined, 'production');
        expect(directives.connectSrc).toContain('https://api.stripe.com');
        expect(directives.reportUri).toBeDefined();
    });

    it('should add tenant specific directives', () => {
        const directives = config.getCSPDirectives('enterprise-store', 'production');
        expect(directives.scriptSrc).toContain('https://js.stripe.com');
    });

    it('should generate a valid CSP header string', () => {
        const directives = {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            reportUri: ['https://report.com']
        };
        const header = config.generateCSPHeader(directives);
        expect(header).toContain("default-src 'self'");
        expect(header).toContain("script-src 'self'");
        expect(header).toContain("report-uri https://report.com");
    });

    it('should process violation reports', async () => {
        const loggerSpy = jest.spyOn((config as any).logger, 'warn');
        const report = { 'blocked-uri': 'http://evil.com', 'violated-directive': 'script-src' };
        await config.processViolationReport(report, 'tenant1', 'req1');
        expect(loggerSpy).toHaveBeenCalledWith('CSP Violation Detected', expect.any(Object));
    });
});
