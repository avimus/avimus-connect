# 📦 CONTEXTO — Avimus Connect
> Última atualização: Sprint 2 concluída | Deploy em produção

---

## 🧱 PROJETO

| Item | Valor |
|------|-------|
| Nome | avimus-connect |
| Repo | https://github.com/avimus/avimus-connect.git |
| Stack | Next.js 14 + Express + Prisma + PostgreSQL (Docker) + Resend |
| Local | `C:\Projetos\avimus-connect` |
| Modo | Homem das cavernas (respostas curtas e diretas) |

---

## 🌐 INFRAESTRUTURA

| Serviço | Endereço |
|---------|----------|
| Frontend (prod) | https://connect.avimus.com.br |
| Backend (prod) | https://connect.avimus.com.br/api/v1 |
| Swagger docs | https://connect.avimus.com.br/api/docs/ |
| WPPConnect | http://34.171.150.35:21465 |
| WPP Docs | http://34.171.150.35:21465/api-docs/#/ |
| VM prod | avimus-connect-vm / us-central1-a / IP: 34.31.134.203 |
| VM WPP | wpp-service-vm / us-central1-a / IP: 34.171.150.35 |
| GCP Project | avimus-connect |

### VM Produção
- OS: Ubuntu 22.04
- Node 20, Docker, Nginx, PM2
- PostgreSQL via Docker (`avimus-pg`)
- SSL via Certbot (Let's Encrypt) — expira 2026-09-02
- PM2 com auto-restart no boot

### Credenciais banco (VM)
```
User: avimus | Password: avimus123 | DB: avimus_connect
docker exec -it avimus-pg psql -U avimus -d avimus_connect
```

### Admin padrão
```
Email: avimushealthtech@gmail.com
Senha: (alterada via banco — password_hash na tabela users)
```

---

## 🔑 SECRETS / ENV

### Backend (`~/avimus-connect/backend/.env`)
```
DATABASE_URL=postgresql://avimus:avimus123@localhost:5432/avimus_connect
JWT_SECRET=avimus_jwt_secret_producao_2026
WPP_BASE_URL=http://34.171.150.35:21465
WPP_SECRET_KEY=THISISMYSECURETOKEN
RESEND_API_KEY=<chave real no servidor>
RESEND_FROM=noreply@avimus.com.br
APP_URL=https://connect.avimus.com.br
NODE_ENV=production
PORT=3001
ADMIN_EMAIL=avimushealthtech@gmail.com
ADMIN_PASSWORD=Admin@2026
ADMIN_NAME=Admin
```

### Frontend (`~/avimus-connect/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=https://connect.avimus.com.br/api/v1
```

---

## ✅ O QUE ESTÁ FUNCIONANDO

### Core
- [x] Auth JWT (admin + cliente/tenant)
- [x] QR Code flow completo (gerar → escanear → online → reconectar)
- [x] Polling de status das instâncias
- [x] Logs de eventos
- [x] Convites por email (Resend + domínio avimus.com.br verificado)
- [x] Ativação de conta via token

### API Externa
- [x] `GET /api/external/instances` — lista instâncias com sessionId + token
- [x] `GET /api/external/instances/:id`
- [x] `GET /api/external/clients`
- [x] `GET /api/external/clients/:id/instances`
- [x] `GET /api/external/metrics`
- [x] Auth via header `X-API-Key`
- [x] Swagger UI em `/api/docs`

### API Keys (Admin)
- [x] Criar / listar / revogar API Keys
- [x] Escopo: read | full
- [x] Página no painel admin com link para docs internas e WPPConnect
- [x] Token exibido uma vez com botão copiar

### Frontend
- [x] Dark mode / Light mode (next-themes)
- [x] Responsivo mobile (sidebar drawer, modais adaptados)
- [x] Identidade visual Ávimus (roxo #775EFC, glassmorphism, Montserrat)
- [x] Redirect `/` → `/login`

### Deploy
- [x] VM GCP provisionada
- [x] PostgreSQL Docker
- [x] PM2 gerenciando backend + frontend
- [x] Nginx como proxy reverso
- [x] HTTPS com Certbot
- [x] DNS `connect.avimus.com.br` apontando para VM

---

## 🚧 EM ANDAMENTO

- [ ] **Edição de clientes** — modal com nome/email + reenvio de convite + reset de senha (prompt enviado ao Claude Code, aguardando implementação)

---

## 📋 BACKLOG / PRÓXIMAS FEATURES

- [ ] Webhook para receber mensagens (entrada)
- [ ] Histórico de mensagens por instância
- [ ] Relatórios / métricas no painel admin
- [ ] Notificações em tempo real (WebSocket)
- [ ] Multi-admin (mais de um usuário admin)
- [ ] Planos / limites por tenant

---

## 🔄 FLUXO DE DEPLOY

Toda mudança de código segue este fluxo:

```
1. Claude Code aplica mudanças localmente
2. git add . && git commit -m "..." && git push origin main
3. Na VM SSH:
   cd ~/avimus-connect/frontend && git pull && npm run build && pm2 restart avimus-frontend
   cd ~/avimus-connect/backend && git pull && npm run build && pm2 restart avimus-backend --update-env
```

> ⚠️ Variáveis de ambiente (.env e .env.local) NÃO estão no git — ficam só na VM.

---

## 🤝 MODO DE TRABALHO

| Onde | Para quê |
|------|----------|
| Claude.ai | Estratégia, análise de logs, decisões, prompts para Claude Code |
| Claude Code (terminal) | Execução — editar arquivos, rodar comandos |

**Fluxo:**
1. Problema/log chega aqui
2. Claude.ai analisa e gera prompt exato
3. Cola no Claude Code
4. Claude Code executa e manda resumo
5. Resumo volta aqui para próxima decisão

---

## 📌 RESTRIÇÕES IMPORTANTES

- WPPConnect fica na VM separada — não mover
- Não quebrar rotas existentes ao adicionar novas
- Sempre testar localmente antes do deploy
- `.env` e `.env.local` nunca vão para o git
- PowerShell não aceita `&&` — rodar comandos separados
- Next.js precisa de rebuild após mudar `NEXT_PUBLIC_*`
