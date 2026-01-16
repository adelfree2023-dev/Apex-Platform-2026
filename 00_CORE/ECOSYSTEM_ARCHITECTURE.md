# 🌐 Apex Platform Ecosystem Architecture
> **The Unified Theory of Connectivity**
> *How the 5 Projects Connect, Flow, and Govern each other.*

---

## 🏛️ The Hierarchy of Power (تسلسل السلطة)

The platform operates on a strict **Top-Down Authority Model**.

```mermaid
graph TD
    subgraph "God Mode (Infinite Governance)"
        SA[👑 Super Admin (HQ)]
        Audit[(Global Audit Log)]
        SA -->|Governs| Audit
    end

    subgraph "Public Gateway"
        MKT[📣 Marketing Site]
        MKT -->|Signups| SA
    end

    subgraph "Tenant Layer (The Engine)"
        SA -->|Creates & Suspends| TA[🏢 Tenant Admin]
        TA -->|Manages| DB[(Tenant DB Schema)]
    end

    subgraph "Customer Layer (The Face)"
        TA -->|Deploys| SF[🛍️ Storefront]
        TA -->|Deploys| APP[📱 Mobile App]
        
        SF -- Reads/Writes --> DB
        APP -- Reads/Writes --> DB
    end

    %% Connectivity Lines
    SA -.->|Impersonates| TA
    Audit -.->|Tracks| TA
    Audit -.->|Tracks| SF
```

---

## 🔗 The 5-Project Connection (دورة الحياة)

### 1. 📣 Marketing Site (`/`)
* **Role:** The Funnel Entry Point.
* **Connection:**
    *   User clicks "Start Free Trial".
    *   Hits `POST /api/public/register`.
    *   **Trigger:** Creates a "Pending Tenant" record in the Master DB.
    *   **Handoff:** Redirects user to **Super Admin** (or Tenant Admin directly if auto-approved).

### 2. 👑 Super Admin HQ (`/admin`)
* **Role:** The Executor & Creator.
* **Connection:**
    *   Receives the "Pending Tenant" from Marketing.
    *   **Action:** Approves/Activates the Tenant.
    *   **Technical Event:** Triggers `TenantsService.createSchema()` -> Creates `tenant_x_y` database schema.
    *   **Governance:** Can hit the "Panic Button" (Suspend Tenant) -> Instantly kills access for Tenant Admin, Storefront, and Mobile App.

### 3. 🏢 Tenant Admin (`/dashboard`)
* **Role:** The Manager.
* **Connection:**
    *   Born from the Super Admin.
    *   Logs in via Shared Auth (JWT) looking at `tenant_x_y` schema.
    *   **Action:** Adds Products, Configures Settings.
    *   **Output:** Updates the `tenant_x_y` DB which feeds the endpoints.

### 4. 🛍️ Storefront & 5. 📱 Mobile App
* **Role:** The Consumers (Twin Heads).
* **Connection:**
    *   They are **Dumb Terminals** (Stateless).
    *   They connect to the **Same API** (`/shop-api`).
    *   **Routing:** 
        *   Request comes in: `store.apex.com`.
        *   Middleware detects Subdomain -> Resolves ID -> Selects `tenant_x_y` Schema.
        *   Serves data specific to that tenant.
    *   **Synchronization:** Real-time. If Tenant Admin adds a product, both Storefront and Mobile App see it instantly because they query the same source.

---

## ⚔️ Infinite Governance (الحوكمة اللامتناهية)

How we ensure total control at every level:

### 1. Global Audit Trail (The All-Seeing Eye)
*   **Layer:** Middleware (`AuditMiddleware`).
*   **Function:** Intercepts *every* write request (POST, PUT, DELETE) across ALL 5 projects.
*   **Storage:** Central `public.AuditLogs` table.
*   **Data Captured:** `Who` (Actor), `What` (Action), `Where` (Tenant), `When`.
*   **Visibility:** Super Admin sees EVERYTHING. Tenant Admin sees only their local logs.

### 2. Isolation Walls (The Bulkheads)
*   **Security:** Postgres Row-Level Security (RLS) & Schema Isolation.
*   **Guarantee:** Tenant A can *never* query Tenant B's data, even if the code has a bug. The Database Connection itself prevents it.

### 3. The Kill Switch (Sovereignty)
*   **Hierarchy:** Super Admin > Tenant Admin.
*   **Mechanism:** `TenantStatus` column in Master DB.
*   **Effect:** If Super Admin sets `status = SUSPENDED`:
    *   **Tenant Admin:** Login blocked ("Contact Support").
    *   **Storefront:** Redirection to `/suspended` page.
    *   **API:** Returns `403 Forbidden` instantly.

---

## 🛠️ Technical Implementation Strategy

### A. Shared Auth Service (Gatekeeper)
One central Auth service for everyone.
*   **User Types:** `SUPER_ADMIN`, `TENANT_ADMIN`, `CUSTOMER`.
*   **JWT Payload:** Contains `tenantId` and `role`.
*   **Guard:** `RolesGuard` checks permissions against the requested resource.

### B. Dynamic Module Loading
*   **Marketing & Super Admin:** Load `AppModule` with `GlobalScope`.
*   **Tenant Admin, Store, App:** Load `AppModule` with `TenantScope` (request-scoped dependency injection).

### C. Unified API Surface
Instead of building 5 APIs, we build **2 Core APIs**:
1.  **`admin-api`**: Powers Super Admin & Tenant Admin (protected by granular permissions).
2.  **`shop-api`**: Powers Storefront & Mobile App (public/customer auth).

---

> **Summary:** The 5 projects are not islands. They are organs in one body. The **Database** is the blood/memory, and the **Super Admin** is the brain/will.
