# دليل مجلدات النظام (Core Modules Directory Guide)

هذا الجدول يلخص المجلدات الموجودة في [packages/core/src](file:///C:/Users/Dell/Desktop/Apex-Platform-2026/packages/core/src) مع توضيح وظائفها وكيفية اختبارها.

| المجلد (Folder) | عدد الملفات | الوظيفة الأساسية (Functions/Roles) | كيفية الاختبار (Testing) |
| :--- | :---: | :--- | :--- |
| **affiliates** | 5 | إدارة برامج التسويق بالعمولة وتتبع الإحالات. | `npm test src/affiliates` |
| **ai** | 5 | تكامل تطبيقات الذكاء الاصطناعي (Gemini/OpenAI) للمساعدة الذكية. | `npm test src/ai` |
| **analytics** | 9 | تتبع مؤشرات الأداء (KPIs) وتحليلات متقدمة (Pareto/RFM). | `npm test src/analytics` |
| **audit** | 3 | تسجيل العمليات للأغراض الأمنية والرقابية (Audit Logs). | `npm test src/audit` |
| **auth** | 9 | إدارة هويات المستخدمين، التشفير (JWT)، والدخول الاجتماعي. | `npm test src/auth` |
| **billing** | 2 | إصدار الفواتير وتسجيل المعاملات المالية للمستأجرين. | `npm test src/billing` |
| **bookings** | 5 | نظام حجز المواعيد والخدمات والخدمات المجدولة. | `npm test src/bookings` |
| **bundles** | 5 | منطق تجميع المنتجات (Product Bundling) والأسعار المجمعة. | `npm test src/bundles` |
| **common** | - | يحتوي على القوالب المشتركة (DTOs) والفلاتر (Filters). | لا يختبر منفرداً. |
| **csv** | 5 | عمليات استيراد وتصدير البيانات عبر ملفات Excel/CSV. | `npm test src/csv` |
| **events** | 3 | ناقل الأحداث الداخلي (Event Bus) لتسجيل النشاطات. | `npm test src/events` |
| **i18n** | 7 | إدارة الترجمات وتعدد اللغات وخدمات رسائل الـ SMS. | `npm test src/i18n` |
| **licenses** | 2 | إدارة تراخيص البرنامج وخطط الاشتراك للمستأجرين. | `npm test src/licenses` |
| **loyalty** | 5 | نظام نقاط الولاء والمكافآت للعملاء. | `npm test src/loyalty` |
| **marketplace** | 5 | إدارة السوق المتعدد التجار وقوائم المتاجر. | `npm test src/marketplace` |
| **middleware** | 2 | وسيط للتعرف على `tenantId` وحقن سياق العمل. | `npm test src/middleware` |
| **notifications** | 5 | إدارة التنبيهات والإشعارات داخل النظام. | `npm test src/notifications` |
| **payments** | 11 | تكامل بوابات الدفع (Stripe) ومنطق معالجة المدفوعات. | `npm test src/payments` |
| **prisma** | 3 | تعريف وإدارة الاتصال بقاعدة البيانات (ORM). | `npm test src/prisma` |
| **promotions** | 5 | الكوبونات، الخصومات، ونظام مراجعات المنتجات. | `npm test src/promotions` |
| **reports** | 5 | توليد تقارير الأرباح والمبيعات للمنصة والمستأجرين. | `npm test src/reports` |
| **rfq** | 5 | نظام طلبات عروض الأسعار (RFQ) وأسعار الجملة. | `npm test src/rfq` |
| **search** | 5 | محرك البحث عن المنتجات وفهرسة الكتالوج. | `npm test src/search` |
| **seo** | 5 | تحسين محركات البحث، الخرائط (Sitemaps)، والـ Robots. | `npm test src/seo` |
| **shipping** | 5 | إدارة طرق الشحن، التكاليف، وتتبع الشحنات. | `npm test src/shipping` |
| **subscriptions** | 5 | إدارة اشتراكات الـ SaaS وفوترة الخطط الشهرية. | `npm test src/subscriptions` |
| **super-admin** | 10 | إدارة المنصة ككل، إحصائيات النظام، وصلاحيات الـ HQ. | `npm test src/super-admin` |
| **tenants** | 6 | إنشاء المستأجرين الجدد وعزل بياناتهم (Schema Isolation). | `npm test src/tenants` |
| **vendors** | 10 | التكامل مع محرك Vendure ومزامنة البيانات الخارجية. | `npm test src/vendors` |
| **wishlists** | 6 | قوائم الأمنيات والمفضلات الخاصة بالعملاء. | `npm test src/wishlists` |
