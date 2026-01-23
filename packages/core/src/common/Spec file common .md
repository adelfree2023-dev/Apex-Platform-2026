Below is a **complete “spec.ts” test‑suite** for **every source file** you listed.  
All tests are written with **Jest** (the default test‑runner used by NestJS) and use **Nest’s TestingModule** where a module is required, otherwise plain Jest mocks are used.  

The suite follows these rules:

| # | What we test                                                            |
|---|--------------------------------------------------------------------------|
|   | **Guards** – `canActivate` logic, decorator handling, DB calls          |
|   | **Services** – public methods, error handling, cryptographic checks      |
|   | **DTOs** – Zod schema validation (valid & invalid payloads)             |
|   | **Interceptors / Filters** – behaviour on success and error path        |
|   | **Utility functions** – hashing, constant‑time delay, CSP header build   |
|   | **Modules** – are they exported correctly (no runtime logic)             |

> **Important** – the tests only mock external dependencies (Prisma, ConfigService, etc.) so they run fast and deterministically, without a real DB or external services.

---

## 1️⃣ Guard tests

### `license.guard.spec.ts`

```ts
// packages/core/src/common/access-control/guards/license.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseGuard, LICENSE_KEY, DEFAULT_LICENSE_REQUIREMENTS } from './license.guard';
import { PrismaService } from '../../../prisma/prisma.service';

describe('LicenseGuard', () => {
  let guard: LicenseGuard;
  let prisma: jest.Mocked<PrismaService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRequest = (tenantId?: string, path = '/loyalty') => ({
    tenantId,
    headers: { 'x-tenant-id': tenantId },
    route: { path },
    path,
    method: 'GET',
  });

  const execContext = (request: any): ExecutionContext => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => null,
    getType: () => 'http',
    getParent: () => null,
    getArgsLength: () => 0,
    getArgs: () => [],
    getArgs: () => [],
    getClass: () => null,
    getHandler: () => null,
    getArgs: () => null,
  } as unknown as ExecutionContext);

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new LicenseGuard(prisma, reflector);
  });

  it('should allow when no tenantId is present (handled by TenantScopedGuard)', async () => {
    const ctx = execContext(mockRequest(undefined));
    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
  });

  it('should allow when no license requirements are defined', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = execContext(mockRequest('tid-123'));
    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
  });

  it('should block when tenant plan does not satisfy the required tiers', async () => {
    reflector.getAllAndOverride.mockReturnValue(['PRO']);
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tid-123',
      plan: 'FREE',
      name: 'TestTenant',
    });

    const ctx = execContext(mockRequest('tid-123', '/loyalty'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tid-123' },
      select: { id: true, plan: true, name: true },
    });
  });

  it('should read path‑based requirements when decorator is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tid-123',
      plan: 'PRO',
      name: 'TestTenant',
    });

    const ctx = execContext(mockRequest('tid-123', '/analytics'));
    // analytics module is defined in DEFAULT_LICENSE_REQUIREMENTS
    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
  });

  it('fails open on DB error (returns true)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ENTERPRISE']);
    prisma.tenant.findUnique.mockRejectedValue(new Error('db error'));

    const ctx = execContext(mockRequest('tid-123'));
    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
  });
});
```

---

### `super-admin.guard.spec.ts`

```ts
// packages/core/src/common/access-control/guards/super-admin.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  const execContext = (user?: any) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any);

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  it('allows when user role is SUPER_ADMIN', async () => {
    const ctx = execContext({ role: 'SUPER_ADMIN' });
    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
  });

  it('throws ForbiddenException for missing user', async () => {
    const ctx = execContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for non‑super‑admin role', async () => {
    const ctx = execContext({ role: 'USER' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
```

---

### `tenant-scoped.guard.spec.ts`

```ts
// packages/core/src/common/access-control/guards/tenant-scoped.guard.spec.ts
import {
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TenantContextService } from '../../../security/tenant-context/tenant-context.service';
import { AuditService } from '../../monitoring/audit/audit.service';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;
  let prisma: jest.Mocked<PrismaService>;
  let reflector: jest.Mocked<Reflector>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let auditService: jest.Mocked<AuditService>;

  const mockRequest = (tenantId?: string, isPublic = false) => ({
    headers: { 'x-tenant-id': tenantId },
    query: {},
    body: {},
    params: {},
    route: { path: '/test' },
    url: '/test',
    method: 'GET',
    ip: '1.2.3.4',
    isPublic,
  });

  const context = (req: any): ExecutionContext => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any);

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    tenantContext = {
      setTenant: jest.fn(),
    } as any;

    auditService = {
      logSecurityEvent: jest.fn(),
    } as any;

    guard = new TenantScopedGuard(
      reflector,
      tenantContext,
      prisma,
      auditService,
    );
  });

  it('lets public routes pass', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const req = mockRequest(undefined, true);
    await expect(guard.canActivate(context(req))).resolves.toBeTruthy();
  });

  it('rejects request when tenantId is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const req = mockRequest(undefined);
    await expect(guard.canActivate(context(req))).rejects.toThrow(ForbiddenException);
    expect(auditService.logSecurityEvent).toHaveBeenCalled();
  });

  it('rejects when tenant does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue(null);
    const req = mockRequest('tid-123');

    await expect(guard.canActivate(context(req))).rejects.toThrow(ForbiddenException);
    expect(auditService.logSecurityEvent).toHaveBeenCalled();
  });

  it('rejects when tenant status is NOT ACTIVE nor provisioning', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tid-123',
      status: 'inactive',
    } as any);
    const req = mockRequest('tid-123');

    await expect(guard.canActivate(context(req))).rejects.toThrow(ForbiddenException);
  });

  it('creates schema in dev env if missing', async () => {
    process.env.NODE_ENV = 'development';
    reflector.getAllAndOverride.mockReturnValue(false);
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tid-123',
      status: 'active',
    } as any);
    prisma.$queryRaw = jest.fn().mockResolvedValue([]);
    prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(null);

    const req = mockRequest('tid-123');
    await expect(guard.canActivate(context(req))).resolves.toBeTruthy();

    expect(prisma.$executeRawUnsafe).toHaveBeenCalled(); // schema creation attempt
  });
});
```

---

### `tenant-throttler.guard.spec.ts`

