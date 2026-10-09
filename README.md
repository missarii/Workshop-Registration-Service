# 🎓 Workshop Hub — Registration Service

A production-grade, full-stack workshop registration and management platform for community training centres. Handles RBAC-secured user management, workshop scheduling across multiple locations, **race-condition-proof seat booking**, immutable registration history, and a complete audit trail — all in one Dockerized monorepo.

![Stack](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%206%20%7C%20TypeScript-blue)
![API](https://img.shields.io/badge/Backend-NestJS%2010%20%7C%20Prisma%206-green)
![DB](https://img.shields.io/badge/Database-PostgreSQL%2016-336791)
![Deploy](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED)

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗 Architecture](#-architecture)
- [🛠 Tech Stack & Tooling](#-tech-stack--tooling)
- [🔐 Security & Access Control](#-security--access-control)
- [⚡ Concurrency: How Overbooking Is Made Impossible](#-concurrency-how-overbooking-is-made-impossible)
- [🗄 Data Model](#-data-model)
- [🚀 Scaling Roadmap: Kafka · RabbitMQ · Cron](#-scaling-roadmap-kafka--rabbitmq--cron)
- [💻 Quick Start](#-quick-start)
- [🔑 Demo Accounts](#-demo-accounts)
- [📚 API Reference](#-api-reference)
- [🧪 Development Mode](#-development-mode)
- [📁 Project Structure](#-project-structure)

---

## 🛠 Tech Stack & Tooling

### Backend

| Technology | Version | Why chosen |
|---|---|---|
| NestJS | 10 | Modular DI maps 1:1 to business domains; guards/pipes make RBAC + validation declarative |
| Prisma ORM | 6 | Type-safe queries, code-first schema, transaction + raw-SQL escape hatch for atomic seat updates |
| PostgreSQL | 16-alpine | ACID transactions + atomic conditional updates = the overbooking guarantee |
| Passport + JWT | — | Stateless bearer auth on every controller |
| Argon2 | — | Memory-hard password hashing (beats bcrypt/scrypt vs GPU cracking) |
| class-validator | — | DTO enforcement at the boundary (whitelist + forbidNonWhitelisted) |
| Throttler | 6 | 100 req/min global rate limit against brute-force abuse |
| Swagger | 7 | Living API docs from decorators, zero maintenance |
| ts-node | 10 | Runs the seed script without a separate build step |

### Frontend

| Technology | Version | Why chosen |
|---|---|---|
| React + Vite | 19 / 6 | Instant HMR dev loop, tiny Nginx-served prod bundles |
| TypeScript (strict) | 5.8 | Domain types mirror the API; tsc gates every build |
| React Router | 7 | Declarative protected routes per role |
| TanStack Query | 5 | Server-state caching, background refetch, mutation invalidation |
| Axios | 1.8 | JWT attach + 401 auto-logout via interceptors |
| react-hook-form + zod | 7 / 3 | Schema-driven forms, errors colocated with fields |
| date-fns | 4 | Lightweight date formatting |
| lucide-react | — | Tree-shakeable icons |
| Vanilla CSS | — | Custom glassmorphism design system, zero framework weight |

### DevOps & Tooling

| Technology | Purpose |
|---|---|
| Docker + Compose | Multi-stage builds; health-gated startup; persistent PG volume |
| pnpm workspaces | Fast monorepo installs with strict dependency isolation |
| Swagger UI | Interactive explorer at /api/docs |

---

## 🔐 Security & Access Control

No public signup. The seed creates the first Admin; Admins create everyone else.

| Capability | Admin | Manager | Staff |
|---|---|---|---|
| Create / edit users and roles | Yes | 403 | 403 |
| Create / edit / cancel workshops | 403 | Yes | 403 |
| Register / cancel attendees | 403 | Yes | Yes |
| View workshops, registrations, history | 403 | Yes | Yes |
| View audit log | Yes | Yes | 403 |

Defence in depth: backend guards are authoritative (401/403); the UI mirrors them with hasRole() so staff never see forbidden actions; ValidationPipe strips unknown fields; Argon2 hashes; JWT 8h expiry; rate limiting; deactivated users cannot log in.

---

## ⚡ Concurrency: How Overbooking Is Made Impossible

The client rule — a workshop can never hold more active registrations than its capacity — is enforced in SQL, not application logic. The seat is reserved only if one is free, atomically, inside a single Prisma transaction (conditional increment, then registration insert, then audit insert). If the UPDATE touches 0 rows the workshop is full and the API returns 409 Conflict. Two staff promising the last seat at once? The database serializes the updates — one wins, one gets a clean Workshop is full error. No locks, no queues, no race window.

Cancels are equally safe: an updateMany with a status=ACTIVE condition flips the row so only the first of two concurrent cancels frees a seat, and duplicate emails are rejected by a partial unique index on workshopId + attendeeEmail + ACTIVE status.

---

## 🗄 Data Model

User one-to-many Registration many-to-one Workshop many-to-one Location. Attendees are just name + email on the registration (no accounts). Cancelled records are never deleted; registeredBy/cancelledBy plus timestamps preserve full history. Every mutation writes an AuditLog row (actor, action, entity, metadata JSON) in the same transaction.

---


## ✨ Features

| Area | What it does |
|---|---|
| **👥 Role-Based Access** | 3 roles (Admin / Manager / Staff). Admins manage users, Managers manage workshops, Staff handle front-desk registrations. Every rule is enforced **server-side**. |
| **📚 Workshop Catalogue** | Code, title, instructor, location (3 centres), date/time, capacity, live seat counts, status (`SCHEDULED` / `CANCELLED` / `COMPLETED`). |
| **🎟 Bulletproof Registrations** | Atomic seat reservation — **overbooking is physically impossible**, even with 100 concurrent requests for the last seat. |
| **🧾 Immutable History** | Cancelling frees the seat but the record is **never deleted**. Full history shows who registered/cancelled whom and when. |
| **🔍 Smart Search & Filters** | Filter by status, location, date range, "available seats only", plus full-text search across code/title/instructor. |
| **📜 Audit Trail (Bonus)** | Every business action logged with actor, timestamp, and metadata. Viewable in the Audit Log UI. |
| **📋 Waitlist-Ready (Bonus)** | Schema already carries `WAITLISTED`, `waitlistPosition`, `WAITLIST_PROMOTED` — the promotion worker is the designed next step. |
| **❤️ Health Checks** | `GET /health` reports DB connectivity; Docker healthchecks with `depends_on: service_healthy` ordering. |
| **📖 Auto API Docs** | Swagger UI generated from decorators at `/api/docs`. |

---

## 🏗 Architecture

A **modular monorepo** (`pnpm workspaces`) — one `git clone` + `docker compose up` gives you the whole system:

```
┌──────────────────────────────────────────────────────────────┐
│                        Docker Compose                        │
│   ┌─────────┐      ┌─────────┐      ┌──────────┐              │
│   │   web   │─────▶│   api   │─────▶│ postgres │              │
│   │ React + │ REST │ NestJS  │ SQL  │ PG 16    │              │
│   │ Nginx   │ JSON │ :3001   │      │ volume   │              │
│   │ :3000   │      │         │      │          │              │
│   └─────────┘      └─────────┘      └──────────┘              │
└──────────────────────────────────────────────────────────────┘
```

| Layer | Role | Key patterns |
|---|---|---|
| **Frontend** (`apps/web`) | Staff-facing SPA. Route-guarded pages, React Query caching, `zod` + `react-hook-form` validation. | Protected routes, `hasRole()` gating, Axios JWT interceptor |
| **Backend** (`apps/api`) | Stateless REST API. One NestJS module per domain: `Auth`, `Users`, `Workshops`, `Registrations`, `Audit`, `Health`. | Controllers → Services → Prisma; DTOs with `class-validator`; `@Roles()` + `RolesGuard` |
| **Database** (`prisma/`) | Single source of truth. Counter-cache `reservedSeats`, partial unique index against duplicates. | `db push`, idempotent seed |
| **Infra** (`docker-compose*.yml`, Dockerfiles) | Reproducible builds: multi-stage images, health-gated startup, zero-manual-step boot. | `entrypoint.sh`: db push → seed → serve |

### Request lifecycle (registration)

```
Staff UI → POST /workshops/:id/registrations (JWT)
  → AuthGuard → RolesGuard (MANAGER/STAFF?) → ValidationPipe (DTO?)
  → RegistrationsService.create() → Prisma $transaction:
      1. UPDATE workshops SET reserved_seats+1 WHERE … AND reserved_seats < capacity
      2. INSERT registration (unique index guards duplicates)
      3. INSERT audit log
  → 201 Created | 409 Full | 409 Duplicate
```

### Why this architecture?

1. **Monorepo over microservices** — one team, one deployable; the shared Prisma schema is the contract, so no version drift between API and DB.
2. **PostgreSQL as the concurrency primitive** — the DB is already a correct distributed lock; a message broker would add failure modes without adding safety at this scale.
3. **Stateless API + stateful DB** — API containers scale horizontally; correctness lives in SQL transactions, not in-memory locks.
4. **Counter-cache (`reservedSeats`)** — O(1) availability checks under contention; kept consistent inside the same transaction that mutates registrations.
5. **Self-booting containers** — `entrypoint.sh` means reviewers run one command and get a working system with demo data. No setup-step tax.
