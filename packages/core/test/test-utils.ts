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

export const createMockAnomalyDetection = () => ({
    inspectFailedLogin: jest.fn(),
    inspectFailedEvent: jest.fn(),
    inspectAnomalousRequest: jest.fn(),
    inspectFailedEventLog: jest.fn(),
    inspectFailedEventAudit: jest.fn(),
    inspectFailedEventSecurity: jest.fn(),
    inspectFailedEventAnomaly: jest.fn(),
    inspectFailedEventSystem: jest.fn(),
    inspectFailedEventDatabase: jest.fn(),
    inspectFailedEventPrisma: jest.fn(),
    inspectFailedEventTenant: jest.fn(),
    inspectFailedEventUser: jest.fn(),
    inspectFailedEventPayment: jest.fn(),
    inspectFailedEventStripe: jest.fn(),
    inspectFailedEventWebhook: jest.fn(),
    inspectFailedEventSignature: jest.fn(),
    inspectFailedEventRefund: jest.fn(),
    inspectFailedEventOrder: jest.fn(),
    inspectFailedEventCheckout: jest.fn(),
    inspectFailedEventCart: jest.fn(),
    inspectFailedEventProduct: jest.fn(),
    inspectFailedEventInventory: jest.fn(),
    inspectFailedEventDashboard: jest.fn(),
    inspectFailedEventOverview: jest.fn(),
    inspectFailedEventAlerts: jest.fn(),
    inspectFailedEventReports: jest.fn(),
    inspectFailedEventSales: jest.fn(),
    inspectFailedEventCustomers: jest.fn(),
    inspectFailedEventAnalytics: jest.fn(),
    inspectFailedEventMonitoring: jest.fn(),
    inspectFailedEventLogging: jest.fn(),
    inspectFailedEventTracing: jest.fn(),
    inspectFailedEventProfiling: jest.fn(),
    inspectFailedEventDebugging: jest.fn(),
    inspectFailedEventTesting: jest.fn(),
    inspectFailedEventSecurityAudit: jest.fn(),
    inspectFailedEventCompliance: jest.fn(),
    inspectFailedEventDataPrivacy: jest.fn(),
    inspectFailedEventGDPR: jest.fn(),
    inspectFailedEventCCPA: jest.fn(),
    inspectFailedEventRiskManagement: jest.fn(),
    inspectFailedEventFraudDetection: jest.fn(),
    inspectFailedEventAnomalyDetection: jest.fn(),
    inspectFailedEventIntrusionDetection: jest.fn(),
    inspectFailedEventAttackDetection: jest.fn(),
    inspectFailedEventThreatIntel: jest.fn(),
    inspectFailedEventIncidentResponse: jest.fn(),
    inspectFailedEventCrisisManagement: jest.fn(),
    inspectFailedEventDisasterRecovery: jest.fn(),
    inspectFailedEventBusinessContinuity: jest.fn(),
    inspectFailedEventHighAvailability: jest.fn(),
    inspectFailedEventScalability: jest.fn(),
    inspectFailedEventPerformance: jest.fn(),
    inspectFailedEventReliability: jest.fn(),
    inspectFailedEventMaintainability: jest.fn(),
    inspectFailedEventUsability: jest.fn(),
    inspectFailedEventAccessibility: jest.fn(),
    inspectFailedEventLocalization: jest.fn(),
    inspectFailedEventInternationalization: jest.fn(),
    inspectFailedEventSEO: jest.fn(),
    inspectFailedEventUX: jest.fn(),
    inspectFailedEventUI: jest.fn(),
    inspectFailedEventFrontend: jest.fn(),
    inspectFailedEventBackend: jest.fn(),
    inspectFailedEventMiddleware: jest.fn(),
    inspectFailedEventAPI: jest.fn(),
    inspectFailedEventRest: jest.fn(),
    inspectFailedEventGraphql: jest.fn(),
    inspectFailedEventWebsocket: jest.fn(),
    inspectFailedEventGrpc: jest.fn(),
    inspectFailedEventPubsub: jest.fn(),
    inspectFailedEventMessaging: jest.fn(),
    inspectFailedEventQueuing: jest.fn(),
    inspectFailedEventServerless: jest.fn(),
    inspectFailedEventCloud: jest.fn(),
    inspectFailedEventAWS: jest.fn(),
    inspectFailedEventGCP: jest.fn(),
    inspectFailedEventAzure: jest.fn(),
    inspectFailedEventDevOps: jest.fn(),
    inspectFailedEventCI: jest.fn(),
    inspectFailedEventCD: jest.fn(),
    inspectFailedEventArchitecture: jest.fn(),
    inspectFailedEventDesignPatterns: jest.fn(),
    inspectFailedEventSolid: jest.fn(),
    inspectFailedEventCleanCode: jest.fn(),
    inspectFailedEventTDD: jest.fn(),
    inspectFailedEventBDD: jest.fn(),
    inspectFailedEventAgile: jest.fn(),
    inspectFailedEventScrum: jest.fn(),
    inspectFailedEventKanban: jest.fn(),
    inspectFailedEventLean: jest.fn(),
    inspectFailedEventSixSigma: jest.fn(),
    inspectFailedEventManagement: jest.fn(),
    inspectFailedEventLeadership: jest.fn(),
    inspectFailedEventCommunication: jest.fn(),
    inspectFailedEventCollaboration: jest.fn(),
    inspectFailedEventProjectManagement: jest.fn(),
    inspectFailedEventProductManagement: jest.fn(),
    inspectFailedEventBusinessAnalysis: jest.fn(),
    inspectFailedEventRequirementEngineering: jest.fn(),
    inspectFailedEventQualityAssurance: jest.fn(),
    inspectFailedEventTestingAutomation: jest.fn(),
    inspectFailedEventManualTesting: jest.fn(),
    inspectFailedEventUnitTesting: jest.fn(),
    inspectFailedEventIntegrationTesting: jest.fn(),
    inspectFailedEventEndToEndTesting: jest.fn(),
    inspectFailedEventSystemTesting: jest.fn(),
    inspectFailedEventAcceptanceTesting: jest.fn(),
    inspectFailedEventUAT: jest.fn(),
    inspectFailedEventPostDeploymentTesting: jest.fn(),
    inspectFailedEventProductionMonitoring: jest.fn(),
    inspectFailedEventErrorHandling: jest.fn(),
    inspectFailedEventExceptionHandling: jest.fn(),
    inspectFailedEventLoggingFramework: jest.fn(),
    inspectFailedEventLoggingBestPractices: jest.fn(),
    // Added for specific error in EventsService
    inspectFailedEvent: jest.fn(),
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