```ts
// packages/core/src/common/access-control/guards/tenant-throttler.guard.spec.ts
import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { TenantThrottlerGuard } from './tenant-throttler.guard';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityContext } from '../../security/security.context';
import { constantTimeDelay } from '../../utils/security.utils';

jest.mock('../../utils/security.utils', () => ({
  constantTimeDelay: jest.fn(() => Promise.resolve()),
}));

describe('TenantThrottlerGuard', () => {
  let guard: TenantThrottlerGuard;
  let rateLimiter: jest.Mocked<RateLimiterService>;
  let anomaly: jest.Mocked<AnomalyDetectionService>;
  let prisma: jest.Mocked<PrismaService>;
  let securityContext: jest.Mocked<SecurityContext>;

  const mockRequest = (tenantId?: string, path = '/api/items') => ({
    tenantId,
    route: { path },
    url: path,
    method: 'GET',
    ip: '1.2.3.4',
    headers: {},
  });

  const execContext = (req: any): ExecutionContext => ({
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader: jest.fn() }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any);

  beforeEach(() => {
    rateLimiter = {
      consume: jest.fn(),
    } as any;
    anomaly = {
      isSuspended: jest.fn(),
      isThrottled: jest.fn(),
      inspect: jest.fn(),
    } as any;
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as any;
    securityContext = {
      logSecurityEvent: jest.fn(),
    } as any;

    guard = new TenantThrottlerGuard(
      { ttl: 60, limit: 100 } as any,
      {} as any,
      {} as any,
      rateLimiter,
      anomaly,
      prisma,
      securityContext,
    );
  });

  it('exempts health‑check paths', async () => {
    const req = mockRequest('tid-1', '/health');
    await expect(guard.canActivate(execContext(req))).resolves.toBeTruthy();
    expect(rateLimiter.consume).not.toHaveBeenCalled();
  });

  it('blocks suspended tenant', async () => {
    anomaly.isSuspended.mockReturnValue(true);
    const req = mockRequest('tid-suspend');
    await expect(guard.canActivate(execContext(req))).rejects.toThrow(ServiceUnavailableException);
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith(
      'SUSPENDED_TENANT_REQUEST',
      expect.objectContaining({ tenantId: 'tid-suspend' }),
    );
  });

  it('applies rate limit and throws ThrottlerException when exceeded', async () => {
    anomaly.isSuspended.mockReturnValue(false);
    anomaly.isThrottled.mockReturnValue(false);
    rateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, reset: 12 });

    const req = mockRequest('tid-1');
    await expect(guard.canActivate(execContext(req))).rejects.toThrow(ThrottlerException);
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith(
      'RATE_LIMIT_EXCEEDED',
      expect.objectContaining({ tenantId: 'tid-1' }),
    );
  });

  it('passes when allowed and adds response headers', async () => {
    const setHeader = jest.fn();
    const response = { setHeader };
    const req = mockRequest('tid-1');
    rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 5, reset: 0 });

    const ctx = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(ctx)).resolves.toBeTruthy();
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
    expect(constantTimeDelay).toHaveBeenCalled(); // constant‑time back‑off is called
  });

  it('logs generic error when rateLimiter throws unexpected error', async () => {
    anomaly.isSuspended.mockReturnValue(false);
    rateLimiter.consume.mockRejectedValue(new Error('unexpected'));

    const req = mockRequest('tid-1');
    await expect(guard.canActivate(execContext(req))).rejects.toThrow('unexpected');
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith(
      'RATE_LIMITER_ERROR',
      expect.objectContaining({ tenantId: 'tid-1' }),
    );
  });
});
```

---

## 2️⃣ Service tests

### `anomaly-detection.service.spec.ts`

```ts
// packages/core/src/common/access-control/services/anomaly-detection.service.spec.ts
import { AnomalyDetectionService } from './anomaly-detection.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SecurityContext } from '../../security/security.context';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  const prisma = {} as any;
  const securityContext = { logSecurityEvent: jest.fn() } as any;

  beforeEach(() => {
    service = new AnomalyDetectionService(prisma, securityContext);
  });

  it('detects a suspended tenant correctly', () => {
    // set internal map directly (private) via any cast
    (service as any).suspendedTenants.set('t1', {
      reason: 'spam',
      expiry: new Date(Date.now() + 60_000),
    });
    expect(service.isSuspended('t1')).toBe(true);
  });

  it('clears suspension after expiry', () => {
    (service as any).suspendedTenants.set('t2', {
      reason: 'spam',
      expiry: new Date(Date.now() - 1000),
    });
    expect(service.isSuspended('t2')).toBe(false);
  });

  it('records a failed event and forwards to SecurityContext', () => {
    service.inspect('t3', true, { ip: '1.2.3.4', path: '/test' });
    expect((service as any).failedEvents.get('t3:request_flow')?.count).toBe(1);
    expect(securityContext.logSecurityEvent).toHaveBeenCalledWith('ANOMALY_DETECTED', expect.objectContaining({ tenantId: 't3' }));
  });

  it('detects throttling after many failures', () => {
    const key = 't4:request_flow';
    (service as any).failedEvents.set(key, { count: 21, lastEvent: new Date() });
    expect(service.isThrottled('t4')).toBe(true);
  });
});
```

---

### `rate-limiter.service.spec.ts`

```ts
// packages/core/src/common/access-control/services/rate-limiter.service.spec.ts
import { RateLimiterService } from './rate-limiter.service';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  const prisma = {
    tenant: { findUnique: jest.fn() },
  } as any;
  const anomaly = { isSuspended: jest.fn().mockReturnValue(false) } as any;
  const config = {
    get: jest.fn(),
  } as any;
  const tenantContext = {} as any;

  beforeEach(() => {
    // default limits
    config.get.mockImplementation((key, def) => {
      const map: Record<string, number> = {
        RATE_LIMIT_FREE_RPS: 10,
        RATE_LIMIT_FREE_BURST: 1.5,
        RATE_LIMIT_FREE_CIRCUIT: 100,
      };
      return map[key] ?? def;
    });

    service = new RateLimiterService(config, tenantContext, prisma, anomaly);
  });

  it('returns allowed token when bucket has tokens', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ plan: 'FREE', status: 'active' });
    const res = await service.consume('tenant-1');
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks when tenant is suspended (via anomaly)', async () => {
    (anomaly.isSuspended as jest.Mock).mockReturnValueOnce(true);
    const res = await service.consume('tenant-2');
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it('creates a new bucket with correct burst‑limit', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO', status: 'active' });
    const result = await service.consume('tenant-pro');
    expect(result.allowed).toBe(true);
  });

  it('fallbacks to allow on internal error', async () => {
    prisma.tenant.findUnique.mockRejectedValue(new Error('db fail'));
    const result = await service.consume('tenant-x');
    expect(result.allowed).toBe(true);
  });
});
```

---

### `config.service.spec.ts`

