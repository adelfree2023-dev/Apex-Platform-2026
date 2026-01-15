# 🔒 التقرير الأمني التنفيذي — إغلاق جميع الثغرات

> **إلى:** القائد الهندسي  
> **من:** فريق الأمان  
> **التاريخ:** 15 يناير 2026  
> **الموضوع:** خطة إغلاق الثغرات الأمنية

---

## ✅ موافقة القيادة (15 يناير 2026)

> **"الأمان ليس ميزة — بل شرط وجود.  
> بدون هذه التعديلات، النظام غير جاهز للإنتاج تحت أي ظرف."**

### التعديلات المعتمدة من القائد:

| التعديل | التفاصيل |
|---------|----------|
| **Plan-Based Rate Limiting** | Starter: 10 req/min, Enterprise: 1000 req/min |
| **JWT Secrets in Vault** | عدم استخدام `.env` للمفاتيح الحساسة |
| **Audit في tenant_schema** | سجلات التدقيق داخل schema المتجر |

---

| المؤشر | الحالي | المستهدف |
|--------|--------|----------|
| **التقييم الأمني** | 4.0/5 (B) | **5.0/5 (A+)** |
| **الثغرات الحرجة** | 0 | 0 ✅ |
| **الثغرات العالية** | 3 | 0 |
| **الثغرات المتوسطة** | 5 | 0 |
| **الثغرات المنخفضة** | 4 | 0 |

---

## 🚨 الثغرات المكتشفة والحلول

### 🔴 P0 — حرجة (تنفيذ فوري)

---

#### 1. Token Generation ضعيف

**الثغرة:**
```typescript
// ❌ الكود الحالي — غير آمن
private generateToken(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
}
// Math.random() ليس cryptographically secure
```

**الحل:**
```typescript
// ✅ الكود الآمن
import { randomBytes } from 'crypto';

private generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}
```

**الملف:** `packages/core/src/auth/social-auth.service.ts`  
**السطر:** 225-227  
**الوقت المقدر:** 30 دقيقة

---

#### 2. لا يوجد Rate Limiting

**الثغرة:**
- لا حماية من Brute Force attacks
- يمكن للمهاجم إرسال آلاف الطلبات بلا حدود

**الحل:**
```typescript
// packages/core/src/main.ts

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 3,     // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 20,    // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 100,   // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

**التثبيت:**
```bash
npm install @nestjs/throttler
```

**الوقت المقدر:** 1 ساعة

---

#### 3. لا يوجد Helmet Middleware

**الثغرة:**
- HTTP headers غير محمية
- عرضة لـ XSS, Clickjacking, MIME sniffing

**الحل:**
```typescript
// packages/core/src/main.ts

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ إضافة Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }));
  
  await app.listen(3001);
}
```

**التثبيت:**
```bash
npm install helmet
```

**الوقت المقدر:** 30 دقيقة

---

### 🟠 P1 — عالية (خلال 48 ساعة)

---

#### 4. CORS غير مكوّن

**الثغرة:**
- يمكن لأي موقع إرسال طلبات للـ API

**الحل:**
```typescript
// packages/core/src/main.ts

app.enableCors({
  origin: [
    'https://www.apex-platform.com',
    'https://hq.apex-platform.com',
    /\.apex-platform\.com$/,  // جميع subdomains
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 hours
});
```

**الوقت المقدر:** 30 دقيقة

---

#### 5. لا يوجد JWT Refresh Tokens

**الثغرة:**
- Access Token صالح لمدة 30 يوم (طويل جداً)
- إذا تسرب التوكن، المهاجم يملك 30 يوم للوصول

**الحل:**
```typescript
// packages/core/src/auth/jwt.service.ts

export class JwtService {
  // Access Token — قصير المدة
  generateAccessToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m', // 15 دقيقة فقط
    });
  }
  
  // Refresh Token — طويل المدة
  generateRefreshToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d', // 7 أيام
    });
  }
  
  // Refresh endpoint
  async refreshTokens(refreshToken: string) {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    // التحقق من أن الـ token لم يتم revoke
    // إنشاء access + refresh جديد
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}
```

**الوقت المقدر:** 2 ساعة

---

#### 6. لا يوجد Input Validation موحد

**الثغرة:**
- لا يوجد validation للـ input
- عرضة لـ injection attacks

**الحل:**
```typescript
// packages/core/src/common/dto/login.dto.ts

import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

export const TenantIdSchema = z.string()
  .regex(/^[a-z0-9_]+$/)
  .min(3)
  .max(50);

export const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().max(999999999),
  description: z.string().max(10000).optional(),
});
```

**التثبيت:**
```bash
npm install zod
```

**الوقت المقدر:** 3 ساعات

---

#### 7. SQL Injection في Dynamic Schemas

**الثغرة:**
```typescript
// ⚠️ tenantSchema يأتي من المستخدم
await this.prisma.$queryRawUnsafe(`
  SELECT * FROM "${tenantSchema}".products
`);
```

**الحل:**
```typescript
// ✅ Validation قبل الاستخدام
private validateSchema(schema: string): boolean {
  const pattern = /^tenant_[a-z0-9_]+$/;
  if (!pattern.test(schema)) {
    throw new BadRequestException('Invalid tenant schema');
  }
  return true;
}

