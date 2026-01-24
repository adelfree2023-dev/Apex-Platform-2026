import { Test, TestingModule } from '@nestjs/testing';
import { EnvValidatorService } from './env-validator.service';
import { ConfigService } from './config.service';

describe('EnvValidatorService', () => {
    let service: EnvValidatorService;
    let mockConfig: any;

    beforeEach(async () => {
        mockConfig = {
            isProduction: jest.fn().mockReturnValue(false),
            get: jest.fn().mockImplementation((key) => process.env[key]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnvValidatorService,
                { provide: ConfigService, useValue: mockConfig },
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
        mockConfig.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return 'short';
            return 'valid-value';
        });

        expect(() => service.validateEnvironment()).toThrow('JWT_SECRET غير آمن للإنتاج');
    });

    it('should validate system readiness', async () => {
        const readiness = await service.validateSystemReadiness();
        expect(readiness).toBe(true);
    });
});
