
import { Test, TestingModule } from '@nestjs/testing';
import { LicensesService } from './licenses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LicensesService', () => {
    let service: LicensesService;

    const mockPrismaService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LicensesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<LicensesService>(LicensesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateLicense', () => {
        it('should generate a valid license key format', async () => {
            const result = await service.generateLicense('tenant-1', 'plan-basic');
            expect(result.key).toMatch(/^APEX-[A-F0-9]{32}$/);
            expect(result.status).toBe('ACTIVE');
        });

        it('should set default expiry to 30 days', async () => {
            const result = await service.generateLicense('tenant-1', 'plan-basic');
            const diff = result.expiresAt.getTime() - new Date().getTime();
            const days = Math.round(diff / (1000 * 60 * 60 * 24));
            expect(days).toBe(30);
        });
    });

    describe('validateLicense', () => {
        it('should return valid true for correct format', async () => {
            const result = await service.validateLicense('APEX-1234567890ABCDEF1234567890ABCDEF');
            expect(result.valid).toBe(true);
        });

        it('should return valid false for invalid format', async () => {
            const result = await service.validateLicense('INVALID-KEY');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('INVALID_FORMAT');
        });
    });

    describe('revokeLicense', () => {
        it('should revoke license', async () => {
            const result = await service.revokeLicense('APEX-KEY');
            expect(result.success).toBe(true);
            expect(result.status).toBe('REVOKED');
        });
    });

    describe('extendLicense', () => {
        it('should extend license validity', async () => {
            const result = await service.extendLicense('APEX-KEY', 10);
            expect(result.success).toBe(true);
            expect(result.newExpiry.getTime()).toBeGreaterThan(Date.now());
        });

        it('should throw behavior for negative days', async () => {
            await expect(service.extendLicense('KEY', -5))
                .rejects.toThrow();
        });
    });
});
