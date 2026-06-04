---
description: "Task list for Avimus Connect — Plataforma de Gerenciamento WhatsApp Multi-Tenant"
---

# Tasks: Avimus Connect — Plataforma de Gerenciamento WhatsApp Multi-Tenant

**Input**: Design documents from `specs/001-wppconnect-saas/`

**Prerequisites**: plan.md | spec.md | research.md | data-model.md | contracts/

**Tests**: Nao solicitados na spec — tarefas de teste nao incluidas.

**Organization**: Tarefas agrupadas por user story para implementacao e validacao independentes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependencias)
- **[Story]**: User story da tarefa (US1-US4)
- Todos os caminhos de arquivo sao relativos a raiz do repositorio

---

## Phase 1: Setup (Inicializacao do Projeto)

**Purpose**: Criar estrutura de pastas e inicializar projetos backend e frontend.

- [x] T001 Criar estrutura de diretorios do monorepo: `backend/` e `frontend/` na raiz do repositorio
- [x] T002 [P] Inicializar projeto Node.js TypeScript com Express em `backend/package.json`
- [x] T003 [P] Inicializar projeto Next.js 14 com TypeScript em `frontend/package.json`
- [x] T004 [P] Configurar `backend/tsconfig.json` com strict mode e paths
- [x] T005 [P] Configurar `frontend/tsconfig.json` e `frontend/tailwind.config.ts` com Montserrat e design tokens

---

## Phase 2: Foundational (Infraestrutura Bloqueante)

**Purpose**: Banco de dados, middleware de auth/tenant e utilitarios compartilhados.

**CRITICO**: Nenhuma user story pode comecar ate esta fase estar completa.

- [x] T006 Definir todos os 5 modelos Prisma (Tenant, User, InviteToken, Instance, EventLog) em `backend/prisma/schema.prisma`
- [ ] T007 Criar e aplicar migration inicial: `npx prisma migrate dev --name init` *(requer DATABASE_URL configurado)*
- [x] T008 [P] Criar modulo de configuracao de environment em `backend/src/config/env.ts`
- [x] T009 [P] Criar singleton do Prisma Client em `backend/src/config/db.ts`
- [x] T010 [P] Criar utilitarios JWT (signToken, verifyToken) em `backend/src/config/jwt.ts`
- [x] T011 Criar middleware de autenticacao JWT em `backend/src/middleware/auth.ts`
- [x] T012 Criar middleware de contexto de tenant em `backend/src/middleware/tenant.ts` *(incorporado em auth.ts como requireClient)*
- [x] T013 [P] Criar wrapper de validacao Zod em `backend/src/middleware/validate.ts`
- [x] T014 [P] Criar middleware de erro global em `backend/src/middleware/error.ts`
- [x] T015 Criar entry point Express em `backend/src/index.ts`
- [x] T016 [P] Criar script de seed do Admin em `backend/src/seeds/admin.seed.ts`
- [x] T017 [P] Criar servico de API do frontend em `frontend/src/services/api.ts`
- [x] T018 [P] Criar design tokens em `frontend/src/styles/tokens.ts`
- [x] T019 Configurar CSS global dark theme em `frontend/src/styles/globals.css` e `frontend/src/app/layout.tsx`

**Checkpoint**: Banco criado, migrations aplicadas, seed executado, servidor Express iniciando sem erros.

---

## Phase 3: User Story 1 — Onboarding Completo (Priority: P1) MVP

**Goal**: Admin cria cliente, sistema envia convite por email, cliente ativa conta e acessa painel.

**Independent Test**: Criar cliente via POST /admin/clients -> verificar email -> clicar no link -> definir senha -> logar como cliente e acessar `/client/instances` (retorna array vazio).

### Implementation for User Story 1

- [x] T020 [P] [US1] Implementar TenantService em `backend/src/services/tenant.service.ts`
- [x] T021 [P] [US1] Implementar InviteService em `backend/src/services/invite.service.ts`
- [x] T022 [P] [US1] Implementar EmailService com Resend SDK em `backend/src/services/email.service.ts`
- [x] T023 [US1] Implementar auth routes em `backend/src/routes/auth.routes.ts`
- [x] T024 [US1] Implementar admin clients routes em `backend/src/routes/admin/clients.routes.ts`
- [x] T025 [US1] Conectar routers em `backend/src/index.ts`
- [x] T026 [P] [US1] Criar pagina de Login em `frontend/src/app/(auth)/login/page.tsx`
- [x] T027 [P] [US1] Criar pagina de Ativacao de Conta em `frontend/src/app/(auth)/activate/[token]/page.tsx`
- [x] T028 [US1] Criar hook useAuth em `frontend/src/hooks/useAuth.ts`
- [x] T029 [US1] Criar Admin layout em `frontend/src/app/admin/layout.tsx`
- [x] T030 [US1] Criar pagina Admin Clientes em `frontend/src/app/admin/clients/page.tsx`
- [x] T031 [US1] Criar pagina de detalhe do Cliente Admin em `frontend/src/app/admin/clients/[id]/page.tsx`

**Checkpoint**: Fluxo de onboarding completo funcional.

