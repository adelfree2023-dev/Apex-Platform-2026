# 📋 خطة التنفيذ - Backend First Strategy

---

## ⚙️ الضوابط الأساسية

| الضابط | التطبيق |
|--------|---------|
| 🔒 **لا تعديل على الأسس الموجودة** | أي إضافة = ملف جديد |
| 📦 **تجميد النسخ** | `package-lock.json` ثابت |
| ✅ **اختبار قبل الدمج** | لا merge بدون tests |
| 📝 **توثيق كل إضافة** | Comment + README |

---

# المرحلة 1: إكمال Backend Services

## 1.1 License Service (يوم واحد)
| المهمة | الملف | الاختبار | الحالة |
|--------|-------|----------|--------|
| توسيع generateLicense | `licenses.service.ts` | `licenses.service.spec.ts` | ⚠️ جزئي |
| إضافة validateLicense | جديد | ✅ يُضاف للـ spec | ❌ |
| إضافة revokeLicense | جديد | ✅ يُضاف للـ spec | ❌ |
| إضافة extendLicense | جديد | ✅ يُضاف للـ spec | ❌ |

> ⚡ **قاعدة:** لا يُعتبر الـ Service مكتمل إلا بعد إنشاء اختباراته

## 1.2 Billing Service (يومين)
| المهمة | الملف | الاختبار | الحالة |
|--------|-------|----------|--------|
| إنشاء BillingService | `billing.service.ts` | `billing.service.spec.ts` | ❌ |
| ربط Stripe للفواتير | جديد | ✅ mock tests | ❌ |
| getRevenueDashboard | جديد | ✅ يُضاف للـ spec | ❌ |
| recordTransaction | جديد | ✅ يُضاف للـ spec | ❌ |

## 1.3 Reports Service (يوم واحد)
| المهمة | الملف | الاختبار | الحالة |
|--------|-------|----------|--------|
| إنشاء ReportsService | `reports.service.ts` | `reports.service.spec.ts` | ❌ |
| generateTenantReport | جديد | ✅ يُضاف للـ spec | ❌ |
| generateRevenueReport | جديد | ✅ يُضاف للـ spec | ❌ |

---

# المرحلة 2: إكمال API Endpoints

## 2.1 License API
```
POST   /api/licenses/generate
GET    /api/licenses/:key/validate
PUT    /api/licenses/:key/extend
DELETE /api/licenses/:key/revoke
```

## 2.2 Billing API
```
GET    /api/billing/revenue
GET    /api/billing/invoices
POST   /api/billing/refund/:invoiceId
```

## 2.3 Reports API
```
GET    /api/reports/tenants
GET    /api/reports/revenue
POST   /api/reports/custom
```

## 2.4 Settings API
```
GET    /api/settings
PUT    /api/settings
GET    /api/settings/email-templates
PUT    /api/settings/email-templates/:id
```

---

# المرحلة 3: Database Tables

## 3.1 جداول مطلوبة
```sql
-- 1. invoices (فواتير)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    amount INTEGER,
    status VARCHAR(20),
    stripe_invoice_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. payment_history (سجل المدفوعات)
CREATE TABLE payment_history (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    amount INTEGER,
    method VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. tenant_settings (إعدادات المتجر)
CREATE TABLE tenant_settings (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    settings JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. email_templates (قوالب الإيميل)
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100),
    subject VARCHAR(255),
    body TEXT,
    is_active BOOLEAN DEFAULT true
);
```

---

# المرحلة 4: Security Enhancements

## 4.1 2FA للـ Super Admins
| المهمة | الأولوية |
|--------|----------|
| إضافة speakeasy للـ TOTP | 🔴 عالي |
| إنشاء TwoFactorService | 🔴 عالي |
| UI بسيط للتفعيل | 🟡 متوسط |

## 4.2 Audit Logs الكامل
| المهمة | الأولوية |
|--------|----------|
| توسيع AuditService | 🔴 عالي |
| تسجيل كل العمليات الحساسة | 🔴 عالي |
| API للاستعلام عن Logs | 🟡 متوسط |

## 4.3 Rate Limiting محسّن
| المهمة | الأولوية |
|--------|----------|
| Rate limit per tenant | 🟡 متوسط |
| Rate limit per endpoint | 🟡 متوسط |

---

# الجدول الزمني

| المرحلة | المدة | البداية |
|---------|-------|---------|
| **Backend Services** | 4 أيام | الأسبوع 1 |
| **API Endpoints** | 3 أيام | الأسبوع 1 |
| **Database** | يوم واحد | الأسبوع 1 |
| **Security** | 3 أيام | الأسبوع 2 |
| **اختبارات** | 2 أيام | الأسبوع 2 |
| **المجموع** | **~2 أسبوع** | - |

---

# ✅ Checklist للتنفيذ

## الأسبوع 1
- [ ] LicenseService - توسيع
  - [ ] ✅ إضافة اختبارات `licenses.service.spec.ts`
- [ ] BillingService - إنشاء
  - [ ] ✅ إنشاء `billing.service.spec.ts`
- [ ] ReportsService - إنشاء
  - [ ] ✅ إنشاء `reports.service.spec.ts`
- [ ] License API endpoints
  - [ ] ✅ اختبارات `licenses.controller.spec.ts`
- [ ] Billing API endpoints
  - [ ] ✅ اختبارات `billing.controller.spec.ts`
- [ ] Database migrations

## الأسبوع 2
- [ ] 2FA Service
  - [ ] ✅ إنشاء `two-factor.service.spec.ts`
- [ ] Audit Logs expansion
  - [ ] ✅ توسيع `audit.service.spec.ts`
- [ ] Rate Limiting per tenant
- [ ] Integration tests
- [ ] Documentation

---

## 📋 قاعدة الاختبار

> ⚡ **كل مهمة = Service + Test File**
> 
> لا يُغلق الـ Task إلا بعد:
> 1. ✅ كتابة الـ Service
> 2. ✅ كتابة الـ Spec File
> 3. ✅ تشغيل `npm test` والتأكد من النجاح

---

> **ملاحظة:** الـ Frontend سيكون Admin HQ الموجود فقط مع تعديلات بسيطة لعرض البيانات الجديدة.
