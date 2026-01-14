# 📄 APEX_PLATFORM_CONTEXT.md  
**الوثيقة الأم — حجر الأساس غير القابل للتغيير**  
**تاريخ الإصدار**: 14 يناير 2026  
**الحالة**: ✅ مُعتمد — لا يُعدّل، لا يُناقش، لا يُتجاهل  

---

## 🎯 الرؤية الاستراتيجية

> **Apex Platform ليس "منصة e-commerce".  
> بل نظام تشغيل للاقتصاد المحلي الرقمي — يربط التجار، العملاء، والمسوّقين في شبكة تعاون ذكية.**

- **الهدف النهائي**: تمكين أي كيان (تاجر عسل، دكتور أسنان، أكاديمية تعليمية) من بناء متجره في دقائق، مع عزل تام، وحوكمة مركزية، وقدرة على التعاون مع آخرين دون منافسة.
- **التميّز**: لا نبيع "موقعًا" — نبيع **كيانًا رقميًا مستقلًا** ينمو مع صاحبه.

---

## 🔷 المرحلة 1: العزل المطلق (Isolation First)

### ⚙️ المبدأ الهندسي:
> **كل متجر = دولة رقمية صغيرة — لها حدودها، هويتها، وبياناتها.**

### ✅ التنفيذ الإلزامي:
| البند | التفاصيل |
|------|----------|
| **نموذج العزل** | Schema-per-Tenant في PostgreSQL (ليس Row-per-Tenant) |
| **الهوية الرقمية** | Subdomain فريد + SPF/DKIM لكل متجر (`noreply@store.apex-platform.com`) |
| **الدفع** | Stripe Connect Standard Account منفصل لكل متجر |
| **السياق** | Tenant Context يُحقن تلقائيًا من subdomain — لا يمكن الوصول إلى DB دونه |
| **الذاكرة المؤقتة** | Redis key prefix = `tenant:xyz123` |
| **السجلات** | كل حدث يُسجّل مع `tenantId` — لا يمكن تتبع الأخطاء دونه |

### 🚫 ما لا يُسمح به:
- أي جدول تجاري مشترك بين المتاجر.
- أي query بدون سياق tenant.
- أي استخدام لـ `tenantId` كـ WHERE clause — لأن العزل مطلق.

---

## 🔷 المرحلة 2: الذكاء التعاوني (Cooperative Intelligence)

### ⚙️ المبدأ الاستراتيجي:
> **لا نبني الذكاء — نزرع بذوره منذ اليوم الأول.**

### ✅ البنية التحتية المطلوبة الآن:
| البند | التفاصيل |
|------|----------|
| **Event Sourcing** | كل تفاعل (عرض منتج، شراء، تقييم) يُسجّل كـ Event مع:<br>– `territory` (e.g., "maadi")<br>– `specializationTags` (e.g., ["breakfast", "natural"])<br>– `businessType` (RETAIL, SERVICE, EDUCATION) |
| **Product Schema** | يحتوي على:<br>– `cooperativeEligible: boolean`<br>– `replenishmentLeadTime: number`<br>– `qualityScore: number` (يُحسب آليًا) |
| **Order Model** | يدعم **Fulfillment Groups** — طلب واحد من عدة تجار |
| **Tenant Profile** | يحتوي على:<br>– `territory`<br>– `cooperationPreference`<br>– `fulfillmentRadius` |

### 🚫 ما لا نفعله الآن:
- لا ندمج LLMs.
- لا نبني واجهة دردشة.
- لا نضيف "توصيات" — نكتفي بجمع البيانات بالشكل الصحيح.

---

## 🔷 المرحلة 3: الحوكمة المركزية (Central Governance)

### ⚙️ المبدأ التشغيلي:
> **Super Admin = مجلس أمن دولي — يراقب، لا يتدخل.**

### ✅ الآليات الإلزامية:
| البند | التفاصيل |
|------|----------|
| **Impersonation Mode** | Super Admin يدخل كتاجر — مع شريط تحذيري دائم، وتسجيل كل إجراء |
| **Suspension Flow** | عند تعليق متجر → يظهر `/suspended` احترافي — لا يُهين، يُرشد |
| **Audit Log** | كل حدث يُسجّل مع:<br>– من؟<br>– ماذا؟<br>– لأي متجر؟<br>– من أي IP؟ |
| **Break-Glass Protocol** | أي إجراء حساس (حذف، تعليق) يتطلب:<br>– موافقة ثانية<br>– تأخير زمني (15 دقيقة)<br>– تنبيه فوري |

### 🚫 ما لا يُسمح به:
- أي إجراء من Super Admin دون تسجيل.
- أي صفحة خطأ تُظهر تفاصيل تقنية للعميل.
- أي تدخل مباشر في بيانات المتجر دون موافقة.

---

## 🧱 البنية التقنية الأساسية (لا تُناقش)

| الطبقة | التقنية | السبب |
|--------|---------|--------|
| **Backend** | NestJS + Prisma + PostgreSQL | Type-safe, modular, يدعم Schema-per-Tenant |
| **Frontend** | Next.js 14 (App Router) + shadcn/ui | SSR, Dynamic Imports, Theming Ready |
| **Mobile** | React Native + Expo | Code sharing, OTA updates |
| **Payments** | Stripe Connect | Isolated accounts, native subscriptions |
| **Infra** | Docker Compose → Kubernetes | Dev → Prod seamless |
| **Monitoring** | Sentry + Prometheus + Loki | Centralized logging |

---

## 📌 الخلاصة: 3 قواعد ذهبية

1. **العزل ليس ميزة — بل شرط وجود.**  
   إذا لم يكن Schema-per-Tenant، فالنظام فاشل.

2. **الذكاء لا يُبنى — بل يُزرع.**  
   إذا لم تُسجّل Events مع `territory` و `specializationTags`، فالتعاون مستحيل.

3. **الحوكمة ليست تدخل — بل رؤية.**  
   إذا لم يكن Impersonation Mode + Audit Log، فالنظام غير قابل للتشغيل.

---