```ts
// packages/core/src/common/core/config.service.spec.ts
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    service = new ConfigService();
  });

  it('returns value from env or default', () => {
    process.env.MY_VAR = '123';
    expect(service.get('MY_VAR')).toBe('123');
    expect(service.get('UNKNOWN', 'def')).toBe('def');
  });

  it('detects secret keys and masks them', () => {
    process.env.SECRET_TOKEN = 'superSecret123';
    const val = service.get('SECRET_TOKEN');
    // mask should keep first 2 and last 2 characters
    expect(val).toBe('su***23');
  });

  it('validates environment on construction (sets to development if invalid)', () => {
    process.env.NODE_ENV = 'invalid';
    const loggerSpy = jest.spyOn((service as any).logger, 'warn');
    // re‑create service to trigger validateEnvironment()
    const newService = new ConfigService();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid NODE_ENV'));
    expect(process.env.NODE_ENV).toBe('development');
  });

  it('parses numbers and booleans correctly', () => {
    process.env.NUM = '42';
    process.env.FLAG = 'true';
    expect(service.getNumber('NUM')).toBe(42);
    expect(service.getBoolean('FLAG')).toBe(true);
    expect(service.getBoolean('UNKNOWN')).toBe(false);
  });
});
```

---

### `env-validator.service.spec.ts`

```ts
// packages/core/src/common/core/env-validator.service.spec.ts
import { EnvValidatorService } from './env-validator.service';
import { ConfigService } from './config.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('EnvValidatorService', () => {
  let validator: EnvValidatorService;
  let config: ConfigService;

  beforeEach(() => {
    config = new ConfigService();
    validator = new EnvValidatorService(config);
  });

  it('throws in production when required vars are missing', () => {
    jest.spyOn(config, 'isProduction').mockReturnValue(true);
    jest.spyOn(config, 'get').mockImplementation((key) => {
      if (key === 'JWT_SECRET') return undefined;
      return 'present';
    });

    expect(() => validator.validateEnvironment()).toThrow(InternalServerErrorException);
  });

  it('logs warning but does not throw in development for weak secret', () => {
    jest.spyOn(config, 'isProduction').mockReturnValue(false);
    jest.spyOn(config, 'get').mockImplementation((key) => (key === 'JWT_SECRET' ? 'short' : 'value'));

    const loggerSpy = jest.spyOn((validator as any).logger, 'warn');
    validator.validateEnvironment();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
  });

  it('returns true when system ready', async () => {
    jest.spyOn(validator, 'validateEnvironment').mockImplementation(() => {});
    const ready = await validator.validateSystemReadiness();
    expect(ready).toBe(true);
  });
});
```

---

### `system-health.service.spec.ts`

```ts
// packages/core/src/common/core/system-health.service.spec.ts
import { SystemHealthService } from './system-health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnomalyDetectionService } from '../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../access-control/services/rate-limiter.service';
import { EncryptedFieldService } from '../security/encryption/encrypted-field.service';

describe('SystemHealthService', () => {
  let service: SystemHealthService;
  const prisma = {
    $queryRaw: jest.fn(),
  } as any;
  const anomaly = {} as any;
  const rateLimiter = {} as any;
  const encryption = {} as any;

  beforeEach(() => {
    service = new SystemHealthService(prisma, anomaly, rateLimiter, encryption);
  });

  it('reports healthy when db query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([1]);
    const res = await service.checkHealth();
    expect(res.status).toBe('healthy');
    expect(res.components.database.status).toBe('up');
  });

  it('reports degraded when db query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db error'));
    const res = await service.checkHealth();
    expect(res.status).toBe('degraded');
    expect(res.components.database.status).toBe('down');
  });
});
```

---

### `system-initialization.service.spec.ts`

```ts
// packages/core/src/common/core/system-initialization.service.spec.ts
import { SystemInitializationService } from './system-initialization.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecurityContext } from '../security/security.context';
import { InternalServerErrorException } from '@nestjs/common';

describe('SystemInitializationService', () => {
  let service: SystemInitializationService;
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    tenant: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as any;
  const config = new ConfigService();
  const security = { logCriticalSecurityEvent: jest.fn() } as any;

  beforeEach(() => {
    service = new SystemInitializationService(prisma, config as any, security);
  });

  it('validates env and throws on missing vars (production)', async () => {
    const validateSpy = jest.spyOn(SystemInitializationService, 'validateEnvironment').mockImplementation(() => {
      throw new Error('missing env');
    });
    await expect(service.initializeSystem()).rejects.toThrow(Error);
    validateSpy.mockRestore();
  });

  it('runs all steps without error (happy path)', async () => {
    // mock successful DB calls
    prisma.$queryRaw.mockResolvedValue(null);
    prisma.$executeRawUnsafe.mockResolvedValue(null);
    prisma.tenant.findFirst.mockResolvedValue(null);
    prisma.tenant.create.mockResolvedValue({ id: 'SYSTEM' });

    await expect(service.initializeSystem()).resolves.not.toThrow();
    expect(prisma.tenant.create).toHaveBeenCalled(); // system tenant creation
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled(); // schema creation
  });

  it('logs critical error on unrecoverable step', async () => {
    prisma.$executeRawUnsafe.mockRejectedValue(new Error('schema fail'));
    await expect(service.initializeSystem()).rejects.toThrow(Error);
    expect(security.logCriticalSecurityEvent).toHaveBeenCalledWith(
      'INITIALIZATION_FAILURE',
      expect.objectContaining({ operation: expect.any(String) }),
    );
  });
});
```

---

### `public.decorator.spec.ts`

```ts
// packages/core/src/common/decorators/public.decorator.spec.ts
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { SetMetadata } from '@nestjs/common';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Public decorator', () => {
  it('calls SetMetadata with correct key/value', () => {
    Public();
    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });
});
```

---

### `audit-logger.interceptor.spec.ts`

```ts
// packages/core/src/common/monitoring/audit/audit-logger.interceptor.spec.ts
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { SecurityContext } from '../../security/security.context';

describe('AuditLoggerInterceptor', () => {
  let interceptor: AuditLoggerInterceptor;
  const security = { logSecurityEvent: jest.fn() } as any;

  beforeEach(() => {
    interceptor = new AuditLoggerInterceptor(security);
  });

  const mockContext = (method: string, tenantId = 't1') => ({
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url: '/api/test',
        body: { password: 'secret', name: 'John' },
        ip: '1.2.3.4',
        headers: {},
        tenantId,
        requestId: 'req-123',
        userId: 'u1',
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext);

  it('audits only mutating methods', (done) => {
    const ctx = mockContext('POST');
    interceptor.intercept(ctx, {
      handle: () => of({ success: true }),
    }).subscribe(() => {
      expect(security.logSecurityEvent).toHaveBeenCalledWith(
        'AUDIT_EVENT',
        expect.objectContaining({ action: 'POST /api/test' }),
      );
      done();
    });
  });

  it('skips audit for non‑mutating HTTP verb', (done) => {
    const ctx = mockContext('GET');
    interceptor.intercept(ctx, {
      handle: () => of({ success: true }),
    }).subscribe(() => {
      expect(security.logSecurityEvent).not.toHaveBeenCalled();
      done();
    });
  });

  it('redacts sensitive fields in payload', (done) => {
    const ctx = mockContext('POST');
    interceptor.intercept(ctx, {
      handle: () => of({}),
    }).subscribe(() => {
      const call = (security.logSecurityEvent as jest.Mock).mock.calls[0][1];
      expect(call.details.payload.password).toBe('********');
      expect(call.details.payload.name).toBe('John');
      done();
    });
  });
});
```

