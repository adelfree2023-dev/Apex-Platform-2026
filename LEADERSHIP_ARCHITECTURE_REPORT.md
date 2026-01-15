# 📋 التقرير المعماري الشامل - Apex Platform
## تقرير للعرض على القيادة الهندسية

> **التاريخ:** 2026-01-15  
> **الإصدار:** v1.0  
> **الحالة:** في انتظار الموافقة

---

## 🎯 الملخص التنفيذي

| البند | التفاصيل |
|-------|----------|
| **الهدف** | منصة SaaS متعددة المستأجرين للتجارة الإلكترونية |
| **الفلسفة** | عزل تام + لا اعتماديات مدفوعة |
| **الهيكل** | 4 تطبيقات منفصلة + تطبيق موبايل |
| **التقنيات** | Next.js + NestJS + PostgreSQL + shadcn/ui |

---

## 🏗️ المبدأ الأساسي: العزل التام

### 1. عزل البيانات (Schema-per-Tenant)
```
كل متجر له Schema منفصل في قاعدة البيانات:

PostgreSQL Database: apex_saas
├── public           → بيانات النظام الأساسي
├── tenant_maadi     → متجر العسل المعادي
├── tenant_zamalek   → متجر زمالك
└── tenant_nasr      → متجر مدينة نصر

✅ لا يمكن لمتجر الوصول لبيانات متجر آخر
✅ كل Schema معزول تماماً بـ Row-Level Security
```

### 2. عزل التطبيقات (4 مواقع منفصلة)
```
DNS / Subdomain Structure:

┌─────────────────────────────────────────────────┐
│                  apex-platform.com               │
├─────────────────────────────────────────────────┤
│  www.apex-platform.com      → Marketing Site    │
│  hq.apex-platform.com       → Super Admin       │
│  [tenant].apex-platform.com → Storefront        │
│  admin.[tenant].apex-platform.com → Tenant Admin│
└─────────────────────────────────────────────────┘
```

---

## 📦 الهيكل المعماري النهائي

```
apex-platform/
│
├── packages/
│   │
│   ├── 🔧 core/                    ← Backend NestJS
│   │   ├── src/
│   │   │   ├── tenants/           → إدارة المستأجرين
│   │   │   ├── vendors/           → E-commerce Core
│   │   │   ├── payments/          → Stripe Integration
│   │   │   ├── auth/              → JWT Authentication
│   │   │   └── ...25 module       → باقي الموديولات
│   │   └── الحالة: ✅ جاهز 90%
│   │
│   ├── 🛍️ storefront/              ← واجهة المتجر العامة
│   │   ├── src/app/
│   │   │   ├── page.tsx           → الصفحة الرئيسية
│   │   │   ├── p/[slug]/          → تفاصيل المنتج
│   │   │   ├── cart/              → السلة
│   │   │   ├── checkout/          → الدفع
│   │   │   └── account/           → حساب العميل
│   │   └── الحالة: ⚠️ 25% — يحتاج إعادة بناء
│   │
│   ├── 🏪 tenant-admin/            ← لوحة تحكم التاجر
│   │   ├── src/app/
│   │   │   ├── dashboard/         → الإحصائيات
│   │   │   ├── products/          → إدارة المنتجات
│   │   │   ├── orders/            → إدارة الطلبات
│   │   │   ├── customers/         → إدارة العملاء
│   │   │   └── settings/          → إعدادات المتجر
│   │   └── الحالة: ❌ غير موجود — يحتاج إنشاء
│   │
│   ├── 🔐 super-admin/             ← لوحة تحكم HQ
│   │   ├── src/app/
│   │   │   ├── dashboard/         → نظرة عامة
│   │   │   ├── tenants/           → إدارة المستأجرين
│   │   │   ├── licenses/          → إدارة الرخص
│   │   │   ├── billing/           → الفوترة
│   │   │   └── analytics/         → التحليلات
│   │   └── الحالة: ❌ غير موجود — يحتاج إنشاء
│   │
│   ├── 🌐 marketing-site/          ← صفحة التسويق
│   │   ├── src/app/
│   │   │   ├── page.tsx           → الصفحة الرئيسية
│   │   │   ├── pricing/           → الأسعار
│   │   │   ├── features/          → الميزات
│   │   │   └── contact/           → تواصل معنا
│   │   └── الحالة: ❌ غير موجود — يحتاج إنشاء
│   │
│   └── 📱 mobile-app/              ← تطبيق الموبايل
│       └── الحالة: ❌ مرحلة لاحقة
│
└── docker-compose.yml              ← Deploy Configuration
```

