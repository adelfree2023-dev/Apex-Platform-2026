# 📋 خطة التنفيذ الأمني — المرحلة الثانية

> **التاريخ:** 15 يناير 2026  
> **الحالة:** قيد التنفيذ

---

## ✅ المرحلة الأولى (P0) — مكتملة

| المهمة | الحالة | الملف |
|--------|--------|-------|
| Token → `crypto.randomBytes` | ✅ | `auth/social-auth.service.ts` |
| Helmet Middleware | ✅ | `main.ts` |
| Rate Limiting (Throttler) | ✅ | `app.module.ts` |
| CORS Production | ✅ | `main.ts` |
| Schema Validation | ✅ | `auth/social-auth.service.ts` |

---

## 🔄 المرحلة الثانية — قيد التنفيذ

### الخطوة 1: اختبار Health Check ⏳

```bash
# على السيرفر
curl http://localhost:3001/health
```

**النتيجة المتوقعة:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:00:00Z"
}
```

---

### الخطوة 2: اختبار Rate Limiting ⏳

```bash
# إرسال 10 طلبات سريعة (يجب أن يُرفض بعد 5)
for i in {1..10}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://localhost:3001/health
done
```

**النتيجة المتوقعة:**
```
Request 1: 200
Request 2: 200
Request 3: 200
Request 4: 200
Request 5: 200
Request 6: 429  ← Too Many Requests
Request 7: 429
...
```

---

### الخطوة 3: JWT Refresh Tokens ⏳

**الملف الجديد:** `packages/core/src/auth/jwt.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly accessSecret = process.env.JWT_SECRET || 'dev-secret';
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

  // Access Token — 15 دقيقة
  generateAccessToken(payload: any): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: '15m' });
  }

  // Refresh Token — 7 أيام
  generateRefreshToken(payload: any): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: '7d' });
  }

  // التحقق من Access Token
  verifyAccessToken(token: string): any {
    return jwt.verify(token, this.accessSecret);
  }

  // التحقق من Refresh Token
  verifyRefreshToken(token: string): any {
    return jwt.verify(token, this.refreshSecret);
  }

  // تجديد التوكنات
  async refreshTokens(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    delete payload.iat;
    delete payload.exp;
    
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}
```

**التثبيت:**
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

---

### الخطوة 4: Input Validation (Zod) ⏳

**الملفات الجديدة:**

#### `packages/core/src/common/dto/auth.dto.ts`
```typescript
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

export const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100).optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
```

#### `packages/core/src/common/dto/tenant.dto.ts`
```typescript
import { z } from 'zod';

export const TenantIdSchema = z.string()
  .regex(/^[a-z0-9_]+$/, 'Invalid tenant ID format')
  .min(3)
  .max(50);

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(255),
  subdomain: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50),
  businessType: z.enum(['RETAIL', 'WHOLESALE', 'SERVICES']),
  territory: z.string().min(1).max(100),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
```

#### `packages/core/src/common/dto/product.dto.ts`
```typescript
import { z } from 'zod';

export const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().max(999999999),
  description: z.string().max(10000).optional(),
  sku: z.string().max(100).optional(),
  stock: z.number().int().min(0).optional(),
});

export type ProductDto = z.infer<typeof ProductSchema>;
```

**التثبيت:**
```bash
npm install zod
```

---

### الخطوة 5: Audit Logging ⏳

**الملف الجديد:** `packages/core/src/audit/audit.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEvent {
  action: string;
  tenantId: string;
  userId?: number;
  ip?: string;
  details?: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(tenantSchema: string, event: AuditEvent): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_audit_log" 
        (action, user_id, ip_address, details, severity, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, event.action, event.userId || null, event.ip || null, 
         JSON.stringify(event.details || {}), event.severity);
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error}`);
    }
  }

  async getAuditLog(tenantSchema: string, limit = 100): Promise<any[]> {
    const logs = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_audit_log"
      ORDER BY created_at DESC
      LIMIT $1
    `, limit);
    return logs as any[];
  }
}
```

---

### الخطوة 6: Error Masking ⏳

**الملف الجديد:** `packages/core/src/common/filters/http-exception.filter.ts`

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;

    // Log the full error
    this.logger.error(`${request.method} ${request.url}`, exception.stack);

    // Production: Hide details
    if (process.env.NODE_ENV === 'production') {
      response.status(status).json({
        statusCode: status,
        message: status === 500 ? 'Internal server error' : exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      // Development: Show details
      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: exception.name,
        stack: exception.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
```

---

## 📅 ترتيب التنفيذ

| # | المهمة | الوقت | الأولوية |
|---|--------|-------|----------|
| 1 | اختبار Health Check | 5 min | P0 |
| 2 | اختبار Rate Limiting | 10 min | P0 |
| 3 | JWT Refresh Tokens | 2 hours | P1 |
| 4 | Input Validation (Zod) | 3 hours | P1 |
| 5 | Audit Logging | 2 hours | P2 |
| 6 | Error Masking | 1 hour | P2 |
| **المجموع** | | **~8.5 ساعات** | |

---

## ✅ قائمة المراجعة

- [ ] اختبار Health Check ✅
- [ ] اختبار Rate Limiting يعمل
- [ ] إنشاء `jwt.service.ts`
- [ ] تثبيت `jsonwebtoken`
- [ ] إنشاء `common/dto/auth.dto.ts`
- [ ] إنشاء `common/dto/tenant.dto.ts`
- [ ] إنشاء `common/dto/product.dto.ts`
- [ ] تثبيت `zod`
- [ ] إنشاء `audit/audit.service.ts`
- [ ] إنشاء `http-exception.filter.ts`
- [ ] تفعيل الـ Filter في `main.ts`

---

**التوقيع:** فريق الأمان  
**التاريخ:** 15 يناير 2026  
**الحالة:** 🔄 قيد التنفيذ
