import { Test, TestingModule } from '@nestjs/testing';
import { HQAuthService } from './hq-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

describe('HQAuthService', () => {
    let service: HQAuthService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HQAuthService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<HQAuthService>(HQAuthService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('seedDefaultAdmin', () => {
        it('should create default admin if not exists', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.seedDefaultAdmin();

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO public.hq_users')
            );
        });

        it('should skip seeding if admin exists', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, email: 'admin@apex.com' }]);

            await service.seedDefaultAdmin();

            expect(mockPrismaService.$executeRawUnsafe).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: 1,
                email: 'test@apex.com',
                passwordHash,
                name: 'Test Admin',
                role: 'super_admin',
                status: 'active',
                createdAt: new Date(),
            };

            mockPrismaService.$queryRawUnsafe.mockResolvedValue([mockUser]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.login('test@apex.com', 'password123');

            expect(result).not.toBeNull();
            expect(result.accessToken).toBeDefined();
            expect(result.user.email).toBe('test@apex.com');
        });

        it('should return null with invalid credentials', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: 1,
                email: 'test@apex.com',
                passwordHash,
            };

            mockPrismaService.$queryRawUnsafe.mockResolvedValue([mockUser]);

            const result = await service.login('test@apex.com', 'wrongpassword');

            expect(result).toBeNull();
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', () => {
            const payload = { userId: 1, email: 'test@apex.com', role: 'super_admin' };
            const token = jwt.sign(payload, process.env.JWT_SECRET || 'apex-hq-super-secret-key-2026');

            const decoded = service.verifyToken(token);

            expect(decoded.email).toBe('test@apex.com');
        });

        it('should return null for invalid token', () => {
            const result = service.verifyToken('invalid-token');
            expect(result).toBeNull();
        });
    });
});