---

## 🔗 الربط الداخلي والحوكمة

### مخطط التواصل بين التطبيقات:

```
┌──────────────────────────────────────────────────────────┐
│                    Backend API (NestJS)                   │
│                   localhost:3001 / api.apex-platform.com  │
└──────────────────────────────────────────────────────────┘
          ▲           ▲           ▲           ▲
          │           │           │           │
     ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
     │Storefront│ │Tenant   │ │Super    │ │Marketing│
     │   :3000  │ │Admin    │ │Admin    │ │Site     │
     │          │ │  :3002  │ │  :3003  │ │  :3004  │
     └──────────┘ └─────────┘ └─────────┘ └─────────┘
```

### JWT Token Flow:
```
1. المستخدم يسجل دخول من أي تطبيق
2. Backend يُصدر JWT Token
3. Token يحتوي على: userId, tenantId, role, schema
4. كل تطبيق يتحقق من الـ Token قبل السماح بالوصول
```

---

## 🎁 SaaS Boilerplate — الأساس المعتمد

> **المصدر:** https://github.com/ixartz/SaaS-Boilerplate  
> **الترخيص:** MIT (مجاني 100%)

### ✅ الميزات الجاهزة من الـ Boilerplate:

| الميزة | التفاصيل | الفائدة |
|--------|----------|---------|
| **Next.js 15** | App Router + Server Components | أحدث إصدار |
| **shadcn/ui** | 40+ مكون جاهز | توفير 80% من وقت UI |
| **Tailwind CSS** | Utility-first CSS | تصميم سريع |
| **TypeScript Strict** | Type Safety كامل | أخطاء أقل |
| **Multi-tenancy** | Organizations + Teams | جاهز للتعديل |
| **i18n (next-intl)** | دعم 100+ لغة + RTL | العربية جاهزة |
| **Forms** | react-hook-form + Zod | Validation قوي |
| **Testing** | Vitest + Playwright | Unit + E2E |
| **ESLint + Prettier** | Code Quality | معايير موحدة |
| **Husky** | Git Hooks | منع الأخطاء |
| **Storybook** | UI Documentation | توثيق المكونات |
| **SEO** | Sitemap + robots.txt | جاهز للإطلاق |
| **Dark Mode** | Light/Dark Toggle | تجربة مستخدم |

---

## 🔄 البدائل المجانية للمكونات المدفوعة

| المكون الأصلي | الحالة | البديل المجاني | التكلفة |
|---------------|--------|----------------|---------|
| **Clerk Auth** | 💰 مدفوع | **NextAuth.js + JWT** | $0 |
| **Prisma Postgres** | 💰 مدفوع | **Self-hosted PostgreSQL** | $0 |
| **Sentry Pro** | 💰 مدفوع | **Pino.js + Winston** | $0 |
| **Vercel Pro** | 💰 مدفوع | **Docker + VPS** | $0 |
| **Codecov Pro** | 💰 مدفوع | **Jest Coverage** | $0 |

### 📋 خطة الاستبدال:

```typescript
// بدلاً من Clerk
// ❌ import { ClerkProvider } from '@clerk/nextjs';

// ✅ نستخدم NextAuth.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Apex Auth',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // نتصل بالـ Backend (NestJS)
        const res = await fetch('http://localhost:3001/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        const user = await res.json();
        return user ?? null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.tenantSchema = user.tenantSchema;
        token.role = user.role;
      }
      return token;
    }
  }
};
```

---

## 🛠️ التقنيات المستخدمة (مجانية 100%)

| الفئة | التقنية | الترخيص |
|-------|---------|---------|
| **Frontend** | Next.js 15 | MIT |
| **UI Library** | shadcn/ui | MIT |
| **CSS** | Tailwind CSS | MIT |
| **Backend** | NestJS | MIT |
| **Database** | PostgreSQL | PostgreSQL License |
| **ORM** | Prisma | Apache 2.0 |
| **Auth** | NextAuth.js + JWT | ISC |
| **Forms** | react-hook-form + Zod | MIT |
| **i18n** | next-intl | MIT |
| **Testing** | Jest + Playwright | MIT |
| **Mobile** | React Native / Flutter | BSD / BSD |

