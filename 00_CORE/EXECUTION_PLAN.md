# 📋 Execution Plan - Backend & Frontend Core
> **Strategy:** Finish Backend Services -> Build Frontend from Scratch using Boilerplate.

---

## ⚙️ Core Rules
1.  🔒 **No Direct Edits to Legacy Core:** Additions only.
2.  📦 **Freeze Dependencies:** `package-lock.json` is sacred.
3.  ✅ **Test First:** No service without a spec file.
4.  📝 **Document:** Every major change gets a README entry.

---

# 🔙 Phase 1: Backend Completion (Immediate)
*Goal: Close the 3 missing backend gaps.*

## 1.1 License Service (Day 1)
| Task | File | Test Status |
|------|------|-------------|
| Expand `generateLicense` | `licenses.service.ts` | ⚠️ Partial |
| Add `validateLicense` | New Method | ❌ Missing |
| Add `revokeLicense` | New Method | ❌ Missing |

## 1.2 Billing Service (Day 2-3)
| Task | File | Test Status |
|------|------|-------------|
| Create `BillingService` | `billing.service.ts` | ❌ Missing |
| Stripe Invoicing | Integration | ❌ Missing |
| `recordTransaction` | Method | ❌ Missing |

## 1.3 Reports Service (Day 4)
| Task | File | Test Status |
|------|------|-------------|
| Create `ReportsService` | `reports.service.ts` | ❌ Missing |
| `generateTenantReport` | Method | ❌ Missing |
| `generateRevenueReport` | Method | ❌ Missing |

---

# 🎨 Phase 2: Frontend Revolution (The Big Fix)
*Goal: Replace experimental/missing frontend with shadcn/ui boilerplates.*

> **Tech Stack:** Next.js 14 + shadcn/ui + Tailwind + Zod

## 2.1 Setup & Design System (Day 5-6)
- [ ] Initialize `shadcn/ui` in `packages/storefront`
- [ ] Setup RTL Support (Cairo/Tajawal Fonts)
- [ ] Create Core Components (Button, Card, Table, Modal)
- [ ] Implement Layouts (Header, Footer, Sidebar)

## 2.2 Storefront Pages (Day 7-12)
*Public Customer Experience*
| Page | Route | Status |
|------|-------|--------|
| **Home** | `/` | � Rebuild |
| **Product List** | `/shop` | ❌ Missing |
| **Product Detail** | `/p/[slug]` | ❌ Missing |
| **Cart & Checkout** | `/cart`, `/checkout` | � Refactor |
| **Account** | `/account/*` | ❌ Missing |

## 2.3 Tenant Admin Dashboard (Day 13-20)
*Merchant Management Interface*
| Page | Route | Status |
|------|-------|--------|
| **Dashboard** | `/dashboard` | ❌ Missing |
| **Products CRUD** | `/products/*` | ❌ Missing |
| **Orders Manager** | `/orders/*` | ❌ Missing |
| **Settings** | `/settings` | ❌ Missing |

## 2.4 Super Admin HQ (Day 21-25)
*Platform Governance Interface*
| Page | Route | Status |
|------|-------|--------|
| **HQ Dashboard** | `/admin/dashboard` | ❌ Missing |
| **Tenant Manager** | `/admin/tenants` | ❌ Missing |
| **Billing & Audits** | `/admin/billing` | ❌ Missing |

---

# 🔒 Phase 3: Security Hardening (Ongoing)
- [ ] **2FA for Super Admins:** Integrate TOTP.
- [ ] **Expanded Audit Logs:** Log every write action.
- [ ] **Rate Limiting:** Tuning per tenant.

---

# 📅 Timeline Summary
| Phase | Duration | Start Week |
|-------|----------|------------|
| **Backend Gaps** | 1 Week | Week 1 |
| **Frontend Setup** | 1 Week | Week 2 |
| **Storefront Build** | 1 Week | Week 3 |
| **Admin Dashboards** | 2 Weeks | Week 4-5 |
| **Launch Demo** | - | **End of Week 5** |

---

> **Ready to Execute?** Start with Phase 1.1.
