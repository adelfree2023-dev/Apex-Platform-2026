import { Test, TestingModule } from '@nestjs/testing';
import { HQAuthController } from './hq-auth.controller';
import { HQAuthService } from './hq-auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HQAuthController', () => {
    let controller: HQAuthController;
    let service: HQAuthService;

    const mockHQAuthService = {
        login: jest.fn(),
        verifyToken: jest.fn(),
        getAllUsers: jest.fn(),
        createUser: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HQAuthController],
            providers: [
                { provide: HQAuthService, useValue: mockHQAuthService },
            ],
        }).compile();

        controller = module.get<HQAuthController>(HQAuthController);
        service = module.get<HQAuthService>(HQAuthService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('login', () => {
        it('should login and return user with token', async () => {
            const loginResult = {
                user: { id: 1, email: 'admin@apex.com', name: 'Admin', role: 'super_admin' },
                accessToken: 'token-123',
            };
            mockHQAuthService.login.mockResolvedValue(loginResult);

            const result = await controller.login({ email: 'admin@apex.com', password: 'password' });

            expect(result.success).toBe(true);
            expect(result.accessToken).toBe('token-123');
            expect(result.user.name).toBe('Admin');
        });

        it('should throw unauthorized on invalid login', async () => {
            mockHQAuthService.login.mockResolvedValue(null);

            await expect(controller.login({ email: 'wrong', password: 'wrong' }))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getCurrentUser', () => {
        it('should return decoded user from token', async () => {
            const decoded = { userId: 1, email: 'admin@apex.com', role: 'super_admin' };
            mockHQAuthService.verifyToken.mockReturnValue(decoded);

            const result = await controller.getCurrentUser('Bearer valid-token');

            expect(result.success).toBe(true);
            expect(result.user.email).toBe('admin@apex.com');
        });

        it('should throw unauthorized if no token', async () => {
            await expect(controller.getCurrentUser(undefined))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getUsers', () => {
        it('should return all users for super admin', async () => {
            mockHQAuthService.verifyToken.mockReturnValue({ role: 'super_admin' });
            mockHQAuthService.getAllUsers.mockResolvedValue([{ id: 1, email: 'admin@apex.com' }]);

            const result = await controller.getUsers('Bearer token');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });

        it('should forbid non-super-admins', async () => {
            mockHQAuthService.verifyToken.mockReturnValue({ role: 'admin' });

            await expect(controller.getUsers('Bearer token'))
                .rejects.toThrow(HttpException);
        });
    });
});