---

## 📱 تطبيق الموبايل

### الخيارات المتاحة:

| الخيار | الإيجابيات | السلبيات | التوصية |
|--------|-----------|----------|---------|
| **React Native** | نفس الفريق (JS) | Performance | ⭐⭐⭐ |
| **Flutter** | Performance ممتاز | لغة جديدة (Dart) | ⭐⭐⭐⭐ |
| **PWA** | لا حاجة لتطبيق منفصل | ميزات محدودة | ⭐⭐⭐⭐⭐ |

### التوصية: البدء بـ PWA

```
المرحلة 1: تحويل Storefront إلى PWA
├── يعمل على iOS + Android
├── لا حاجة لـ App Store
├── نفس الكود
└── قابل للتثبيت على الهاتف

المرحلة 2 (لاحقاً): تطبيق Flutter
├── للميزات المتقدمة
├── Push Notifications
└── Native Performance
```

---

## 📅 خارطة الطريق للمرحلة الأولى (Demo)

### المرحلة 0: التأسيس (أسبوع 1)
- [ ] إنشاء الحزم الأربعة الجديدة
- [ ] تثبيت shadcn/ui + Tailwind
- [ ] إعداد Design System موحد
- [ ] إعداد RTL + Arabic Font

### المرحلة 1: Storefront (أسبوع 2)
- [ ] الصفحة الرئيسية
- [ ] قائمة المنتجات (`/shop`)
- [ ] تفاصيل المنتج (`/p/[slug]`)
- [ ] السلة (`/cart`)
- [ ] الدفع (`/checkout`)
- [ ] حساب العميل (`/account`)

### المرحلة 2: Tenant Admin (أسبوع 3)
- [ ] Dashboard
- [ ] Products CRUD
- [ ] Orders Management
- [ ] Customers List
- [ ] Settings

### المرحلة 3: Super Admin (أسبوع 4)
- [ ] Dashboard
- [ ] Tenants List + Create
- [ ] License Management
- [ ] Basic Analytics

### المرحلة 4: Demo Release (أسبوع 5)
- [ ] Marketing Site (Landing Page فقط)
- [ ] Testing & Bug Fixes
- [ ] Documentation
- [ ] **🚀 Demo Launch**

---

## ❓ خطوات إضافية للوصول للـ Demo

### ما تم إنجازه:
- [x] Backend (25 module) — 90%
- [x] Database Schema — 100%
- [x] Unit Tests — 240+ tests
- [x] Stripe Integration — 100%

### ما يحتاج إنجازه:

| # | المهمة | الأولوية | الوقت المقدر |
|---|--------|----------|--------------|
| 1 | إنشاء `tenant-admin` package | P0 | 3 أيام |
| 2 | إنشاء `super-admin` package | P0 | 3 أيام |
| 3 | إنشاء `marketing-site` package | P1 | 2 أيام |
| 4 | إعادة بناء `storefront` | P0 | 5 أيام |
| 5 | ربط Frontend بـ Backend | P0 | 2 أيام |
| 6 | إعداد Docker للـ Deploy | P1 | 1 يوم |
| 7 | Testing & QA | P0 | 3 أيام |
| 8 | Documentation | P2 | 2 أيام |
| **المجموع** | | | **21 يوم** |

---

## ✅ الخلاصة

| البند | الحالة |
|-------|--------|
| **Backend** | ✅ جاهز 90% |
| **Storefront** | ⚠️ يحتاج إعادة بناء |
| **Tenant Admin** | ❌ يحتاج إنشاء |
| **Super Admin** | ❌ يحتاج إنشاء |
| **Marketing Site** | ❌ يحتاج إنشاء |
| **Mobile App** | 📋 المرحلة الثانية |

### 📌 القرار المطلوب:

> **الموافقة على بدء تنفيذ المرحلة الأولى (Demo) خلال 5 أسابيع**

---

**التوقيع:** ________________  
**التاريخ:** 2026-01-15  
**الحالة:** ⏳ في انتظار الموافقة
