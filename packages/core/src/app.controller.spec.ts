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
  const mockAppService = {
    getHealth: jest.fn().mockResolvedValue({ status: 'ok', service: 'apex-core' }),
    verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
  };
  const mockSecurity = {
    logSecurityEvent: jest.fn(),
  };
  const { mockAudit } = require('../test/test-utils');

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: SecurityContext, useValue: mockSecurity },
        ...commonProviders.filter(p => (p as any).provide !== SecurityContext),
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
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'degraded', module: 'prisma-layer' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('DATABASE_HEALTH_FAILURE', expect.anything());
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
        .get('/api/modules/invalid_name/health')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('handle audit failure', async () => {
      mockAudit.logOperation.mockRejectedValueOnce(new Error('Audit Fail'));

      const resp = await request(app.getHttpServer())
        .get('/api/modules/shop/health')
        .expect(HttpStatus.OK);

      expect(resp.body).toEqual({ status: 'error', module: 'shop' });
      expect(mockSecurity.logSecurityEvent).toHaveBeenCalledWith('MODULE_HEALTH_FAILURE', expect.anything());
    });
  });
});
