/**
 * App Controller Unit Tests
 * Root-analyzed: Uses AppService.getHealth()
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let controller: AppController;

    const mockAppService = {
        getHealth: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                { provide: AppService, useValue: mockAppService },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('healthCheck', () => {
        it('should return health status', () => {
            const mockHealth = {
                status: 'ok',
                service: 'apex-core',
                timestamp: '2026-01-16T05:00:00Z',
                version: '0.0.1',
            };
            mockAppService.getHealth.mockReturnValue(mockHealth);

            const result = controller.healthCheck();

            expect(result).toEqual(mockHealth);
            expect(mockAppService.getHealth).toHaveBeenCalled();
        });

        it('should call appService.getHealth', () => {
            mockAppService.getHealth.mockReturnValue({ status: 'ok' });

            controller.healthCheck();

            expect(mockAppService.getHealth).toHaveBeenCalledTimes(1);
        });
    });
});
