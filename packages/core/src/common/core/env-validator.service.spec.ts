import { Test, TestingModule } from '@nestjs/testing';
import { EnvValidatorService } from './env-validator.service';
import { ApexConfigService } from './apex-config.service';
import { SecurityContext } from '../security/security.context';

describe('EnvValidatorService', () => {
    let service: EnvValidatorService;
    let mockConfig: any;
    let mockSecurityContext: any;

    beforeEach(async () => {
        mockConfig = {
            isProduction: jest.fn().mockReturnValue(false),
            get: jest.fn().mockImplementation((key) => process.env[key]),
            getNumber: jest.fn().mockImplementation((key, def) => {
                const val = process.env[key];
                return val ? parseInt(val, 10) : def;
            }),
            getBoolean: jest.fn().mockImplementation((key, def) => {
                const val = process.env[key];
                return val !== undefined ? val === 'true' : def;
            }),
        };

        mockSecurityContext = {
            logSecurityEvent: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnvValidatorService,
                { provide: ApexConfigService, useValue: mockConfig },
                { provide: SecurityContext, useValue: mockSecurityContext },
            ],
        }).compile();

        service = module.get<EnvValidatorService>(EnvValidatorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should validate development environment with warnings', () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'warn');
        service.validateEnvironment();
        expect(loggerSpy).toHaveBeenCalled();
    });

    it('should throw in production if vars are missing', () => {
        mockConfig.isProduction.mockReturnValue(true);
        mockConfig.get.mockReturnValue(null);

        expect(() => service.validateEnvironment()).toThrow();
    });

    it('should throw in production if JWT_SECRET is weak', () => {
        mockConfig.isProduction.mockReturnValue(true);
        mockConfig.get.mockImplementation((key: string) => {
            if (key === 'JWT_SECRET') return 'short';
            if (['LOCAL_DEV', 'DEBUG_MODE', 'SKIP_AUTH'].includes(key)) return null;
            return 'valid-value';
        });

        expect(() => service.validateEnvironment()).toThrow('JWT_SECRET غير آمن للإنتاج');
    });

    it('should validate system readiness', async () => {
        const readiness = await service.validateSystemReadiness();
        expect(readiness).toBe(true);
    });
});
