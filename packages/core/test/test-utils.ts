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

export const createMockPrisma = () => {
    const mock: any = {
        tenant: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
        user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
        product: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
        order: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
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
});

export const createMockInputValidator = () => ({
    secureValidate: jest.fn().mockImplementation(async (_, data) => data),
});

// Singletons for simple tests (but factories should be used in TestingModule)
export const mockPrisma = createMockPrisma();
export const mockAudit = createMockAudit();
export const mockSecurityContext = createMockSecurityContext();
export const mockTenantContext = createMockTenantContext();
export const mockConfig = createMockConfig();
export const mockRateLimiter = createMockRateLimiter();
export const mockMailService = createMockMailService();
export const mockAnomalyDetection = createMockAnomalyDetection();
export const mockInputValidator = createMockInputValidator();

export const commonProviders: Provider[] = [
    { provide: PrismaService, useValue: mockPrisma },
    { provide: AuditService, useValue: mockAudit },
    { provide: SecurityContext, useValue: mockSecurityContext },
    { provide: TenantContextService, useValue: mockTenantContext },
    { provide: ConfigService, useValue: mockConfig },
    { provide: RateLimiterService, useValue: mockRateLimiter },
    { provide: MailService, useValue: mockMailService },
    { provide: AnomalyDetectionService, useValue: mockAnomalyDetection },
    { provide: InputValidatorService, useValue: mockInputValidator },
    Reflector,
];