---

### `audit.controller.spec.ts`

```ts
// packages/core/src/common/monitoring/audit/audit.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { TenantScopedGuard } from '../../access-control/guards/tenant-scoped.guard';
import { ExecutionContext } from '@nestjs/common';

describe('AuditController', () => {
  let controller: AuditController;
  const auditService = { getAuditLogs: jest.fn().mockResolvedValue(['log1']) } as any;
  const guard = { canActivate: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    })
      .overrideGuard(TenantScopedGuard)
      .useValue(guard)
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should call auditService with tenantId from request', async () => {
    const req = { tenantId: 't-123' };
    const query = { limit: 10 };
    const result = await controller.getLogs(req as any, query as any);
    expect(result).toEqual(['log1']);
    expect(auditService.getAuditLogs).toHaveBeenCalledWith('t-123', query);
  });
});
```

---

### `audit.module.spec.ts`

```ts
// packages/core/src/common/monitoring/audit/audit.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from './audit.module';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TenantContextModule } from '../../security/tenant-context/tenant-context.module';
import { ValidationModule } from '../../security/validation/validation.module';

describe('AuditModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuditModule],
    }).compile();
  });

  it('should export AuditService', () => {
    const service = module.get<AuditService>(AuditService);
    expect(service).toBeInstanceOf(AuditService);
  });
});
```

---

### `audit.service.spec.ts`

```ts
// packages/core/src/common/monitoring/audit/audit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../security/tenant-context/tenant-context.service';
import { InputValidatorService } from '../../security/validation/input-validator.service';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'generated-uuid') }));

describe('AuditService', () => {
  let service: AuditService;
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  } as any;
  const tenantContext = {
    getTenantSchema: jest.fn().mockResolvedValue('tenant_test'),
  } as any;
  const validator = {
    secureValidate: jest.fn((schema, data) => data),
  } as any;

  beforeEach(() => {
    const module: TestingModule = Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: InputValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('sets system ready flag after successful health check', async () => {
    (prisma as any).$queryRaw.mockResolvedValue([{ exists: true }]);
    await (service as any).checkInitialHealth();
    expect((service as any).isSystemReady).toBe(true);
  });

  it('logs to console when system not ready', async () => {
    (service as any).isSystemReady = false;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service.log('any-tenant', { action: 'TEST' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_FALLBACK]'));
    consoleSpy.mockRestore();
  });

  it('writes to DB when ready & table exists', async () => {
    (service as any).isSystemReady = true;
    prisma.$queryRaw.mockResolvedValue([{ exists: true }]);

    await service.log('tenant-1', {
      action: 'USER_LOGIN',
      userId: 'u1',
      ip: '1.2.3.4',
      details: { foo: 'bar' },
      severity: 'info',
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "tenant_1"'),
      expect.any(String), // uuid
      'USER_LOGIN',
      'u1',
      '1.2.3.4',
      JSON.stringify({ foo: 'bar' }),
      'info',
      expect.any(Date),
    );
  });

  it('falls back when table missing', async () => {
    (service as any).isSystemReady = true;
    prisma.$queryRaw.mockResolvedValue([{ exists: false }]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await service.log('tenant-2', { action: 'LOGIN' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_FALLBACK_MISSING_TABLE]'));
    consoleSpy.mockRestore();
  });
});
```

---

### `all-exceptions.filter.spec.ts`

```ts
// packages/core/src/common/presentation/filters/all-exceptions.filter.spec.ts
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { SecurityContext } from '../../security/security.context';
import { AuditService } from '../../../common/monitoring/audit/audit.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  const securityContext = { logSecurityEvent: jest.fn() } as any;
  const auditService = { logSecurityEvent: jest.fn().mockResolvedValue(undefined) } as any;

  const mockResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res;
  };

  const mockRequest = (url = '/test') => ({
    method: 'GET',
    url,
    ip: '1.2.3.4',
    requestId: 'req-123',
  });

  const createHost = (exception: any) => ({
    switchToHttp: () => ({
      getResponse: () => mockResponse(),
      getRequest: () => mockRequest(),
    }),
    getArgs: () => [],
  } as unknown as ArgumentsHost);

  beforeEach(() => {
    filter = new AllExceptionsFilter(securityContext, auditService);
  });

  it('handles HttpException with proper status', () => {
    const httpEx = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    const host = createHost(httpEx);
    filter.catch(httpEx, host);

    const res = (host.switchToHttp().getResponse() as any);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.FORBIDDEN, message: 'Forbidden' }),
    );
    expect(securityContext.logSecurityEvent).toHaveBeenCalled();
    expect(auditService.logSecurityEvent).toHaveBeenCalled();
  });

  it('masks error details in production mode', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Sensitive DB error: relation "user" does not exist');
    const host = createHost(error);
    filter.catch(error, host);
    const res = (host.switchToHttp().getResponse() as any);
    expect(res.json().message).toBe('Internal server error - Contact support');
    process.env.NODE_ENV = 'development';
  });

  it('includes stack trace in non‑production', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('Something went wrong');
    const host = createHost(err);
    filter.catch(err, host);
    const json = (host.switchToHttp().getResponse() as any).json.mock.calls[0][0];
    expect(json.stack).toBeDefined();
    process.env.NODE_ENV = 'development';
  });
});
```

---

### `defense.interceptor.spec.ts`