---

## Phase 4: User Story 2 — Admin Gerencia Instancias e Logs Globais (Priority: P2)

**Goal**: Admin cria instancias para clientes, visualiza painel consolidado e filtra log global.

**Independent Test**: Admin cria instancia -> aparece no dashboard -> status via polling -> logs filtraveis.

### Implementation for User Story 2

- [x] T032 [P] [US2] Implementar InstanceService em `backend/src/services/instance.service.ts`
- [x] T033 [P] [US2] Implementar LogService em `backend/src/services/log.service.ts`
- [x] T034 [US2] Implementar admin instances routes em `backend/src/routes/admin/instances.routes.ts`
- [x] T035 [US2] Conectar router de admin instances em `backend/src/index.ts`
- [x] T036 [US2] Criar hook usePolling em `frontend/src/hooks/usePolling.ts`
- [x] T037 [P] [US2] Criar pagina Admin Dashboard em `frontend/src/app/admin/dashboard/page.tsx`
- [x] T038 [P] [US2] Criar pagina Admin Logs em `frontend/src/app/admin/logs/page.tsx`
- [x] T039 [P] [US2] Criar componente InstanceCard em `frontend/src/components/admin/InstanceCard.tsx`
- [x] T040 [P] [US2] Criar componente LogViewer em `frontend/src/components/admin/LogViewer.tsx`

**Checkpoint**: Admin ve todas as instancias, cria e deleta, filtra log global.

---

## Phase 5: User Story 3 — Cliente Gerencia Instancias e Escaneia QR Code (Priority: P3)

**Goal**: Cliente acessa apenas suas instancias, reconecta e escaneia QR Code diretamente no painel.

**Independent Test**: Cliente loga -> ve apenas suas instancias -> clica "Reconectar" -> QR Code aparece em <=15s -> escaneia com celular -> status muda para "online".

### Implementation for User Story 3

- [x] T041 [P] [US3] Implementar WPPConnectService em `backend/src/services/wpp.service.ts`
- [x] T042 [US3] Implementar client instances routes em `backend/src/routes/client/instances.routes.ts`
- [x] T043 [US3] Conectar router de client em `backend/src/index.ts`
- [x] T044 [US3] Criar Client layout em `frontend/src/app/client/layout.tsx`
- [x] T045 [P] [US3] Criar pagina Client Instancias em `frontend/src/app/client/instances/page.tsx`
- [x] T046 [P] [US3] Criar pagina Client Logs em `frontend/src/app/client/logs/page.tsx`
- [x] T047 [P] [US3] Criar componente StatusBadge em `frontend/src/components/client/StatusBadge.tsx`
- [x] T048 [US3] Criar componente QRCodeModal em `frontend/src/components/client/QRCodeModal.tsx`

**Checkpoint**: Cliente loga, ve apenas suas instancias, reconecta e escaneia QR Code. Isolamento de tenant verificado.

---

## Phase 6: User Story 4 — Alertas Automaticos por Email quando Instancia Cai (Priority: P4)

**Goal**: Sistema detecta queda de instancia e envia email de alerta com cooldown de 10 minutos.

**Independent Test**: Com instancia online, simular desconexao -> email de alerta chega em <=2 minutos -> cooldown impede segundo email em <10min.

### Implementation for User Story 4

- [x] T049 [P] [US4] Adicionar sendAlertEmail em `backend/src/services/email.service.ts`
- [x] T050 [US4] Implementar AlertService em `backend/src/services/alert.service.ts`
- [x] T051 [US4] Implementar polling job em `backend/src/jobs/polling.job.ts`
- [x] T052 [US4] Iniciar polling job em `backend/src/index.ts`

**Checkpoint**: Polling a cada 30s, email de alerta com cooldown de 10 min, status "unknown" nao dispara alerta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Seguranca de rotas no frontend, containerizacao e validacao final.

- [x] T053 [P] Criar route protection middleware em `frontend/src/middleware.ts`
- [x] T054 [P] CORS configurado em `backend/src/index.ts` (origem APP_URL)
- [x] T055 [P] Criar `backend/Dockerfile` (multi-stage build)
- [x] T056 [P] Criar `frontend/Dockerfile` (multi-stage + standalone)
- [ ] T057 Executar validacao end-to-end do fluxo de onboarding conforme `specs/001-wppconnect-saas/quickstart.md` *(requer ambiente configurado)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependencias
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as user stories
- **US1 (Phase 3)**: Depende do Foundational
- **US2 (Phase 4)**: Depende do Foundational
- **US3 (Phase 5)**: Depende do Foundational + US2
- **US4 (Phase 6)**: Depende de US3
- **Polish (Phase 7)**: Depende de todas as stories

### Notes

- `[P]` = arquivos diferentes, sem dependencias na mesma fase
- `[USn]` = mapeia a user story para rastreabilidade com spec.md
- Todo service recebe `tenantId` como parametro explicito
- Todo endpoint de cliente retorna 403 (nao 404) para recursos de outro tenant
- T007 e T057 requerem ambiente configurado (DATABASE_URL, env vars)
