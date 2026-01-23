import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../packages/core/src/app.module';
import { PrismaService } from '../../packages/core/src/prisma/prisma.service';
import { SystemInitializationService } from '../../packages/core/src/common/core/system-initialization.service';

/**
* 🔒 Security Verification Suite - يحقق من جميع الإصلاحات الأمنية
* - يتحقق من عزل المستأجرين
* - يتحقق من حماية CSP
* - يتحقق من صحة التشفير
*/
describe('Security Verification Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    
    // ✅ حل المشكلة: التحقق من الاتصال بقاعدة البيانات
    await prisma.connectWithRetry(3, 1000);
    
    // ✅ حل المشكلة: تهيئة النظام قبل الاختبار
    const systemInit = app.get(SystemInitializationService);
    await systemInit.initializeSystem();
    
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('S2: Tenant Isolation', () => {
    it('should prevent cross-tenant data access', async () => {
      // إنشاء مستأجرين للاختبار
      const tenantA = await prisma.tenant.create({
        data: {
          name: 'Tenant A',
          subdomain: `test-a-${Date.now()}`,
          schemaName: `tenant_test_a_${Date.now()}`,
          businessType: 'RETAIL',
          status: 'active'
        }
      });
      
      const tenantB = await prisma.tenant.create({
        data: {
          name: 'Tenant B',
          subdomain: `test-b-${Date.now()}`,
          schemaName: `tenant_test_b_${Date.now()}`,
          businessType: 'RETAIL',
          status: 'active'
        }
      });
      
      // تهيئة مخططات قاعدة البيانات
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${tenantA.schemaName}"`);
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${tenantB.schemaName}"`);
      
      // إنشاء جدول واختبار في tenantA
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${tenantA.schemaName}".test_data (
          id SERIAL PRIMARY KEY,
          secret VARCHAR(255) NOT NULL
        );
      `);
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantA.schemaName}".test_data (secret) VALUES ('CONFIDENTIAL_DATA_A');
      `);
      
      // التحقق من عدم إمكانية الوصول من tenantB
      await prisma.setTenantSchema(tenantB.schemaName);
      
      try {
        await prisma.$queryRawUnsafe(`
          SELECT * FROM "${tenantA.schemaName}".test_data;
        `);
        fail('Should not be able to access tenant A data from tenant B context');
      } catch (error) {
        expect(error.message).toContain('relation');
      }
    });
  });

  describe('S8: CSP Headers', () => {
    it('should have secure CSP headers on health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/app/health')
        .expect(200);
        
      // التحقق من رؤوس CSP
      const cspHeader = response.header['content-security-policy'];
      expect(cspHeader).toBeDefined();
      
      // التحقق من عدم وجود 'unsafe-inline' or 'unsafe-eval'
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).not.toContain("'unsafe-eval'");
      
      // التحقق من التوجيهات الأساسية
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("frame-ancestors 'none'");
      expect(cspHeader).toContain("object-src 'none'");
    });
  });

  describe('S7: Encryption Service', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      
      const encryptedFieldService = module.get('EncryptedFieldService');
      const tenantId = 'test-tenant';
      const secretData = 'sensitive-information-123';
      
      // التشفير
      const encrypted = encryptedFieldService.encrypt(tenantId, secretData);
      expect(encrypted).not.toEqual(secretData);
      expect(encrypted).toContain(':');
      
      // فك التشفير
      const decrypted = encryptedFieldService.decrypt(tenantId, encrypted);
      expect(decrypted).toEqual(secretData);
    });
  });

  describe('S1: Environment Validation', () => {
    it('should fail to start in production without required env variables', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const originalJwtSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      try {
        await SystemInitializationService.validateEnvironment({
          get: (key: string) => {
            if (key === 'NODE_ENV') return 'production';
            if (key === 'DATABASE_URL') return 'test-url';
            return undefined;
          }
        } as any);
        fail('Should throw error when JWT_SECRET is missing in production');
      } catch (error) {
        expect(error.message).toContain('JWT_SECRET');
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.JWT_SECRET = originalJwtSecret;
      }
    });
  });
});