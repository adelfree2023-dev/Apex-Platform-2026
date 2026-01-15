# 📋 خطة تصليب الأساس — Apex Platform

> **التاريخ:** 15 يناير 2026  
> **الهدف:** أرض صلبة قبل الـ Frontend  
> **الحالة:** 🔄 قيد التنفيذ

---

## 🎯 الأهداف

| الهدف | المستهدف | الحالي |
|-------|----------|--------|
| **Test Coverage** | 90%+ | ~40% |
| **API Docs** | 100% موثقة | 0% |
| **Monitoring** | Prometheus + Grafana | ❌ |

---

## 📅 الجدول الزمني

```
┌────────────────────────────────────────────────────────────┐
│                  المرحلة 1: Swagger (2-3 ساعات)            │
├────────────────────────────────────────────────────────────┤
│ [ ] تثبيت @nestjs/swagger                                  │
│ [ ] تكوين SwaggerModule في main.ts                         │
│ [ ] إضافة DTOs decorators                                  │
│ [ ] إضافة Controller decorators                            │
│ [ ] اختبار /api/docs                                       │
├────────────────────────────────────────────────────────────┤
│                  المرحلة 2: Tests 90%+ (6-8 ساعات)         │
├────────────────────────────────────────────────────────────┤
│ [ ] Auth Module Tests                                      │
│ [ ] Tenants Module Tests                                   │
│ [ ] Vendure Service Tests                                  │
│ [ ] Payments Module Tests                                  │
│ [ ] Shipping Module Tests                                  │
│ [ ] Promotions Module Tests                                │
│ [ ] Analytics Module Tests                                 │
│ [ ] Search Module Tests                                    │
│ [ ] AI Module Tests                                        │
│ [ ] Affiliate Module Tests                                 │
│ [ ] Marketplace Module Tests                               │
│ [ ] Middleware Tests                                       │
├────────────────────────────────────────────────────────────┤
│                  المرحلة 3: Monitoring (3-4 ساعات)         │
├────────────────────────────────────────────────────────────┤
│ [ ] تثبيت @nestjs/terminus                                 │
│ [ ] تثبيت prom-client                                      │
│ [ ] إنشاء Metrics Endpoint                                 │
│ [ ] Docker Compose لـ Prometheus                           │
│ [ ] Docker Compose لـ Grafana                              │
│ [ ] إنشاء Dashboards                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 المرحلة 1: Swagger API Docs

### الخطوة 1.1: التثبيت
```bash
npm install @nestjs/swagger swagger-ui-express
```

### الخطوة 1.2: تكوين main.ts
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Apex Platform API')
  .setDescription('Multi-Tenant E-Commerce Platform')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentication endpoints')
  .addTag('tenants', 'Tenant management')
  .addTag('products', 'Product catalog')
  .addTag('orders', 'Order management')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### الخطوة 1.3: Controller Decorators
```typescript
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Post('login')
  login(@Body() dto: LoginDto) {}
}
```

---

## 🧪 المرحلة 2: Test Coverage 90%+

### الموديولات المطلوب اختبارها:

| # | الموديول | الملف | الأولوية |
|---|----------|-------|----------|
| 1 | **Auth** | `auth.controller.spec.ts` | P0 |
| 2 | **Auth** | `jwt.service.spec.ts` | P0 |
| 3 | **Tenants** | `tenants.service.spec.ts` | P0 |
| 4 | **Vendure** | `vendure.service.spec.ts` | P0 |
| 5 | **Middleware** | `tenant.middleware.spec.ts` | P0 |
| 6 | Payments | `payments.service.spec.ts` | P1 |
| 7 | Shipping | `shipping.service.spec.ts` | P1 |
| 8 | Promotions | `promotions.service.spec.ts` | P1 |
| 9 | Analytics | `analytics.service.spec.ts` | P1 |
| 10 | Search | `search.service.spec.ts` | P1 |
| 11 | AI | `ai.service.spec.ts` | P2 |
| 12 | Affiliate | `affiliate.service.spec.ts` | P2 |
| 13 | Marketplace | `marketplace.service.spec.ts` | P2 |
| 14 | Audit | `audit.service.spec.ts` | P2 |

### أوامر التشغيل:
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- auth.controller.spec.ts
```

---

## 📊 المرحلة 3: Prometheus + Grafana

### الخطوة 3.1: Metrics Endpoint
```typescript
// packages/core/src/metrics/metrics.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
```

### الخطوة 3.2: Docker Compose
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## ✅ قائمة المراجعة

### المرحلة 1: Swagger ⏳
- [ ] تثبيت الحزم
- [ ] تكوين main.ts
- [ ] إضافة decorators
- [ ] اختبار /api/docs
- [ ] التحقق من جميع الـ endpoints

### المرحلة 2: Tests 90%+ ⏳
- [ ] Auth Tests (P0)
- [ ] Tenants Tests (P0)
- [ ] Vendure Tests (P0)
- [ ] Middleware Tests (P0)
- [ ] Payments Tests (P1)
- [ ] Shipping Tests (P1)
- [ ] باقي الموديولات (P2)
- [ ] تشغيل --coverage
- [ ] التأكد من ≥90%

### المرحلة 3: Monitoring ⏳
- [ ] Metrics Endpoint
- [ ] Prometheus Config
- [ ] Grafana Dashboards
- [ ] Health Checks

---

## 🚫 ممنوع حتى الاكتمال

> **❌ لا Frontend حتى:**
> - ✅ Swagger 100%
> - ✅ Test Coverage ≥90%
> - ✅ Monitoring يعمل

---

**التوقيع:** القائد الهندسي  
**التاريخ:** 15 يناير 2026  
**الحالة:** 🔄 البدء بـ Swagger
