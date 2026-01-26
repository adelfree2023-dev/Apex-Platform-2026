import { Test, TestingModule } from '@nestjs/testing';
import { ApexConfigService } from './apex-config.service';

describe('ApexConfigService', () => {
    let service: ApexConfigService;

    beforeEach(async () => {
        // We need to clear env for some tests
        process.env.NODE_ENV = 'development';

        const module: TestingModule = await Test.createTestingModule({
            providers: [ApexConfigService],
        }).compile();

        service = module.get<ApexConfigService>(ApexConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should retrieve keys correctly', () => {
        process.env.JWT_SECRET = 'my-super-long-jwt-secret-key-1234567890';
        const value = service.get('JWT_SECRET');
        expect(value).toBe('my-super-long-jwt-secret-key-1234567890');
    });

    it('should identify production environment', () => {
        process.env.NODE_ENV = 'production';
        expect(service.isProduction()).toBe(true);
    });

    it('should throw in production if critical vars are missing', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;

        expect(() => new ApexConfigService()).toThrow();
    });

    it('should get numbers and booleans', () => {
        process.env.TEST_NUM = '123';
        process.env.TEST_BOOL = 'true';

        expect(service.getNumber('TEST_NUM')).toBe(123);
        expect(service.getBoolean('TEST_BOOL')).toBe(true);
        expect(service.getBoolean('NON_EXISTENT', true)).toBe(true);
    });
});