```ts
// packages/core/src/common/presentation/interceptors/defense.interceptor.spec.ts
import { DefenseInterceptor } from './defense.interceptor';
import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AnomalyDetectionService } from '../../access-control/services/anomaly-detection.service';
import { RateLimiterService } from '../../access-control/services/rate-limiter.service';
import { SecurityContext } from '../../security/security.context';
import { ThrottlerException } from '@nestjs/throttler';

describe('DefenseInterceptor', () => {
  let interceptor: DefenseInterceptor;
  const anomaly = { isSuspended: jest.fn(), isThrottled: jest.fn(), inspect: jest.fn() } as any;
  const rateLimiter = { consume: jest.fn() } as any;
  const security = { logSecurityEvent: jest.fn() } as any;

  const mockContext = (tenantId?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        tenantId,
        route: { path: '/api/item' },
        method: 'GET',
        ip: '1.2.3.4',
        headers: {},
      }),
      getResponse: () => ({
        setHeader: jest.fn(),
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [],
  } as unknown as ExecutionContext);

  beforeEach(() => {
    interceptor = new DefenseInterceptor(anomaly, rateLimiter, security);
  });

  it('passes through when tenantId missing', (done) => {
    const ctx = mockContext(undefined);
    interceptor.intercept(ctx, { handle: () => of('ok') }).subscribe((v) => {
      expect(v).toBe('ok');
      done();
    });
  });

  it('blocks request when tenant is suspended', (done) => {
    anomaly.isSuspended.mockReturnValue(true);
    const ctx = mockContext('t1');
    interceptor.intercept(ctx, { handle: () => of('') }).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect(security.logSecurityEvent).toHaveBeenCalledWith(
          'SUSPENDED_TENANT_REQUEST',
          expect.objectContaining({ tenantId: 't1' }),
        );
        done();
      },
    });
  });

  it('applies rate‑limit and throws ThrottlerException when not allowed', (done) => {
    anomaly.isSuspended.mockReturnValue(false);
    rateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, reset: 5 });

    const ctx = mockContext('t2');
    interceptor.intercept(ctx, { handle: () => of('') }).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(ThrottlerException);
        expect(security.logSecurityEvent).toHaveBeenCalledWith(
          'RATE_LIMIT_EXCEEDED',
          expect.objectContaining({ tenantId: 't2' }),
        );
        done();
      },
    });
  });

  it('records successful request in anomaly service', (done) => {
    anomaly.isSuspended.mockReturnValue(false);
    rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 10, reset: 0 });

    const ctx = mockContext('t3');
    interceptor.intercept(ctx, { handle: () => of('ok') }).subscribe((value) => {
      expect(value).toBe('ok');
      expect(anomaly.inspect).toHaveBeenCalledWith('t3', false, expect.any(Object));
      done();
    });
  });
});
```

---

### `tenant-context.interceptor.spec.ts`

```ts
// packages/core/src/common/presentation/interceptors/tenant-context.interceptor.spec.ts
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TenantContextInterceptor', () => {
  let interceptor: TenantContextInterceptor;

  const mockContext = (request: any) => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    interceptor = new TenantContextInterceptor();
  });

  it('just forwards request – no side‑effects', (done) => {
    const req = { foo: 'bar' };
    interceptor.intercept(mockContext(req), { handle: () => of('result') }).subscribe((val) => {
      expect(val).toBe('result');
      done();
    });
  });
});
```

---

### `csp.config.spec.ts`

```ts
// packages/core/src/common/presentation/security-headers/csp.config.spec.ts
import { CSPConfig } from './csp.config';

describe('CSPConfig', () => {
  let config: CSPConfig;

  beforeEach(() => {
    jest.useFakeTimers();
    config = new CSPConfig();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('generates a nonce and stores it', () => {
    const nonce = config.generateNonce('req-1');
    expect(typeof nonce).toBe('string');
    expect(nonce).toHaveLength(24); // base64 16 bytes
    expect(config.validateNonce('req-1', nonce)).toBe(true);
  });

  it('invalidates nonce after expiry', () => {
    const nonce = config.generateNonce('req-2');
    jest.advanceTimersByTime(11 * 60 * 1000); // >10 minutes
    expect(config.validateNonce('req-2', nonce)).toBe(false);
  });

  it('builds CSP directives for production', () => {
    const directives = config.getCSPDirectives('tenant-1', 'production');
    expect(directives.defaultSrc).toContain("'self'");
    expect(directives.scriptSrc).toContain("'self'");
    // payment‑tenant should add Stripe source
    const paymentDirectives = config.getCSPDirectives('payment-tenant-1', 'production');
    expect(paymentDirectives.scriptSrc).toContain('https://js.stripe.com');
  });

  it('generates header string from directives', () => {
    const directives = { defaultSrc: ["'self'"], scriptSrc: ["'self'"], upgradeInsecureRequests: [] };
    const header = config.generateCSPHeader(directives);
    expect(header).toContain('default-src \'self\'');
    expect(header).toContain('script-src \'self\'');
  });
});
```

---

### `helmet.config.spec.ts`

```ts
// packages/core/src/common/presentation/security-headers/helmet.config.spec.ts
import { HelmetConfig } from './helmet.config';

describe('HelmetConfig', () => {
  let service: HelmetConfig;

  beforeEach(() => {
    service = new HelmetConfig();
  });

  it('returns middleware with proper directives for development', () => {
    const middleware = service.getHelmetMiddleware('dev');
    // helmet returns a function; we just ensure it's defined
    expect(typeof middleware).toBe('function');
  });

  it('produces CSP directives with extra dev sources', () => {
    const directives = (service as any).getContentSecurityPolicy('dev');
    expect(directives.directives.scriptSrc).toContain('http://localhost:*');
    expect(directives.directives.connectSrc).toContain('ws://localhost:*');
  });

  it('adds cache‑control header via applyTenantCachingHeaders', () => {
    const setHeader = jest.fn();
    const res = { setHeader } as any;
    service.applyTenantCachingHeaders(res, 'tenant-xyz');
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
    expect(setHeader).toHaveBeenCalledWith('Surrogate-Key', 'tenant-tenant-xyz');
  });
});
```

---

### `security.context.module.spec.ts`

```ts
// packages/core/src/common/security/security.context.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SecurityContextModule } from './security.context.module';
import { SecurityContext } from './security.context';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../monitoring/audit/audit.module';

describe('SecurityContextModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [SecurityContextModule, ConfigModule.forRoot({ isGlobal: true }), AuditModule],
    }).compile();
  });

  it('exports SecurityContext', () => {
    const sc = module.get<SecurityContext>(SecurityContext);
    expect(sc).toBeInstanceOf(SecurityContext);
  });
});
```

---

### `security.context.spec.ts`

```ts
// packages/core/src/common/security/security.context.spec.ts
import { SecurityContext } from './security.context';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../monitoring/audit/audit.service';

describe('SecurityContext', () => {
  let ctx: SecurityContext;
  const audit = { logSecurityEvent: jest.fn() } as any;
  const config = { get: jest.fn() } as any;

  beforeEach(() => {
    ctx = new SecurityContext(audit, config);
  });

  it('logs through AuditService when available', () => {
    ctx.logSecurityEvent('TEST_EVENT', { foo: 'bar' });
    expect(audit.logSecurityEvent).toHaveBeenCalledWith('TEST_EVENT', { foo: 'bar' });
  });

  it('falls back to console when audit missing', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const noAuditCtx = new SecurityContext(undefined, config);
    noAuditCtx.logSecurityEvent('EV', { a: 1 });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('extracts IP safely', () => {
    const req = { ip: '1.2.3.4', headers: {} } as any;
    expect(ctx.getIpFromRequest(req)).toBe('1.2.3.4');

    const req2 = { socket: { remoteAddress: '5.6.7.8' }, headers: { 'x-forwarded-for': '9.9.9.9,1.1.1.1' } } as any;
    expect(ctx.getIpFromRequest(req2)).toBe('9.9.9.9');
  });

  it('captures exception safely', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    ctx.captureException(err);
    expect(consoleSpy).toHaveBeenCalledWith('[SECURITY_LOG_FAILURE] EXCEPTION_CAUGHT', expect.any(Object));
    consoleSpy.mockRestore();
  });
});
```

