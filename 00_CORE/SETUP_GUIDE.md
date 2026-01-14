# 🚀 Apex Platform — Complete Setup Guide

**Version:** 1.0  
**Date:** January 14, 2026  
**Status:** Production Ready

---

## 📦 Project Structure

```
Apex-Platform-2026/
├── packages/
│   ├── core/               # Backend (NestJS)
│   │   ├── src/
│   │   │   ├── tenants/    # Tenant management
│   │   │   ├── vendors/    # Vendure e-commerce
│   │   │   ├── payments/   # Payment gateway
│   │   │   ├── events/     # Event sourcing
│   │   │   └── prisma/     # Database
│   │   └── package.json
│   │
│   └── storefront/         # Frontend (Next.js)
│       ├── src/
│       │   ├── app/        # Pages
│       │   ├── components/ # UI Components
│       │   └── lib/        # API Client
│       └── package.json
│
├── tests/                  # Test scripts
├── 00_CORE/               # Documentation
└── README.md
```

---

## 🔧 Prerequisites

- **Node.js:** v20+ recommended
- **PostgreSQL:** v14+
- **Git:** Latest version

---

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/adelfree2023-dev/Apex-Platform-2026.git
cd Apex-Platform-2026
```

### 2. Backend Setup
```bash
cd packages/core
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate deploy

# Start backend
npm run start:dev
```

### 3. Frontend Setup
```bash
cd packages/storefront
npm install

# Start frontend
npm run dev -- -p 3002
```

---

## 🌐 Environment Variables

### Backend (packages/core/.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apex_saas"

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Server
PORT=3001
```

### Frontend (packages/storefront/.env.local)
```env
NEXT_PUBLIC_API_URL="http://34.102.65.89:3001"
```

---

## 📡 API Endpoints Reference

### Tenant Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tenants` | POST | Create tenant |
| `/api/tenants/:id` | GET | Get tenant |
| `/api/tenants/:id/migrate` | POST | Migrate tenant schema |

### Products
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/:tenantId/products` | GET | List products |
| `/api/shop/:tenantId/products` | POST | Create product |
| `/api/shop/:tenantId/products/search?q=` | GET | Search products |

### Categories
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/:tenantId/categories` | GET | List categories |
| `/api/shop/:tenantId/categories` | POST | Create category |
| `/api/shop/:tenantId/categories/:slug/products` | GET | Products by category |
| `/api/shop/:tenantId/migrate-categories` | POST | Create category table |

### Cart & Checkout
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/:tenantId/cart` | GET | Get cart |
| `/api/shop/:tenantId/cart` | POST | Add to cart |
| `/api/shop/:tenantId/cart/:itemId` | DELETE | Remove item |
| `/api/shop/:tenantId/checkout` | POST | Create order |

### Payments
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/:tenantId/payments/methods` | GET | List payment methods |
| `/api/shop/:tenantId/payments/process` | POST | Process payment |
| `/api/shop/:tenantId/payments/confirm` | POST | Confirm COD |

---

## 🏪 Frontend Pages

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/{tenantId}` | Product catalog |
| Cart | `/{tenantId}/cart` | Cart with checkout |
| Checkout Success | `/{tenantId}/checkout/success` | Order confirmation |
| Flash Sales | `/{tenantId}/flash-sales` | Flash sale deals |

---

## 🧪 Running Tests

```bash
cd ~/Apex-Platform-2026

# Quick tests (10 tests)
bash tests/run-quick-tests.sh

# Security tests
bash tests/security/security-tests.sh

# Failure tests
bash tests/failure/failure-tests.sh

# Load tests
bash tests/load/simple-load-test.sh
```

---

## 🛠️ Common Commands

### Create New Tenant
```bash
curl -X POST http://34.102.65.89:3001/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"My Store","territory":"cairo","businessType":"retail"}'
```

### Create Product
```bash
curl -X POST http://34.102.65.89:3001/api/shop/{tenantId}/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Product Name","slug":"product-name","price":100}'
```

### Create Category
```bash
curl -X POST http://34.102.65.89:3001/api/shop/{tenantId}/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Category Name","slug":"category-name"}'
```

### Migrate Tenant (add new tables)
```bash
curl -X POST http://34.102.65.89:3001/api/shop/{tenantId}/migrate-categories
```

---

## 📊 Phase Completion Status

| Phase | Feature | Status | Report |
|-------|---------|--------|--------|
| 01 | Vendor Integration | ✅ | `PHASE_01_REPORT.md` |
| 02 | Cart & Checkout | ✅ | `PHASE_02_REPORT.md` |
| 03 | Multi-Channel Payments | ✅ | `PHASE_03_REPORT.md` |
| 04 | Storefront Frontend | ✅ | `PHASE_04_REPORT.md` |
| 05 | Categories & Search | ✅ | `PHASE_05_REPORT.md` |
| 06 | Flash Sales Timer | ✅ | `PHASE_06_REPORT.md` |

---

## 🔒 Security Notes

1. **Tenant Isolation:** Each tenant has its own database schema (`tenant_xyz`)
2. **No Cross-Tenant Access:** All queries scoped to tenant schema
3. **SQL Injection:** Protected via parameterized queries
4. **CORS:** Configure for production domains

---

## 📝 Next Steps

- [ ] Phase 07: Gift Cards & Wallets
- [ ] Phase 08: Admin Dashboard
- [ ] Production deployment
- [ ] SSL/HTTPS configuration
- [ ] CDN for static assets

---

**Maintained By:** Apex Development Team  
**Last Updated:** January 14, 2026
