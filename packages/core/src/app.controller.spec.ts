import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { SecurityContext } from './common/security/security.context';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

import { commonProviders } from '../test/test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mockAppService: any;
  let mockSecurity: any;
  let mockAudit: any;

  beforeAll(async () => {
    const { mockPrisma, mockAudit: ma } = require('../test/test-utils');
    mockAudit = ma;
    mockAppService = {
      getHealth: jest.fn().mockResolvedValue({ status: 'ok', service: 'apex-core' }),
      verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
    };
    mockSecurity = {
      logSecurityEvent: jest.fn(),
    };

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE',
      name: 'Test Tenant',
      plan: 'FREE',
      subdomain: 'test'
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ schema_name: 'tenant_00000000_0000_0000_0000_000000000001' }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: SecurityContext, useValue: mockSecurity },
        { provide: AuditService, useValue: mockAudit },
        ...commonProviders.filter(p => {
          if (typeof p === 'object' && p !== null && 'provide' in p) {
            return (p as any).provide !== SecurityContext;
          }
          return p !== SecurityContext;
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status (default)', async () => {
      const resp = await request(app.getHttpServer())
        .get('/health')
        .set('X-Request-ID', 'test')
        .expect(HttpStatus.OK);

      expect(resp.body).toMatchObject({ status: 'ok', service: 'apex-core' });
    });

    it('should handle includeDetails=true', async () => {
      await request(app.getHttpServer())
        .get('/health?includeDetails=true')
        .set('X-Request-ID', 'test')
        .expect(HttpStatus.OK);

      expect(mockAppService.getHealth).toHaveBeenCalledWith(true);
    });

    it('should throw BadRequestException for invalid uuid', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .set('x-tenant-id', 'invalid-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  it('/GET api/app/health returns static payload', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/app/health')
      .expect(HttpStatus.OK);

    expect(resp.body).toMatchObject({ status: 'ok', module: 'app-root' });
  });

  describe('GET api/infra/prisma/health', () => {
    it('healthy DB', async () => {
      mockAppService.verifyDatabaseConnection.mockResolvedValueOnce(true);
      const resp = await request(app.getHttpServer())
        .get('/api/infra/prisma/health')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'ok', module: 'prisma-layer' });
    });

    it('unhealthy DB', async () => {
      mockAppService.verifyDatabaseConnection.mockResolvedValueOnce(false);
      const resp = await request(app.getHttpServer())
        .get('/api/infra/prisma/health')
        .set('x-tenant-id', '00000000-0000-0000-0000-000000000001')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'degraded', module: 'prisma-layer' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('DATABASE_HEALTH_FAILURE', expect.anything());
    });
  });

  describe('GET api/modules/:moduleName/health', () => {
    it('valid module', async () => {
      const resp = await request(app.getHttpServer())
        .get('/api/modules/auth-system/health')
        .set('x-tenant-id', '00000000-0000-0000-0000-000000000001')
        .expect(HttpStatus.OK);

      expect(resp.body).toMatchObject({ status: 'ok', module: 'auth-system' });
    });

    it('invalid module name', async () => {
      await request(app.getHttpServer())
        .get('/api/modules/invalid_name/health')
        .set('x-tenant-id', '00000000-0000-0000-0000-000000000001')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('handle audit failure', async () => {
      mockAudit.logOperation.mockRejectedValueOnce(new Error('Audit Fail'));

      const resp = await request(app.getHttpServer())
        .get('/api/modules/shop/health')
        .set('x-tenant-id', '00000000-0000-0000-0000-000000000001')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'error', module: 'shop' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('MODULE_HEALTH_FAILURE', expect.anything());
    });
  });
});
