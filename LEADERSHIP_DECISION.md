# 📋 قرار القيادة الهندسية - Apex Platform

> **التاريخ:** 2026-01-15  
> **الحالة:** ✅ **موافق عليه رسمياً**

---

## ✅ الموافقة الرسمية

> **"أوافق على التقرير المعماري الشامل — بـ 'مثالية هندسية'.  
> النظام لا يُبنى فقط ليعمل — بل ليكون **مُصمَّمًا للعمل في الإنتاج**."**

---

## 🔹 ما تمت الموافقة عليه بدون تغيير:

| القرار | الحالة |
|--------|--------|
| **Schema-per-Tenant** | ✅ معتمد |
| **4 تطبيقات منفصلة** | ✅ معتمد |
| **SaaS Boilerplate كمرجع** | ✅ معتمد |
| **استبدال المكونات المدفوعة** | ✅ معتمد |
| **PWA للموبايل** | ✅ معتمد |

---

## 🔧 التعديلات الإلزامية (Non-Negotiable)

### 1. هيكل المسارات (Routing)

```diff
- ❌ admin.maadi-honey.apex-platform.com
+ ✅ maadi-honey.apex-platform.com/admin
```

**السبب:** عزل تام مع subdomain واحد لكل متجر

**الهيكل النهائي:**
```
https://maadi-honey.apex-platform.com/           → الصفحة الرئيسية
https://maadi-honey.apex-platform.com/shop       → المنتجات
https://maadi-honey.apex-platform.com/admin      → لوحة تحكم التاجر
https://hq.apex-platform.com/                    → Super Admin
https://www.apex-platform.com/                   → Marketing Site
```

### 2. الحزم المنفصلة

| الحزمة | المسار | الـ Subdomain |
|--------|--------|---------------|
| `storefront` | `packages/storefront` | `[tenant].apex-platform.com` |
| `tenant-admin` | `packages/tenant-admin` | `[tenant].apex-platform.com/admin` |
| `super-admin` | `packages/super-admin` | `hq.apex-platform.com` |
| `marketing-site` | `packages/marketing-site` | `www.apex-platform.com` |

### 3. الهيكل النهائي المعتمد

```
apex-platform/
├── packages/
│   ├── core/               ← Backend (NestJS) ✅
│   ├── storefront/         ← Public Store (Next.js)
│   ├── tenant-admin/       ← Merchant Dashboard (Next.js)
│   ├── super-admin/        ← HQ Dashboard (Next.js)
│   └── marketing-site/     ← Landing Pages (Next.js)
└── docker-compose.yml
```

---

## 📅 الخطة التنفيذية المعتمدة (5 أسابيع)

### الأسبوع 1: التأسيس
- [ ] إنشاء الحزم الأربعة
- [ ] تثبيت shadcn/ui + Tailwind
- [ ] إعداد Design System (RTL + Arabic)

### الأسبوع 2: Storefront
- [ ] `/[tenantId]` — الرئيسية
- [ ] `/[tenantId]/shop` — المنتجات
- [ ] `/[tenantId]/p/[slug]` — تفاصيل المنتج
- [ ] `/[tenantId]/cart` و `/checkout`

### الأسبوع 3: Tenant Admin
- [ ] `/[tenantId]/admin` — Dashboard
- [ ] `/[tenantId]/admin/products` — المنتجات
- [ ] `/[tenantId]/admin/orders` — الطلبات

### الأسبوع 4: Super Admin
- [ ] `/hq` — Dashboard
- [ ] `/hq/tenants` — المستأجرين
- [ ] `/hq/licenses` — التراخيص

### الأسبوع 5: Demo Release
- [ ] صفحة تسويق أولية
- [ ] اختبارات نهائية
- [ ] توثيق
- [ ] **🚀 إطلاق Demo**

---

## 📌 الأوامر الفورية للتنفيذ

```bash
# 1. إنشاء الحزم
mkdir -p packages/{tenant-admin,super-admin,marketing-site}

# 2. تهيئة كل حزمة
cd packages/storefront && npx shadcn-ui@latest init
cd ../tenant-admin && npx shadcn-ui@latest init
cd ../super-admin && npx shadcn-ui@latest init
cd ../marketing-site && npx shadcn-ui@latest init

# 3. إضافة المكونات
npx shadcn-ui@latest add button input card table dropdown-menu tabs
```

---

## ✅ الخلاصة

| البند | القرار |
|-------|--------|
| **الخطة** | ✅ معتمدة |
| **التعديلات** | ✅ 4 تعديلات إلزامية |
| **الجدول الزمني** | ✅ 5 أسابيع |
| **الميزانية** | ✅ $0 (مجاني 100%) |

---

**التوقيع:** القائد الهندسي  
**التاريخ:** 2026-01-15  
**الحالة:** ✅ **معتمد للتنفيذ**
