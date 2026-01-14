# Apex Platform 2026

Multi-tenant SaaS platform with Schema-per-Tenant isolation.

## Architecture

- **Backend**: NestJS + Prisma + PostgreSQL
- **Isolation**: Schema-per-Tenant (not Row-per-Tenant)
- **Events**: Event Sourcing with territory/businessType

## Quick Start

```bash
# Install dependencies
cd packages/core
npm install

# Start Docker infrastructure
cd infra
docker-compose up -d

# Run migrations
cd packages/core
npx prisma migrate deploy

# Start development server
npm run start:dev
```

## Structure

```
apex-platform/
├── packages/
│   ├── core/          # NestJS Backend
│   └── shared/        # Shared Types
├── infra/             # Docker, CI/CD
└── 00_CORE/           # Documentation
```

## Phase 00: Core Trinity ✅

- [x] Schema-per-Tenant isolation
- [x] Tenant middleware with subdomain injection
- [x] Event sourcing with payload sanitization
- [x] Docker infrastructure (PostgreSQL + Redis)