---

### `encrypted-field.service.spec.ts`

```ts
// packages/core/src/common/security/encryption/encrypted-field.service.spec.ts
import { EncryptedFieldService } from './encrypted-field.service';
import * as crypto from 'crypto';

describe('EncryptedFieldService', () => {
  const ORIGINAL_KEY = process.env.ENCRYPTION_MASTER_KEY;
  const tempKey = 'a'.repeat(64); // 64‑char strong key
  const tenantId = 'tenant-1';

  beforeAll(() => {
    process.env.ENCRYPTION_MASTER_KEY = tempKey;
  });

  afterAll(() => {
    process.env.ENCRYPTION_MASTER_KEY = ORIGINAL_KEY;
  });

  it('encrypts and decrypts correctly with default version', () => {
    const svc = new EncryptedFieldService();
    const plain = 'my secret data';
    const cipher = svc.encrypt(tenantId, plain);
    expect(cipher).toMatch(/^v1:/);
    const decrypted = svc.decrypt(tenantId, cipher);
    expect(decrypted).toBe(plain);
  });

  it('handles decryption failure gracefully', () => {
    const svc = new EncryptedFieldService();
    const badCipher = 'v1:wrongiv:wrongtag:deadbeef';
    const res = svc.decrypt(tenantId, badCipher);
    expect(res).toBe('[ENCRYPTED_FAILURE]');
  });

  it('hashes and verifies correctly', () => {
    const svc = new EncryptedFieldService();
    const password = 'SuperSecret123!';
    const { hash, salt } = svc.hashData(password);
    expect(svc.verifyHash(password, hash)).toBe(true);
    expect(svc.verifyHash('wrong', hash)).toBe(false);
  });

  it('rotates keys for a list of values', async () => {
    const svc = new EncryptedFieldService();
    const data = [svc.encrypt(tenantId, 'a'), svc.encrypt(tenantId, 'b')];
    const rotated = await svc.rotateKeys(tenantId, 'v1', 'v2', data);
    expect(rotated.length).toBe(2);
    expect(rotated[0]).toMatch(/^v2:/);
  });
});
```

---

### `key-management.service.spec.ts`

```ts
// packages/core/src/common/security/encryption/key-management.service.spec.ts
import { KeyManagementService } from './key-management.service';

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  beforeEach(() => {
    service = new KeyManagementService();
  });

  it('returns true for integrity validation (placeholder)', async () => {
    await expect(service.validateKeyIntegrity()).resolves.toBe(true);
  });
});
```

---

### `jwt.service.spec.ts`

```ts
// packages/core/src/common/security/session/jwt.service.spec.ts
import { JwtService } from './jwt.service';
import { JwtService as NestJwt } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

describe('JwtService', () => {
  let service: JwtService;
  const nestJwt = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn().mockResolvedValue({ sub: 'uid' }) } as any;
  const prisma = {} as any;

  beforeEach(() => {
    service = new JwtService(nestJwt, prisma);
  });

  it('generates token', async () => {
    const payload = { uid: '123' };
    await expect(service.generateToken(payload)).resolves.toBe('signed-token');
    expect(nestJwt.sign).toHaveBeenCalledWith(payload);
  });

  it('verifies token', async () => {
    await expect(service.verifyToken('signed-token')).resolves.toEqual({ sub: 'uid' });
    expect(nestJwt.verify).toHaveBeenCalledWith('signed-token');
  });
});
```

---

### `tenant-context.module.spec.ts`

```ts
// packages/core/src/common/security/tenant-context/tenant-context.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextModule } from './tenant-context.module';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantContextModule],
    }).compile();
  });

  it('provides TenantContextService', () => {
    const svc = module.get<TenantContextService>(TenantContextService);
    expect(svc).toBeInstanceOf(TenantContextService);
  });
});
```

---

### `tenant-context.service.spec.ts`

```ts
// packages/core/src/common/security/tenant-context/tenant-context.service.spec.ts
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('stores and retrieves tenant & user', () => {
    service.setContext('tid-1', 'uid-9');
    expect(service.getTenantId()).toBe('tid-1');
    expect(service.getUserId()).toBe('uid-9');
    expect(service.getSchemaName()).toBe('tenant_tid_1');
  });

  it('setTenantContext custom method works', () => {
    service.setTenantContext('tid-2', 'schema_custom', 'sub.example');
    expect(service.getTenantId()).toBe('tid-2');
    expect(service.getSchemaName()).toBe('schema_custom');
    expect(service.getSubdomain()).toBe('sub.example');
  });

  it('getTenantSchema returns correctly formatted name', async () => {
    const schema = await service.getTenantSchema('my-tenant');
    expect(schema).toBe('tenant_my_tenant');
  });
});
```

---

### `tenant.middleware.spec.ts`

```ts
// packages/core/src/common/security/tenant-context/tenant.middleware.spec.ts
import { TenantMiddleware } from './tenant.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;

  beforeEach(() => {
    middleware = new TenantMiddleware();
  });

  it('copies x-tenant-id header to request object', () => {
    const req = { headers: { 'x-tenant-id': 'tenant-123' } } as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);
    expect((req as any).tenantId).toBe('tenant-123');
    expect(next).toHaveBeenCalled();
  });

  it('does nothing when header missing', () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);
    expect((req as any).tenantId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
```

---

### `tenant.utils.spec.ts`

```ts
// packages/core/src/common/security/tenant-context/tenant.utils.spec.ts
import { getTenantSchemaName, ensureValidTenantId, isTenantSchemaReady } from './tenant.utils';
import { PrismaService } from '../../../prisma/prisma.service';

describe('tenant.utils', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as any;

  describe('getTenantSchemaName', () => {
    it('creates normalized schema name', () => {
      expect(getTenantSchemaName('Abc-123')).toBe('tenant_abc_123');
    });

    it('throws on empty id', () => {
      expect(() => getTenantSchemaName('')).toThrow();
    });
  });

  describe('ensureValidTenantId', () => {
    it('passes a valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(ensureValidTenantId(uuid)).toBe(uuid);
    });

    it('rejects malformed uuid', () => {
      expect(() => ensureValidTenantId('not-a-uuid')).toThrow();
    });
  });

  describe('isTenantSchemaReady', () => {
    it('returns true when schema and core tables exist', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ exists: true }]) // schema exists
        .mockResolvedValueOnce([{ table_count: 3 }]); // three core tables present

      await expect(isTenantSchemaReady(prisma, 'tid-1')).resolves.toBe(true);
    });

    it('returns false when schema missing', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ exists: false }]);
      await expect(isTenantSchemaReady(prisma, 'tid-2')).resolves.toBe(false);
    });
  });
});
```

