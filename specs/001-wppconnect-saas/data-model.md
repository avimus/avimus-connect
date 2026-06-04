# Data Model: Ávimus Connect

**Date**: 2026-06-03 | **Branch**: `001-wppconnect-saas`

---

## Entidades e Relacionamentos

```
tenants ──< users
tenants ──< invite_tokens
tenants ──< instances ──< event_logs
```

---

## Schema PostgreSQL (Prisma)

### tenants

Representa cada cliente (empresa/usuário) da plataforma. É a raiz do isolamento multi-tenant.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome do cliente/empresa |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email de acesso e contato |
| plan_type | VARCHAR(20) | NOT NULL, CHECK IN ('one','five','unlimited','custom') | Tipo de plano |
| plan_limit | INTEGER | NULL | Nulo = ilimitado; número = máximo de instâncias |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('active','inactive','pending') | Estado da conta |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Última atualização |

**Regra de negócio**: `plan_type = 'one'` → `plan_limit = 1`; `'five'` → `plan_limit = 5`;
`'unlimited'` → `plan_limit = NULL`; `'custom'` → `plan_limit = N` (definido pelo Admin).

---

### users

Pessoas que acessam a plataforma. O Admin tem `tenant_id = NULL` (conta de plataforma).

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | Identificador único |
| tenant_id | UUID | FK tenants(id), NULL (admin) | Tenant proprietário |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email de login |
| password_hash | VARCHAR(255) | NULL (até ativação) | Bcrypt hash, cost 12 |
| role | VARCHAR(10) | NOT NULL, CHECK IN ('admin','client') | Papel do usuário |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Última atualização |

**Regra de negócio**: `role = 'admin'` → `tenant_id = NULL`. `role = 'client'` → `tenant_id NOT NULL`.

---

### invite_tokens

Tokens de uso único para ativação de conta de clientes.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | Identificador único |
| tenant_id | UUID | NOT NULL, FK tenants(id) | Tenant do convite |
| token | VARCHAR(255) | UNIQUE, NOT NULL | UUID v4 gerado no backend |
| expires_at | TIMESTAMPTZ | NOT NULL | 72h após criação |
| used_at | TIMESTAMPTZ | NULL | Preenchido no primeiro uso |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |

**Regra de negócio**: Token válido se `used_at IS NULL AND expires_at > NOW()`.
Ao usar: `UPDATE invite_tokens SET used_at = NOW() WHERE token = $1`.

---

### instances

Cada sessão WhatsApp gerenciada pela plataforma.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | Identificador único |
| tenant_id | UUID | NOT NULL, FK tenants(id) | Tenant proprietário — OBRIGATÓRIO |
| name | VARCHAR(255) | NOT NULL | Nome amigável (ex: "Suporte Principal") |
| wpp_session_id | VARCHAR(255) | UNIQUE, NOT NULL | ID da sessão no WPPConnect |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'waiting_qr' | Estado atual |
| last_known_status | VARCHAR(20) | NULL | Status anterior — para detectar transições |
| last_alert_sent_at | TIMESTAMPTZ | NULL | Controle de cooldown de alertas (10 min) |
| last_polled_at | TIMESTAMPTZ | NULL | Último polling executado |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Última atualização |

**Status possíveis**: `online` | `offline` | `waiting_qr` | `error` | `unknown`

**Regra de alerta**: Enviar email SOMENTE se:
1. `last_known_status = 'online'` AND novo status = `'offline'`
2. `last_alert_sent_at IS NULL` OR `NOW() - last_alert_sent_at > INTERVAL '10 minutes'`

---

### event_logs

Registro imutável de eventos de instâncias. Nunca atualizado, apenas inserido.

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | Identificador único |
| instance_id | UUID | NOT NULL, FK instances(id) | Instância relacionada |
| tenant_id | UUID | NOT NULL | Denormalizado para queries de log por tenant |
| event_type | VARCHAR(30) | NOT NULL | Tipo do evento |
| occurred_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Quando ocorreu |
| details | JSONB | NULL | Dados extras (ex: motivo do erro) |

**Tipos de evento**: `connected` | `disconnected` | `qr_scanned` | `error` | `reconnect_attempt`

**`tenant_id` denormalizado** para evitar JOIN com `instances` em queries de log global (filtro
por tenant sem custo de join).

---

## Índices

```sql
-- Isolamento multi-tenant (queries mais frequentes)
CREATE INDEX idx_instances_tenant_id ON instances(tenant_id);
CREATE INDEX idx_event_logs_tenant_id ON event_logs(tenant_id);

-- Log queries (filtro por instância e ordem cronológica)
CREATE INDEX idx_event_logs_instance_id ON event_logs(instance_id);
CREATE INDEX idx_event_logs_occurred_at ON event_logs(occurred_at DESC);

-- Token lookup (ativação de conta)
CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);

-- Polling (busca instâncias a serem verificadas)
CREATE INDEX idx_instances_status ON instances(status) WHERE status != 'error';
```

---

## Prisma Schema (resumo)

```prisma
model Tenant {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String        @db.VarChar(255)
  email       String        @unique @db.VarChar(255)
  planType    String        @map("plan_type") @db.VarChar(20)
  planLimit   Int?          @map("plan_limit")
  status      String        @default("pending") @db.VarChar(20)
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  users       User[]
  invites     InviteToken[]
  instances   Instance[]
  @@map("tenants")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String?  @map("tenant_id") @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String?  @map("password_hash") @db.VarChar(255)
  role         String   @db.VarChar(10)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz
  tenant       Tenant?  @relation(fields: [tenantId], references: [id])
  @@map("users")
}

model InviteToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  token     String    @unique @db.VarChar(255)
  expiresAt DateTime  @map("expires_at") @db.Timestamptz
  usedAt    DateTime? @map("used_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  @@map("invite_tokens")
}

model Instance {
  id               String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId         String     @map("tenant_id") @db.Uuid
  name             String     @db.VarChar(255)
  wppSessionId     String     @unique @map("wpp_session_id") @db.VarChar(255)
  status           String     @default("waiting_qr") @db.VarChar(20)
  lastKnownStatus  String?    @map("last_known_status") @db.VarChar(20)
  lastAlertSentAt  DateTime?  @map("last_alert_sent_at") @db.Timestamptz
  lastPolledAt     DateTime?  @map("last_polled_at") @db.Timestamptz
  createdAt        DateTime   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime   @updatedAt @map("updated_at") @db.Timestamptz
  tenant           Tenant     @relation(fields: [tenantId], references: [id])
  eventLogs        EventLog[]
  @@map("instances")
}

model EventLog {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instanceId String   @map("instance_id") @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  eventType  String   @map("event_type") @db.VarChar(30)
  occurredAt DateTime @default(now()) @map("occurred_at") @db.Timestamptz
  details    Json?
  instance   Instance @relation(fields: [instanceId], references: [id])
  @@map("event_logs")
}
```

---

## State Machine: Instância WhatsApp

```
           [CRIADA]
               │
               ▼
         waiting_qr ◄──────────────────────────────┐
               │                                    │
    [QR escaneado / sessão conecta]      [reconectar disparado]
               │                                    │
               ▼                                    │
           online ──────[perde conexão]────► offline ──[tentativa falha]──► error
               │                                    │
          [desconecta]                    [Admin/Client reconecta]
               │                                    │
               ▼                                    │
           offline ─────────────────────────────────┘
               │
          [WPP down]
               │
               ▼
           unknown (transitório — não persiste alerta)
```
