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
import { CacheService } from '../src/common/caching/cache.service';

/** 🛡️ ASMP: Unified Test Utilities (Final Stabilization) */

export const createMockPrisma = () => {
    const mock: any = {
        tenant: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        product: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }), groupBy: jest.fn().mockResolvedValue([]) },
        customer: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        payment: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        systemSetting: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), createMany: jest.fn().mockResolvedValue({ count: 0 }), update: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(0) },
        $transaction: jest.fn().mockImplementation((cb) => cb(mock)),
        $queryRaw: jest.fn().mockResolvedValue([]),
        $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    return mock;
};

export const createMockAudit = () => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    logOperation: jest.fn().mockResolvedValue(undefined),
    logCriticalSecurityEvent: jest.fn().mockResolvedValue(undefined),
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

export const createMockAnomalyDetection = () => ({
    inspectFailedLogin: jest.fn(),
    inspectFailedEvent: jest.fn(),
    inspectAnomalousRequest: jest.fn(),
    isSuspended: jest.fn().mockReturnValue(false),
    isThrottled: jest.fn().mockReturnValue(false),
    inspect: jest.fn(),
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

export const createMockCache = () => ({
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    wrap: jest.fn().mockImplementation((_, cb) => cb()),
});

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
export const mockCache = createMockCache();

export const getCommonProviders = (exclude: any[] = []): Provider[] => {
    const providers: Provider[] = [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: SecurityContext, useValue: mockSecurityContext },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: MailService, useValue: mockMailService },
        { provide: AnomalyDetectionService, useValue: mockAnomalyDetection },
        { provide: InputValidatorService, useValue: mockInputValidator },
        { provide: SanitizerService, useValue: mockSanitizer },
        { provide: EncryptedFieldService, useValue: mockEncryption },
        { provide: CacheService, useValue: mockCache },
        Reflector,
        { provide: 'SECURITY_LOGGER', useValue: { logEvent: jest.fn() } },
        { provide: 'CACHE_MANAGER', useValue: mockCache },
    ];

    return providers.filter(p => {
        if ('provide' in p) {
            return !exclude.includes(p.provide);
        }
        return !exclude.includes(p);
    });
};

export const commonProviders: Provider[] = getCommonProviders();
