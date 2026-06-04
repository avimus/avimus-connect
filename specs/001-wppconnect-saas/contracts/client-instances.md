# Contrato: Cliente — Painel de Instâncias

**Base URL**: `/api/v1/client`
**Auth**: Bearer JWT (role: client)
**Isolamento**: Todas as queries filtradas automaticamente pelo `tenantId` extraído do JWT.
Acesso a recursos de outro tenant retorna 403 — nunca 404 (não vazar existência).

---

## GET /instances

Lista as instâncias do cliente autenticado.

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Suporte Principal",
      "status": "online",
      "lastPolledAt": "2026-06-03T10:29:00Z"
    },
    {
      "id": "uuid",
      "name": "Vendas",
      "status": "offline",
      "lastPolledAt": "2026-06-03T10:28:45Z"
    }
  ]
}
```

---

## POST /instances/:id/reconnect

Inicia processo de reconexão de uma instância offline ou com erro.

**Validação**: Instância DEVE pertencer ao tenant do JWT (403 caso contrário).

**Response 202**
```json
{
  "instanceId": "uuid",
  "status": "waiting_qr",
  "message": "Reconexão iniciada. Aguardando QR Code."
}
```

**Response 400**
```json
{ "error": "Instância já está online" }
```

**Efeito colateral**:
1. Chama `POST /api/{wppSessionId}/start-session` no WPPConnect.
2. Registra evento `reconnect_attempt` no log.
3. Status atualizado para `waiting_qr`.

---

## GET /instances/:id/qrcode

Obtém o QR Code atual para escaneamento. Disponível apenas quando status = `waiting_qr`.

**Validação**: Instância DEVE pertencer ao tenant do JWT (403 caso contrário).

**Response 200**
```json
{
  "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expiresIn": 60
}
```

**Response 400**
```json
{ "error": "QR Code não disponível. Status atual: online" }
```

**Nota**: Se o QR Code retornado pelo WPPConnect for `null` ou estiver expirado, o backend
dispara automaticamente um novo `start-session` antes de retornar.

---

## GET /logs

Log de eventos das instâncias do cliente autenticado.

**Query params** (opcionais):
- `instanceId`: filtrar por instância específica
- `eventType`: `connected` | `disconnected` | `qr_scanned` | `error` | `reconnect_attempt`
- `from`: ISO date (default: 7 dias atrás)
- `to`: ISO date (default: agora)
- `page`, `limit` (default limit: 50)

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "eventType": "disconnected",
      "occurredAt": "2026-06-03T09:45:00Z",
      "instance": {
        "id": "uuid",
        "name": "Suporte Principal"
      }
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 50
}
```

**Isolamento**: Query sempre inclui `WHERE tenant_id = :tenantId` — cliente nunca
vê eventos de outras contas.
