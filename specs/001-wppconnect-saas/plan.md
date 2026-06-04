# Implementation Plan: Ávimus Connect — Plataforma de Gerenciamento WhatsApp Multi-Tenant

**Branch**: `001-wppconnect-saas` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-wppconnect-saas/spec.md`

## Summary

Plataforma SaaS multi-tenant para gerenciar instâncias WhatsApp via WPPConnect. O Admin cria
clientes com planos de instâncias, envia convites por email e gerencia todas as instâncias com
logs globais em tempo real. Clientes acessam apenas suas instâncias, reconectam e escaneiam QR
Code direto no painel. Sistema de alertas automáticos por email com cooldown de 10 minutos por
instância. Stack: Next.js + Node.js/Express + PostgreSQL + Resend + GCP.

## Technical Context

**Language/Version**: Node.js 20 LTS (backend) + TypeScript 5; Next.js 14 App Router (frontend) + TypeScript 5

**Primary Dependencies**:
- Backend: Express 4, Prisma 5 (ORM + migrations), jsonwebtoken, bcrypt, zod (validation), node-cron (polling scheduler), axios (WPPConnect HTTP calls), Resend SDK
- Frontend: Next.js 14, TailwindCSS, Framer Motion (glassmorphism animations), react-query (polling/cache), jose (JWT client-side decode)

**Storage**: PostgreSQL 15 — isolamento multi-tenant por `tenant_id` em todas as tabelas

**Testing**: Jest + Supertest (backend integration tests); sem testes de frontend em v1

**Target Platform**: GCP Cloud Run (backend + frontend como containers separados); Cloud SQL PostgreSQL; domínio custom via Cloud Load Balancer

**Project Type**: Web SaaS — frontend + backend desacoplados

**Performance Goals**: Polling ≤30s; QR Code exibido ≤15s; alertas de email ≤2min; resposta de API ≤500ms p95

**Constraints**: 50 clientes simultâneos com polling ativo; JWT expiration configurável via env; sem webhooks em v1 (polling apenas)

**Scale/Scope**: ~50 clientes, até ~250 instâncias totais (média 5 por cliente), 1 admin fixo

## Constitution Check

*GATE: Verificado antes de iniciar Phase 0. Re-verificado após Phase 1.*

| Princípio | Status | Verificação |
|-----------|--------|-------------|
| **I. UX Premium & Design System** | ✅ PASS | Dark background, `#775EFC`, Montserrat e glassmorphism são requisitos explícitos (spec Assumptions + FR). Design tokens serão centralizados em `frontend/src/styles/tokens.ts`. |
| **II. Multi-Tenancy First** | ✅ PASS | `tenant_id` presente em todas as tabelas (instances, event_logs, invite_tokens). Middleware `requireTenant` injeta contexto em toda rota autenticada. Prisma queries sempre filtradas por `where: { tenant_id }`. |
| **III. Security First** | ✅ PASS | JWT em todas as rotas protegidas (FR-001/005). Invite tokens de uso único invalidados no primeiro use (FR-003/004). Admin criado apenas via seed script com env vars — sem rota pública (FR-002a). Validação zod em todos os endpoints. |
| **IV. Clean & Scalable Code** | ✅ PASS | Camadas explícitas: routes → services → prisma. Sem repositórios abstratos desnecessários em v1. Polling job separado em `src/jobs/`. |
| **V. V1 Pragmatism — Core First** | ✅ PASS | Webhooks WPPConnect: deferred. Password recovery: deferred. Multi-admin: deferred. Polling fixo 30s: suficiente para v1. Sem cache layer adicional. |

**Resultado**: Nenhuma violação. Complexidade Tracking não necessário.

## Project Structure

### Documentation (this feature)

```text
specs/001-wppconnect-saas/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — WPPConnect API + decisões técnicas
├── data-model.md        # Phase 1 — Schema PostgreSQL + Prisma
├── quickstart.md        # Phase 1 — Setup dev local
├── contracts/
│   ├── auth.md          # Endpoints de autenticação
│   ├── admin-clients.md # Endpoints admin — gestão de clientes
│   ├── admin-instances.md # Endpoints admin — gestão de instâncias
│   ├── client-instances.md # Endpoints cliente — painel
│   └── logs.md          # Endpoints de logs
└── tasks.md             # Phase 2 — gerado por /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/          # env.ts, db.ts (Prisma client singleton), jwt.ts
│   ├── middleware/       # auth.ts (JWT verify), tenant.ts (inject tenant_id), validate.ts (zod)
│   ├── services/
│   │   ├── tenant.service.ts
│   │   ├── instance.service.ts
│   │   ├── wpp.service.ts      # HTTP calls to WPPConnect API
│   │   ├── alert.service.ts    # email alert logic + cooldown
│   │   └── log.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── admin/
│   │   │   ├── clients.routes.ts
│   │   │   └── instances.routes.ts
│   │   └── client/
│   │       ├── instances.routes.ts
│   │       └── logs.routes.ts
│   ├── jobs/
│   │   └── polling.job.ts      # node-cron 30s polling loop
│   ├── seeds/
│   │   └── admin.seed.ts       # cria conta admin via env vars
│   └── index.ts
├── tests/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── admin-clients.test.ts
│   │   └── tenant-isolation.test.ts
│   └── unit/
│       ├── alert.service.test.ts
│       └── wpp.service.test.ts
└── package.json

frontend/
├── src/
│   ├── app/             # Next.js 14 App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── activate/[token]/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx   # visão global instâncias
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx         # lista clientes
│   │   │   │   └── [id]/page.tsx    # detalhe + instâncias do cliente
│   │   │   └── logs/page.tsx        # log global
│   │   └── client/
│   │       ├── layout.tsx
│   │       ├── instances/page.tsx   # painel instâncias
│   │       └── logs/page.tsx
│   ├── components/
│   │   ├── ui/          # Button, Card, Badge, Input, Modal (glassmorphism)
│   │   ├── admin/       # ClientTable, InstanceCard, LogViewer
│   │   └── client/      # InstanceCard, QRCodeModal, StatusBadge
│   ├── hooks/
│   │   ├── usePolling.ts           # react-query refetch interval
│   │   └── useAuth.ts
│   ├── services/
│   │   └── api.ts                  # fetch wrapper com JWT header
│   └── styles/
│       ├── globals.css
│       └── tokens.ts               # design tokens: colors, fonts, shadows
└── package.json
```

**Structure Decision**: Web application (Option 2). Backend e frontend são projetos Node.js
independentes no mesmo repositório (monorepo simples sem workspace tooling em v1). Deploy
separado no GCP Cloud Run.

## Complexity Tracking

> Nenhuma violação de constituição identificada. Tabela não aplicável.
