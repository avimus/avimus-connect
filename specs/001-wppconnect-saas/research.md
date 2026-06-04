# Research: Ávimus Connect — WPPConnect SaaS

**Date**: 2026-06-03 | **Branch**: `001-wppconnect-saas`

---

## 1. WPPConnect API Integration

### Decisão
Integrar via HTTP REST ao servidor WPPConnect em `http://34.171.150.35:21465` usando axios.
Cada instância WhatsApp corresponde a uma "sessão" no WPPConnect, identificada pelo campo
`wpp_session_id` no banco de dados.

### Endpoints WPPConnect relevantes

| Ação | Método | Endpoint |
|------|--------|----------|
| Verificar status da sessão | GET | `/api/{session}/status-session` |
| Iniciar/reconectar sessão | POST | `/api/{session}/start-session` |
| Obter QR Code | GET | `/api/{session}/qrcode` |
| Fechar sessão | POST | `/api/{session}/close-session` |
| Deletar sessão | DELETE | `/api/{secretKey}/{session}/delete-session` |

### Mapeamento de status WPPConnect → Plataforma

| Status WPPConnect | Status Plataforma |
|-------------------|------------------|
| `CONNECTED` | `online` |
| `QRCODE` | `waiting_qr` |
| `DISCONNECTED` | `offline` |
| `CLOSED` | `offline` |
| `CONFLICT` | `error` |
| `TIMEOUT` | `error` |
| Erro HTTP / timeout | `unknown` |

### Autenticação com WPPConnect
WPPConnect usa um `secretKey` configurado no servidor para operações administrativas (criar/deletar
sessões). Operações de leitura de status podem ser abertas ou exigir header. Configurar
`WPP_SECRET_KEY` como variável de ambiente no backend.

### Rationale
Polling HTTP é a abordagem mais simples para v1. Webhooks do WPPConnect exigiriam endpoint
público exposto ao servidor WPPConnect — complexidade desnecessária para escala de 50 clientes.
Polling de 30s é suficiente para detectar quedas em tempo hábil para alertas.

### Alternativas consideradas
- **Webhooks WPPConnect**: Latência menor, mas requer endpoint público configurado no servidor
  WPPConnect. Deferred para v2.
- **Socket.io WPPConnect**: Conexão persistente — overkill para v1, aumenta complexidade operacional.

---

## 2. JWT + Invite Token Flow

### Decisão
- JWT de acesso: expiração de 24h (configurável via `JWT_EXPIRY` env var), assinado com
  `HS256` usando `JWT_SECRET`.
- Payload do JWT: `{ sub: userId, tenantId, role, iat, exp }`.
- Invite tokens: UUID v4 gerados com `crypto.randomUUID()`, armazenados em tabela
  `invite_tokens` com `expires_at` (72h) e `used_at`.
- Fluxo de ativação: `GET /auth/activate?token=xxx` valida token → redireciona para
  página de definição de senha → `POST /auth/activate` invalida token e cria hash da senha.

### Rationale
UUID v4 é suficientemente entrópico (122 bits) para tokens de uso único sem colisões práticas.
Hash da senha com bcrypt (cost factor 12). JWT sem refresh token em v1 — 24h de sessão é
adequado para o caso de uso (gerenciadores de instâncias monitoram durante o dia de trabalho).

### Alternativas consideradas
- **Refresh tokens**: Mais seguro para sessões longas, mas aumenta complexidade de rotação.
  Deferred para v2.
- **Tokens criptograficamente assinados (HMAC)**: Desnecessário — UUIDs armazenados em DB
  com lookup já garantem segurança.

---

## 3. Polling Scheduler (Backend)

### Decisão
`node-cron` executando a cada 30 segundos no processo do backend. O job itera todas as instâncias
com status não-`error` e faz GET `/status-session` para cada uma no WPPConnect.

### Lógica de transição para alertas

```
Para cada instância:
  novo_status = chamar WPPConnect
  if novo_status == 'unknown': pular (WPP indisponível)
  if status_anterior == 'online' AND novo_status == 'offline':
    verificar cooldown: if now - last_alert_sent_at > 10min:
      enviar email de alerta
      atualizar last_alert_sent_at
  atualizar status + last_polled_at no banco
  registrar evento no log se mudou de status
```

### Rationale
Polling sequencial (não paralelo) para evitar sobrecarga no servidor WPPConnect. Com 250
instâncias e cada chamada levando ~200ms, o ciclo completo leva ~50s — dentro da margem de 30s
desejada para escala inicial. Para >100 instâncias, implementar polling em batches paralelos (v2).

### Alternativas consideradas
- **BullMQ/Redis queue**: Over-engineering para v1. Node-cron é suficiente para escala alvo.
- **Polling paralelo**: Risco de rate limiting no WPPConnect. Deferred com backoff configurável.

---

## 4. Deploy GCP Cloud Run

### Decisão
- **Backend**: Container Docker (Node.js) em Cloud Run, autoescalamento 1-5 instâncias.
- **Frontend**: Container Docker (Next.js) em Cloud Run, ou Vercel (mais simples para Next.js).
- **Banco**: Cloud SQL PostgreSQL 15 (managed), acesso via Cloud SQL Connector ou IP privado.
- **Variáveis de ambiente**: Cloud Run env vars + Secret Manager para segredos.

### Rationale
Cloud Run é serverless-friendly para containers, sem gestão de VM, com autoescalamento zero-to-one
adequado para carga de 50 clientes. Cloud SQL elimina gestão de PostgreSQL.

### Alternativas consideradas
- **GKE**: Over-engineering para v1. Cloud Run é suficiente.
- **App Engine**: Menos flexível para containers customizados.

---

## 5. Email Transacional com Resend

### Decisão
Resend SDK para Node.js. Dois templates de email:
1. **Convite de ativação**: Link com token, expira em 72h.
2. **Alerta de queda**: Nome da instância, horário, link para painel do cliente.

Remetente: `noreply@avimus.com.br` (domínio a configurar no Resend).

### Rationale
Resend é simples, tem SDK TypeScript oficial, boa entregabilidade e plano gratuito suficiente
para v1 (até 3.000 emails/mês). Sem necessidade de sistema de filas para volume de 50 clientes.

### Alternativas consideradas
- **SendGrid**: Mais complexo, pricing menos amigável para volumes baixos.
- **Nodemailer + SMTP**: Requer gestão de servidor SMTP ou credenciais Gmail — menos confiável.

---

## 6. Isolamento Multi-Tenant com Prisma

### Decisão
Todas as queries Prisma para tabelas com `tenant_id` DEVEM incluir `where: { tenantId }` explícito.
Não usar Row Level Security do PostgreSQL em v1 (adiciona complexidade de configuração).
Em vez disso, middleware Express injeta `req.tenantId` e todos os services recebem `tenantId`
como parâmetro obrigatório — sem valor default.

### Rationale
Abordagem de middleware + parâmetro explícito é mais visível em code review do que RLS.
Testes de isolamento cobrem os cenários críticos de cross-tenant access.

### Alternativas consideradas
- **PostgreSQL RLS**: Garante isolamento no nível do banco, mas exige configuração de políticas
  por tabela e aumenta complexidade de migrations. Deferred para v2 se escala exigir.
- **Schema separation por tenant**: Inviável para 50+ tenants.
