# Quickstart: Ávimus Connect — Dev Local

**Branch**: `001-wppconnect-saas` | **Data**: 2026-06-03

## Pré-requisitos

- Node.js 20 LTS
- PostgreSQL 15 (local ou Docker)
- Acesso ao servidor WPPConnect (`http://34.171.150.35:21465`)
- Conta Resend com API key

---

## 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd avimus-connect

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

## 2. Configurar variáveis de ambiente

### Backend (`backend/.env`)

```env
# Banco de dados
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/avimus_connect"

# JWT
JWT_SECRET="seu-segredo-aqui-minimo-32-chars"
JWT_EXPIRY="24h"

# WPPConnect
WPP_BASE_URL="http://34.171.150.35:21465"
WPP_SECRET_KEY="seu-wpp-secret-key"

# Resend
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM="noreply@avimus.com.br"

# Admin seed
ADMIN_EMAIL="admin@avimus.com.br"
ADMIN_PASSWORD="SenhaAdmin123!"

# App
PORT=3001
NODE_ENV=development
APP_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

---

## 3. Criar banco de dados e executar migrations

```bash
cd backend

# Criar banco (se não existir)
createdb avimus_connect

# Executar migrations Prisma
npx prisma migrate dev

# Seed: criar conta admin
npm run seed
```

Após o seed, o Admin pode fazer login com as credenciais de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 4. Iniciar em modo desenvolvimento

```bash
# Terminal 1 — Backend (hot reload)
cd backend && npm run dev

# Terminal 2 — Frontend (hot reload)
cd frontend && npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

---

## 5. Validação do ambiente

### Testar autenticação Admin

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@avimus.com.br","password":"SenhaAdmin123!"}'
# Esperado: 200 com token JWT
```

### Testar isolamento multi-tenant

```bash
# Criar cliente como Admin (salvar o ID retornado)
TOKEN="seu-jwt-admin"
curl -X POST http://localhost:3001/api/v1/admin/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@empresa.com","planType":"one"}'
```

### Testar polling (verificar logs do backend)

```bash
# O polling inicia automaticamente. Verificar no console:
# [polling] Verificando 0 instâncias...
# [polling] Ciclo concluído em Xms
```

---

## 6. Fluxo de onboarding completo (teste manual)

1. Admin cria cliente via `POST /admin/clients`
2. Verificar email de convite (em dev: checar logs do Resend ou usar `mailtrap`)
3. Clicar no link de ativação → `GET /auth/activate?token=xxx`
4. Definir senha → `POST /auth/activate`
5. Logar como cliente → `POST /auth/login`
6. Verificar que `GET /client/instances` retorna array vazio (sem instâncias ainda)

---

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Migration falha | Banco não existe | `createdb avimus_connect` |
| Seed falha | Env vars não configuradas | Verificar `backend/.env` |
| WPPConnect timeout | Servidor indisponível | Verificar `WPP_BASE_URL` e conectividade |
| Email não chega | API key Resend inválida | Verificar `RESEND_API_KEY` no dashboard Resend |
| JWT inválido | `JWT_SECRET` diferente entre restarts | Manter secret consistente; não alterar em prod |
