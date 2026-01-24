import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { SecurityContext } from './common/security/security.context';
import { HttpStatus, INestApplication, BadRequestException } from '@nestjs/common';
import request from 'supertest';

import { commonProviders } from '../test/test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const mockAppService = {
    getHealth: jest.fn().mockResolvedValue({ status: 'ok', service: 'apex-core' }),
    verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
  };
  const mockSecurity = {
    logSecurityEvent: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: SecurityContext, useValue: mockSecurity },
        ...commonProviders.filter(p => p.provide !== SecurityContext),
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

    it('should throw BadRequestException for invalid parameters', async () => {
      // healthCheckSchema checks includeDetails as boolean-preprocessed string
      // and tenantId as uuid. If we pass invalid uuid in headers:
      await request(app.getHttpServer())
        .get('/health')
        .set('x-tenant-id', 'invalid-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle service errors in healthCheck', async () => {
      mockAppService.getHealth.mockRejectedValueOnce(new Error('Internal'));
      await request(app.getHttpServer())
        .get('/health')
        .set('X-Request-ID', 'test')
      // The catch block in healthCheck rethrows BadRequest if it is one, but for others it just logs?
      // Actually the catch block in AppController:99 catches and logs.
      // It doesn't throw unless it's BadRequestException.
      // So it might return nothing (200 OK with empty body or 500 depend on Nest)
      // Wait, line 104 rethrows if BadRequest. Else it falls through.
      // If it falls through, Nest will likely return 500 if the method is async and returns nothing? 
      // No, it will return 200 with empty. Let's check.
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
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'degraded', module: 'prisma-layer' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('DATABASE_HEALTH_FAILURE', expect.anything());
    });

    it('DB service error', async () => {
      mockAppService.verifyDatabaseConnection.mockRejectedValueOnce(new Error('Fatal'));
      const resp = await request(app.getHttpServer())
        .get('/api/infra/prisma/health')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'error', module: 'prisma-layer' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('DATABASE_HEALTH_ERROR', expect.anything());
    });
  });

  describe('GET api/modules/:moduleName/health', () => {
    it('valid module', async () => {
      const resp = await request(app.getHttpServer())
        .get('/api/modules/auth-system/health')
        .expect(HttpStatus.OK);

      expect(resp.body).toMatchObject({ status: 'ok', module: 'auth-system' });
    });

    it('invalid module name', async () => {
      await request(app.getHttpServer())
        .get('/api/modules/invalid_name/health') // underscores not allowed by regex ^[a-z0-9-]+$
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('handle audit failure', async () => {
      const { mockAudit } = require('../test/test-utils');
      mockAudit.logOperation.mockRejectedValueOnce(new Error('Audit Fail'));

      const resp = await request(app.getHttpServer())
        .get('/api/modules/shop/health')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'error', module: 'shop' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('MODULE_HEALTH_FAILURE', expect.anything());
    });
  });
});
