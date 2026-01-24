import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../caching/cache.service';

describe('JwtService', () => {
    let service: JwtService;
    let mockNestJwt: any;
    let mockPrisma: any;
    let mockCache: any;

    beforeEach(async () => {
        mockNestJwt = {
            sign: jest.fn().mockReturnValue('mocked-token'),
            verify: jest.fn().mockReturnValue({ sub: 'user123' }),
        };
        mockPrisma = {};
        mockCache = {
            get: jest.fn().mockResolvedValue(null),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtService,
                { provide: NestJwtService, useValue: mockNestJwt },
                { provide: PrismaService, useValue: mockPrisma },
                { provide: CacheService, useValue: mockCache },
            ],
        }).compile();

        service = module.get<JwtService>(JwtService);
    });

    it('should sign a token', async () => {
        const payload = { sub: '123' };
        const token = await service.sign(payload);
        expect(token).toBe('mocked-token');
        expect(mockNestJwt.sign).toHaveBeenCalledWith(payload, undefined);
    });

    it('should verify a token', async () => {
        const payload = await service.verify('token123');
        expect(payload).toEqual({ sub: 'user123' });
        expect(mockNestJwt.verify).toHaveBeenCalledWith('token123', undefined);
    });

    describe('verifyWithRevocation', () => {
        it('should return payload if token is not revoked', async () => {
            const payload = await service.verifyWithRevocation('valid-token', 'tenant-1');
            expect(payload).toEqual({ sub: 'user123' });
        });

        it('should throw error if token is revoked', async () => {
            mockCache.get.mockResolvedValue(true);
            await expect(service.verifyWithRevocation('revoked-token', 'tenant-1'))
                .rejects.toThrow('تم إبطال الرمز المميز');
        });

        it('should throw error if verification fails', async () => {
            mockNestJwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
            await expect(service.verifyWithRevocation('bad-token', 'tenant-1'))
                .rejects.toThrow('Invalid');
        });
    });
});
