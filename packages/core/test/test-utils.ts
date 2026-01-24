import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/common/monitoring/audit/audit.service';
import { SecurityContext } from '../src/common/security/security.context';
import { TenantContextService } from '../src/common/security/tenant-context/tenant-context.service';
import { RateLimiterService } from '../src/common/access-control/services/rate-limiter.service';
import { MailService } from '../src/common/communication/mail.service';
import { AnomalyDetectionService } from '../src/common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../src/common/security/validation/input-validator.service';
import { SanitizerService } from '../src/common/security/validation/sanitizer.service';
import { EncryptedFieldService } from '../src/common/security/encryption/encrypted-field.service';
import * as crypto from 'crypto';

// 🛡️ Mock crypto globally for NestJS ModuleTokenFactory and other internals
if (!crypto.createHash) {
    (crypto as any).createHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-hash'),
    });
}

export const createMockPrisma = () => {
    const mock: any = {
        tenant: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
        user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
        product: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
        order: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
        customer: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
        payment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
        $transaction: jest.fn().mockImplementation((cb) => cb(mock)),
        $queryRaw: jest.fn().mockResolvedValue([]),
        $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };
    return mock;
};

export const createMockAudit = () => ({
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn(),
    logOperation: jest.fn(),
    logCriticalSecurityEvent: jest.fn(),
    setIsSystemReady: jest.fn(),
});

export const createMockSecurityContext = () => ({
    logSecurityEvent: jest.fn(),
    logCriticalSecurityEvent: jest.fn(),
    captureException: jest.fn(),
    getIpFromRequest: jest.fn().mockReturnValue('127.0.0.1'),
});

export const createMockTenantContext = () => ({
    getTenantId: jest.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'),
    getUserId: jest.fn().mockReturnValue('test-user-id'),
    getSchemaName: jest.fn().mockReturnValue('tenant_test'),
    getTenantSchema: jest.fn().mockResolvedValue('tenant_test'),
    setTenantId: jest.fn(),
    clearTenantId: jest.fn(),
    getCurrentTenant: jest.fn().mockReturnValue({ id: '00000000-0000-0000-0000-000000000001', schemaName: 'tenant_test' }),
});

export const createMockConfig = () => ({
    get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'BASE_DOMAIN') return 'apex-platform.com';
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_dummy';
        if (key === 'NODE_ENV') return 'development';
        return 'test-value';
    }),
});

export const createMockRateLimiter = () => ({
    consume: jest.fn().mockResolvedValue({ allowed: true }),
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, currentRequests: 1, maxRequests: 5 }),
});

export const createMockMailService = () => ({
    sendMail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
});

// Simplified mock for AnomalyDetectionService
inspectFailedLogin: jest.fn(),
    inspectFailedEvent: jest.fn(),
        inspectAnomalousRequest: jest.fn(),
});


export const createMockInputValidator = () => ({
    secureValidate: jest.fn().mockImplementation(async (_, data) => data),
    getTenantIdSchema: jest.fn().mockReturnValue({ parse: jest.fn() }),
});

export const createMockSanitizer = () => ({
    sanitizeObject: jest.fn().mockImplementation((data) => data),
    sanitizeString: jest.fn().mockImplementation((str) => str),
});

export const createMockEncryption = () => ({
    encrypt: jest.fn((_, data) => `encrypted:${data}`),
    decrypt: jest.fn((_, data) => data?.replace('encrypted:', '') || data),
    encryptSensitiveData: jest.fn((data) => `encrypted:${data}`),
    decryptSensitiveData: jest.fn((data) => data?.replace('encrypted:', '') || data),
});

export const getCommonProviders = (exclude: any[] = []): Provider[] => {
    const providers: Provider[] = [
        { provide: PrismaService, useValue: createMockPrisma() },
        { provide: AuditService, useValue: createMockAudit() },
        { provide: SecurityContext, useValue: createMockSecurityContext() },
        { provide: TenantContextService, useValue: createMockTenantContext() },
        { provide: ConfigService, useValue: createMockConfig() },
        { provide: RateLimiterService, useValue: createMockRateLimiter() },
        { provide: MailService, useValue: createMockMailService() },
        { provide: AnomalyDetectionService, useValue: createMockAnomalyDetection() },
        { provide: InputValidatorService, useValue: createMockInputValidator() },
        { provide: SanitizerService, useValue: createMockSanitizer() },
        { provide: EncryptedFieldService, useValue: createMockEncryption() },
        Reflector,
        { provide: 'SECURITY_LOGGER', useValue: { logEvent: jest.fn() } },
        { provide: 'CACHE_MANAGER', useValue: { get: jest.fn(), set: jest.fn() } },
    ];

    return providers.filter(p => {
        if ('provide' in p) {
            return !exclude.includes(p.provide);
        }
        return !exclude.includes(p);
    });
};

// Singletons for simple tests (Backward compatibility)
export const mockPrisma = createMockPrisma();
export const mockAudit = createMockAudit();
export const mockSecurityContext = createMockSecurityContext();
export const mockTenantContext = createMockTenantContext();
export const mockConfig = createMockConfig();
export const mockRateLimiter = createMockRateLimiter();
export const mockMailService = createMockMailService();
export const mockAnomalyDetection = createMockAnomalyDetection();
export const mockInputValidator = createMockInputValidator();
export const mockSanitizer = createMockSanitizer();
export const mockEncryption = createMockEncryption();

export const commonProviders: Provider[] = getCommonProviders();
