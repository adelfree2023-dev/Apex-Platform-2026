/**
 * App Service Unit Tests
 * Root-analyzed: getHealth() returns {status, service, timestamp, version}
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = module.get<AppService>(AppService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getHealth', () => {
        it('should return health object with status ok', () => {
            const result = service.getHealth();

            expect(result.status).toBe('ok');
        });

        it('should return service name apex-core', () => {
            const result = service.getHealth();

            expect(result.service).toBe('apex-core');
        });

        it('should return version 0.0.1', () => {
            const result = service.getHealth();

            expect(result.version).toBe('0.0.1');
        });

        it('should return ISO timestamp', () => {
            const result = service.getHealth();

            expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should return complete health object structure', () => {
            const result = service.getHealth();

            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('service');
            expect(result).toHaveProperty('timestamp');
            expect(result).toHaveProperty('version');
        });
    });
});
