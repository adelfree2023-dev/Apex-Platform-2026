# 🕵️ Pages Technical Audit - Apex Platform

> **Audit Date:** January 16, 2026
> **Objective:** Detailed technical verification of every page against the 5-layer architecture.
> **Note on Frontend:** All current frontend implementations are marked as **Experimental (X)** and scheduled for replacement.

## 📊 Status Legend
- ✅ = **Verified & Ready** (Implemented in Core/Prisma)
- ⚠️ = **Partial / In Progress** (Exists but needs expansion)
- ❌ = **Missing** (Not started yet)
- 🚫 = **Experimental (X)** (To be deleted/replaced - Frontend focus)

---

## 1️⃣ Super Admin Dashboard (HQ) - 36+ Pages
*Central control panel for platform administration.*

| Page Route | 🔙 Backend | 🎨 Frontend (X) | 🗄️ Database | 🔌 API | 🔒 Security |
|------------|------------|-----------------|-------------|--------|-------------|
| **Dashboard** |
| `/admin/dashboard` | ⚠️ Partial | 🚫 Experimental | ⚠️ Partial | ⚠️ Partial | ✅ JWT/RBAC |
| **Tenants** |
| `/admin/tenants` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| `/admin/tenants/:id` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| `/admin/tenants/new` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| `/admin/tenants/suspend`| ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| **Licenses** |
| `/admin/licenses` | ⚠️ Partial | 🚫 Experimental | ✅ Ready | ⚠️ Partial | ✅ RBAC |
| `/admin/licenses/new` | ⚠️ Partial | 🚫 Experimental | ✅ Ready | ⚠️ Partial | ✅ RBAC |
| `/admin/licenses/:key` | ⚠️ Partial | 🚫 Experimental | ✅ Ready | ⚠️ Partial | ✅ RBAC |
| **Plans & Pricing** |
| `/admin/plans` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| `/admin/plans/:id/edit`| ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| **Billing (Platform)** |
| `/admin/billing` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/admin/billing/invoices`| ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/admin/billing/payments`| ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Analytics** |
| `/admin/analytics` | ⚠️ Partial | 🚫 Experimental | ⚠️ Partial | ⚠️ Partial | ✅ RBAC |
| `/admin/reports` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Users** |
| `/admin/users` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| `/admin/users/:id` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ RBAC |
| **Settings** |
| `/admin/settings` | ❌ Missing | 🚫 Experimental | ⚠️ Partial | ❌ Missing | ✅ RBAC |
| `/admin/settings/email` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/admin/audit` | ⚠️ Partial | 🚫 Experimental | ✅ Ready | ⚠️ Partial | ✅ RBAC |

---

## 2️⃣ Marketing Site - 15+ Pages
*Public facing landing and information pages.*

| Page Route | 🔙 Backend | 🎨 Frontend (X) | 🗄️ Database | 🔌 API | 🔒 Security |
|------------|------------|-----------------|-------------|--------|-------------|
| **Public** |
| `/` (Homepage) | N/A | 🚫 Experimental | N/A | N/A | ✅ SSL/Public |
| `/pricing` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Public |
| `/features` | N/A | 🚫 Experimental | N/A | N/A | ✅ Public |
| `/about` | N/A | 🚫 Experimental | N/A | N/A | ✅ Public |
| `/contact` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Content** |
| `/blog` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/blog/:slug` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/docs` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Auth** |
| `/login` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/register` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/forgot-password` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/reset-password` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| **Legal** |
| `/terms` | N/A | 🚫 Experimental | N/A | N/A | ✅ Public |
| `/privacy` | N/A | 🚫 Experimental | N/A | N/A | ✅ Public |

---

## 3️⃣ Tenant Admin Dashboard - 42+ Pages
*Store management interface for merchants.*

| Page Route | 🔙 Backend | 🎨 Frontend (X) | 🗄️ Database | 🔌 API | 🔒 Security |
|------------|------------|-----------------|-------------|--------|-------------|
| **Dashboard** |
| `/dashboard` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| **Products** |
| `/products` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/products/new` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/products/:id/edit` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/products/categories` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| **Orders** |
| `/orders` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/orders/:id` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| **Customers** |
| `/customers` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/customers/:id` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| **Marketing** |
| `/marketing/discounts` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/marketing/emails` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Settings** |
| `/settings/general` | ❌ Missing | 🚫 Experimental | ✅ Ready | ❌ Missing | ✅ Isolated |
| `/settings/payment` | ⚠️ Partial | 🚫 Experimental | ✅ Ready | ⚠️ Partial | ✅ Isolated |
| `/settings/shipping` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Isolated |
| `/settings/theme` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| `/settings/domains` | ❌ Missing | 🚫 Experimental | ✅ Ready | ❌ Missing | ✅ Isolated |
| `/settings/developers` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |

---

## 4️⃣ Storefront - 29+ Pages
*Customer shopping experience (Headless).*

| Page Route | 🔙 Backend | 🎨 Frontend (X) | 🗄️ Database | 🔌 API | 🔒 Security |
|------------|------------|-----------------|-------------|--------|-------------|
| **Shop** |
| `/` (Store Home) | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Public |
| `/shop` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Public |
| `/product/:slug` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Public |
| `/cart` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Session |
| `/checkout` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Secure |
| `/checkout/success` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Session |
| **Customer Area** |
| `/account/login` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/account/orders` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/account/profile` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/wishlist` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `/track-order` | ❌ Missing | 🚫 Experimental | ❌ Missing | ❌ Missing | ❌ Missing |
| **Utils** |
| `/search` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Public |
| `/404` | N/A | 🚫 Experimental | N/A | N/A | ✅ Public |
| `/suspended` | N/A | 🚫 Experimental | ✅ Ready | N/A | ✅ Public |

---

## 5️⃣ Mobile App - 15+ Screens
*Native mobile experience.*

| Page Route | 🔙 Backend | 🎨 Frontend (X) | 🗄️ Database | 🔌 API | 🔒 Security |
|------------|------------|-----------------|-------------|--------|-------------|
| **Screens** |
| `Home` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `Product List` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `Product Detail` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `Cart` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `Checkout` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ Secure |
| `Profile` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |
| `Orders` | ✅ Ready | 🚫 Experimental | ✅ Ready | ✅ Ready | ✅ JWT |

---

## 📝 Summary of Gaps

### 🔥 Critical Missing Backend/APIs
1. **Billing Service:** No backend logic for calculating platform revenue, invoices, or payouts.
   - *Impact:* Super Admin cannot bill tenants.
2. **CMS/Content:** No logic for Blog, Pages, or Menus.
   - *Impact:* Marketing site and Tenant stores are static/hardcoded.
3. **Communication:** No Email/Notification service for campaigns.
   - *Impact:* No marketing emails or automated alerts.
4. **Theme Customization:** No logic to store/retrieve theme settings per tenant.
   - *Impact:* All stores look identical.

### 🎨 Frontend Action Item
> **"كل الفرونت تجريبي هنلغية اعمل علي X"**

All 137+ frontend pages are marked **🚫 Experimental (X)**.
**Next Step:** Delete existing experimental frontend code and rebuild using clean architecture (Next.js 14 / React Native) mapped to the verified Backend APIs.

---

> **Report Generated By:** Apex AI Agent
> **Based on:** `Pages.md` & Live Server Audit