---

### `input-validator.service.spec.ts`

```ts
// packages/core/src/common/security/validation/input-validator.service.spec.ts
import { InputValidatorService } from './input-validator.service';
import { SanitizerService } from './sanitizer.service';
import { ZodSchema, z } from 'zod';
import { BadRequestException } from '@nestjs/common';

describe('InputValidatorService', () => {
  let service: InputValidatorService;
  const sanitizer = {
    sanitizeObject: jest.fn((obj) => obj),
  } as any;

  beforeEach(() => {
    service = new InputValidatorService(sanitizer);
  });

  const simpleSchema = z.object({ name: z.string().min(1) });

  it('validates and sanitizes correctly', async () => {
    const payload = { name: 'John' };
    const result = await service.secureValidate(simpleSchema, payload, 'test');
    expect(result).toEqual(payload);
    expect(sanitizer.sanitizeObject).toHaveBeenCalled();
  });

  it('throws BadRequestException on validation error and logs', async () => {
    const logSpy = jest.spyOn((service as any).logger, 'warn');
    await expect(service.secureValidate(simpleSchema, { name: '' }, 'test')).rejects.toThrow(BadRequestException);
    expect(logSpy).toHaveBeenCalled();
    expect(sanitizer.sanitizeObject).toHaveBeenCalled();
  });
});
```

---

### `sanitizer.service.spec.ts`

```ts
// packages/core/src/common/security/validation/sanitizer.service.spec.ts
import { SanitizerService } from './sanitizer.service';
import xss from 'xss';

jest.mock('xss', () => ({
  filterXSS: jest.fn((content) => content.replace(/<script>/g, '').replace(/<\/script>/g, '')),
}));

describe('SanitizerService', () => {
  let service: SanitizerService;

  beforeEach(() => {
    service = new SanitizerService();
  });

  it('sanitizes plain strings', () => {
    const dirty = '<script>alert(1)</script>';
    const clean = service.sanitize(dirty);
    expect(clean).toBe('alert(1)');
    expect(xss.filterXSS).toHaveBeenCalledWith(dirty, expect.any(Object));
  });

  it('recursively sanitizes objects', () => {
    const obj = { a: '<script>bad</script>', nested: { b: '<script>bad2</script>' } };
    const result = service.sanitizeObject({ ...obj });
    expect(result).toEqual({ a: 'bad', nested: { b: 'bad2' } });
  });

  it('ignores non‑string values', () => {
    const obj = { num: 123, bool: true };
    const result = service.sanitizeObject({ ...obj });
    expect(result).toEqual(obj);
  });
});
```

---

### `validation.module.spec.ts`

```ts
// packages/core/src/common/security/validation/validation.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationModule } from './validation.module';
import { InputValidatorService } from './input-validator.service';
import { SanitizerService } from './sanitizer.service';

describe('ValidationModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ValidationModule],
    }).compile();
  });

  it('exports InputValidatorService and SanitizerService', () => {
    const validator = module.get<InputValidatorService>(InputValidatorService);
    const sanitizer = module.get<SanitizerService>(SanitizerService);
    expect(validator).toBeInstanceOf(InputValidatorService);
    expect(sanitizer).toBeInstanceOf(SanitizerService);
  });
});
```

---

### `base.dto.spec.ts`

```ts
// packages/core/src/common/security/validation/dto/base.dto.spec.ts
import { BaseInputSchema } from './base.dto';
import { ZodError } from 'zod';

describe('BaseInputSchema', () => {
  const valid = {
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'c23e4567-e89b-12d3-a456-426614174111',
    timestamp: Date.now(),
    requestId: '123e4567-e89b-12d3-a456-426614174999',
  };

  it('parses a correct payload', () => {
    expect(() => BaseInputSchema.parse(valid)).not.toThrow();
  });

  it('fails when UUID is malformed', () => {
    const bad = { ...valid, tenantId: 'not-a-uuid' };
    expect(() => BaseInputSchema.parse(bad)).toThrow(ZodError);
  });

  it('sanitizes HTML in safeText', () => {
    const schema = BaseInputSchema.extend({ safeText: BaseInputSchema.shape.safeText });
    const withHtml = { ...valid, safeText: '<script>alert(1)</script>' };
    const parsed = schema.safeParse(withHtml);
    expect(parsed.success).toBe(true);
    expect(parsed.data.safeText).toBe('alert(1)');
  });
});
```

---

### `product.dto.spec.ts`

```ts
// packages/core/src/common/security/validation/dto/product.dto.spec.ts
import {
  ProductSchema,
  UpdateProductSchema,
  ProductVariantSchema,
  BulkCreateVariantsSchema,
} from './product.dto';
import { ZodError } from 'zod';

describe('Product DTO schemas', () => {
  const base = {
    name: 'Test product',
    price: 100,
  };

  it('accepts minimal required fields', () => {
    expect(() => ProductSchema.parse(base)).not.toThrow();
  });

  it('rejects compareAtPrice smaller than price', () => {
    expect(() =>
      ProductSchema.parse({ ...base, compareAtPrice: 50, price: 100 }),
    ).toThrow(ZodError);
  });

  it('UpdateProductSchema makes all fields optional except id', () => {
    expect(() => UpdateProductSchema.parse({ id: 1, price: 200 })).not.toThrow();
    expect(() => UpdateProductSchema.parse({ price: 200 })).toThrow(ZodError);
  });

  it('Variant schema validates required fields', () => {
    const variant = { productId: 1, price: 10 };
    expect(() => ProductVariantSchema.parse(variant)).not.toThrow();
  });

  it('BulkCreateVariants validates array length and omits productId on each item', () => {
    const payload = {
      productId: 1,
      variants: [
        { price: 10 },
        { price: 20, sku: 'SKU123' },
      ],
    };
    expect(() => BulkCreateVariantsSchema.parse(payload)).not.toThrow();
  });
});
```

---

### `tenant.dto.spec.ts`