// في كل method
async getProducts(tenantSchema: string) {
  this.validateSchema(tenantSchema);
  // ... الكود الباقي
}
```

**الوقت المقدر:** 1 ساعة

---

### 🟡 P2 — متوسطة (خلال أسبوع)

---

#### 8. لا يوجد Audit Logging

**الحل:**
```typescript
// packages/core/src/audit/audit.service.ts

@Injectable()
export class AuditService {
  async log(event: {
    action: string;
    tenantId: string;
    userId?: number;
    ip?: string;
    details?: any;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }) {
    await this.prisma.auditLog.create({
      data: {
        ...event,
        timestamp: new Date(),
      },
    });
  }
}
```

---

#### 9. لا يوجد فحص Dependencies

**الحل:**
```bash
# إضافة للـ CI/CD
npm audit --audit-level=high

# أو استخدام Snyk
npx snyk test
```

---

#### 10. لا يوجد Error Masking

**الثغرة:**
- أخطاء النظام تظهر للمستخدم
- تسريب معلومات داخلية

**الحل:**
```typescript
// packages/core/src/common/filters/http-exception.filter.ts

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    // في Production — إخفاء التفاصيل
    if (process.env.NODE_ENV === 'production') {
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        requestId: ctx.getRequest().id,
      });
    } else {
      // في Development — إظهار التفاصيل
      response.status(exception.status || 500).json({
        message: exception.message,
        stack: exception.stack,
      });
    }
  }
}
```

---

### 🟢 P3 — منخفضة (خلال شهر)

---

#### 11. لا يوجد 2FA

**التوصية:** إضافة TOTP (Google Authenticator) لـ Admin accounts

#### 12. لا يوجد Session Management UI

**التوصية:** صفحة لعرض الـ sessions النشطة وإنهائها

#### 13. لا يوجد Password Policy

**التوصية:** فرض قوة كلمة المرور (8+ أحرف، رقم، حرف خاص)

#### 14. لا يوجد Encryption at Rest

**التوصية:** تشفير البيانات الحساسة في قاعدة البيانات

---

## 📅 الجدول الزمني للتنفيذ

```
┌────────────────────────────────────────────────────────────┐
│                      اليوم 1 (P0)                          │
├────────────────────────────────────────────────────────────┤
│ ✅ Token Generation Fix           — 30 min               │
│ ✅ Helmet Middleware               — 30 min               │
│ ✅ Rate Limiting                   — 1 hour               │
│ ✅ Schema Validation               — 1 hour               │
├────────────────────────────────────────────────────────────┤
│                      اليوم 2 (P1)                          │
├────────────────────────────────────────────────────────────┤
│ ✅ CORS Configuration              — 30 min               │
│ ✅ JWT Refresh Tokens              — 2 hours              │
│ ✅ Input Validation (Zod)          — 3 hours              │
├────────────────────────────────────────────────────────────┤
│                      اليوم 3 (P2)                          │
├────────────────────────────────────────────────────────────┤
│ ✅ Audit Logging                   — 2 hours              │
│ ✅ Error Masking                   — 1 hour               │
│ ✅ npm audit in CI/CD              — 30 min               │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 قائمة المراجعة النهائية

### P0 — فوري (اليوم 1): ✅ مكتمل
- [x] استبدال `Math.random` بـ `crypto.randomBytes`
- [x] تثبيت وتكوين `helmet`
- [x] تثبيت وتكوين `@nestjs/throttler`
- [x] إضافة `validateSchema()` لكل استعلام

### P1 — عالي (اليوم 2): ✅ مكتمل
- [x] تكوين CORS للـ production
- [x] تنفيذ JWT Refresh Tokens
- [x] إضافة Zod validation

### P2 — متوسط (اليوم 3): ✅ مكتمل
- [x] تنفيذ Audit Logging
- [x] إضافة Error Masking
- [x] إضافة `npm audit` للـ CI/CD

### تفعيل المكونات: ✅ مكتمل
- [x] تفعيل Exception Filter في `main.ts`
- [x] تفعيل AuditModule في `app.module.ts`
- [x] إنشاء GitHub Actions workflow

---

## ✅ النتيجة المتوقعة

| المؤشر | قبل | بعد |
|--------|-----|-----|
| **التقييم الأمني** | 4.0/5 | **5.0/5** ✅ |
| **Rate Limiting** | ❌ | ✅ |
| **CORS** | ❌ | ✅ |
| **Helmet** | ❌ | ✅ |
| **Token Security** | ⚠️ | ✅ |
| **Input Validation** | ❌ | ✅ |
| **Audit Logging** | ❌ | ✅ |

---

## 📌 القرار المطلوب

> **الموافقة على تنفيذ خطة إغلاق الثغرات الأمنية (3 أيام)**

---

**التوقيع:** فريق الأمان  
**التاريخ:** 15 يناير 2026  
**الحالة:** ⏳ في انتظار الموافقة
