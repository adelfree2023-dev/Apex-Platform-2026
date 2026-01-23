import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditService } from './common/monitoring/audit/audit.service';
import { SecurityContext } from './common/security/security.context';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const mockAppService = {
    getHealth: jest.fn().mockResolvedValue({ status: 'ok', service: 'apex-core' }),
    verifyDatabaseConnection: jest.fn().mockResolvedValue(true),
  };
  const mockAuditService = { logOperation: jest.fn() };
  const mockSecurityContext = { logSecurityEvent: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: SecurityContext, useValue: mockSecurityContext },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/GET health (default)', async () => {
    const resp = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-ID', 'test')
      .expect(HttpStatus.OK);

    expect(resp.body).toMatchObject({ status: 'ok', service: 'apex-core' });
    expect(mockAuditService.logOperation).toHaveBeenCalledTimes(1);
  });

  it('/GET health (includeDetails true)', async () => {
    const resp = await request(app.getHttpServer())
      .get('/health?includeDetails=true')
      .set('X-Request-ID', 'test')
      .expect(HttpStatus.OK);

    expect(resp.body).toMatchObject({ status: 'ok' });
    // The service must have been called with includeDetails = true
    expect(mockAppService.getHealth).toHaveBeenCalledWith(true);
  });

  it('/GET api/app/health returns static payload', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/app/health')
      .expect(HttpStatus.OK);

    expect(resp.body).toEqual({
      status: 'ok',
      module: 'app-root',
      timestamp: expect.any(String),
    });
  });

  it('/GET api/infra/prisma/health (healthy DB)', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/infra/prisma/health')
      .expect(HttpStatus.OK);

    expect(resp.body).toEqual({ status: 'ok', module: 'prisma-layer' });
    expect(mockAppService.verifyDatabaseConnection).toHaveBeenCalled();
  });
});