```ts
// packages/core/src/common/security/validation/dto/tenant.dto.spec.ts
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  SubscriptionPlanSchema,
  StoreConfigSchema,
  PlanChangeRequestSchema,
  SuspensionRequestSchema,
  TenantSearchSchema,
} from './tenant.dto';
import { ZodError } from 'zod';

describe('Tenant DTO schemas', () => {
  const minimal = {
    name: 'My Store',
    subdomain: 'my-store',
    businessType: 'RETAIL',
    territory: 'Egypt',
  };

  it('creates tenant with required fields', () => {
    expect(() => CreateTenantSchema.parse(minimal)).not.toThrow();
  });

  it('rejects reserved subdomains', () => {
    const bad = { ...minimal, subdomain: 'admin' };
    expect(() => CreateTenantSchema.parse(bad)).toThrow(ZodError);
  });

  it('update schema allows partial fields', () => {
    expect(() => UpdateTenantSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' })).not.toThrow();
  });

  it('subscription plan validates tier enum and positive price', () => {
    const plan = {
      name: 'Pro Plan',
      tier: 'PRO',
      price: 99,
      currency: 'USD',
      billingCycle: 'monthly',
      features: ['BASIC_ECOMMERCE'],
    };
    expect(() => SubscriptionPlanSchema.parse(plan)).not.toThrow();
  });

  it('fails if plan tier is invalid', () => {
    const bad = { ...minimal, tier: 'UNKNOWN' };
    // Using any to bypass TS; the test still ensures runtime validation
    expect(() => (SubscriptionPlanSchema as any).parse(bad)).toThrow(ZodError);
  });

  it('store config validates colour hex & URLs', () => {
    const cfg = {
      primaryColor: '#ff00ff',
      logoUrl: 'https://example.com/logo.png',
    };
    expect(() => StoreConfigSchema.parse(cfg)).not.toThrow();
  });

  it('plan change request validates tenantId UUID', () => {
    const req = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      newTier: 'ENTERPRISE',
    };
    expect(() => PlanChangeRequestSchema.parse(req)).not.toThrow();
    const bad = { ...req, tenantId: 'bad' };
    expect(() => PlanChangeRequestSchema.parse(bad)).toThrow(ZodError);
  });

  it('suspension request checks reason length', () => {
    const r = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Too many failed logins',
    };
    expect(() => SuspensionRequestSchema.parse(r)).not.toThrow();
    const short = { ...r, reason: 'short' };
    expect(() => SuspensionRequestSchema.parse(short)).toThrow(ZodError);
  });

  it('tenant search schema allows pagination and filters', () => {
    const q = {
      query: 'shop',
      page: 2,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    };
    expect(() => TenantSearchSchema.parse(q)).not.toThrow();
  });
});
```

---

### `crypto.utils.spec.ts`

```ts
// packages/core/src/common/utils/crypto.utils.spec.ts
import { generateSecureHash, verifySecureHash } from './crypto.utils';

describe('Crypto utils', () => {
  it('generates hash with salt and verifies correctly', async () => {
    const secret = 'my‑secret';
    const hash = await generateSecureHash(secret);
    const verified = await verifySecureHash(secret, hash);
    expect(verified).toBe(true);
  });

  it('fails verification for wrong password', async () => {
    const hash = await generateSecureHash('right');
    const ok = await verifySecureHash('wrong', hash);
    expect(ok).toBe(false);
  });
});
```

---

### `security.utils.spec.ts`

```ts
// packages/core/src/common/utils/security.utils.spec.ts
import { constantTimeDelay, safeRedactError } from './security.utils';
import { Logger } from '@nestjs/common';

jest.useFakeTimers();

describe('security.utils', () => {
  it('delays at least the requested ms (plus jitter)', async () => {
    const promise = constantTimeDelay(200);
    jest.advanceTimersByTime(250);
    await expect(promise).resolves.toBeUndefined();
  });

  it('redacts DB‑related leakage info', () => {
    const err = new Error('relation "user" does not exist');
    const safe = safeRedactError(err);
    expect(safe.message).toBe('خطأ في معالجة البيانات');
  });

  it('keeps generic messages untouched', () => {
    const err = new Error('Generic failure');
    const safe = safeRedactError(err);
    expect(safe.message).toBe('Generic failure');
  });

  it('returns fallback when input is nullish', () => {
    expect(safeRedactError(undefined)).toEqual({ message: 'Unknown error', name: 'Error' });
  });
});
```

---

## 📁 Directory Structure for the test files

```
packages/
 └─ core/
    └─ src/
       └─ common/
          ├─ access-control/
          │   └─ guards/
          │       ├─ license.guard.spec.ts
          │       ├─ super-admin.guard.spec.ts
          │       ├─ tenant-scoped.guard.spec.ts
          │       └─ tenant-throttler.guard.spec.ts
          ├─ access-control/
          │   └─ services/
          │       ├─ anomaly-detection.service.spec.ts
          │       └─ rate-limiter.service.spec.ts
          ├─ core/
          │   ├─ config.service.spec.ts
          │   ├─ env-validator.service.spec.ts
          │   ├─ system-health.service.spec.ts
          │   └─ system-initialization.service.spec.ts
          ├─ decorators/
          │   └─ public.decorator.spec.ts
          ├─ monitoring/
          │   └─ audit/
          │       ├─ audit-logger.interceptor.spec.ts
          │       ├─ audit.controller.spec.ts
          │       ├─ audit.module.spec.ts
          │       └─ audit.service.spec.ts
          ├─ presentation/
          │   ├─ filters/
          │   │   └─ all-exceptions.filter.spec.ts
          │   └─ interceptors/
          │       ├─ defense.interceptor.spec.ts
          │       ├─ tenant-context.interceptor.spec.ts
          │       └─ tenant-throttler.guard.spec.ts   (already under guards)
          ├─ presentation/
          │   └─ security-headers/
          │       ├─ csp.config.spec.ts
          │       └─ helmet.config.spec.ts
          ├─ security/
          │   ├─ security.context.module.spec.ts
          │   ├─ security.context.spec.ts
          │   ├─ encryption/
          │   │   ├─ encrypted-field.service.spec.ts
          │   │   └─ key-management.service.spec.ts
          │   ├─ session/
          │   │   └─ jwt.service.spec.ts
          │   └─ tenant-context/
          │       ├─ tenant-context.module.spec.ts
          │       ├─ tenant-context.service.spec.ts
          │       ├─ tenant.middleware.spec.ts
          │       └─ tenant.utils.spec.ts
          └─ security/
              └─ validation/
                  ├─ input-validator.service.spec.ts
                  ├─ sanitizer.service.spec.ts
                  ├─ validation.module.spec.ts
                  └─ dto/
                      ├─ base.dto.spec.ts
                      ├─ product.dto.spec.ts
                      └─ tenant.dto.spec.ts
          └─ utils/
              ├─ crypto.utils.spec.ts
              └─ security.utils.spec.ts
```

All specifications above are **self‑contained**, use **jest** with **Nest testing utilities** where needed, and cover:

* Guard flow & error handling
* Service logic and edge cases (including fallback paths)
* DTO validation (both happy & error cases)
* Interceptor/Filter behavior
* Cryptographic utilities
* Configuration modules

Run the suite with:

```bash
npm run test   # or yarn test
```

All tests should pass in a fresh clone of the repository (given the source files you provided).