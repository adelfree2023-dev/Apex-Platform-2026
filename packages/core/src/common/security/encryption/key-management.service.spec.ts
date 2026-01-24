import { Test, TestingModule } from '@nestjs/testing';
import { KeyManagementService } from './key-management.service';

describe('KeyManagementService', () => {
    let service: KeyManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [KeyManagementService],
        }).compile();

        service = module.get<KeyManagementService>(KeyManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should validate key integrity', async () => {
        const result = await service.validateKeyIntegrity();
        expect(result).toBe(true);
    });
});
