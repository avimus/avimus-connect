# Contrato: Admin — Gestão Global de Instâncias

**Base URL**: `/api/v1/admin`
**Auth**: Bearer JWT (role: admin)

---

## GET /instances

Lista todas as instâncias de todos os clientes (visão consolidada do Admin).

**Query params** (opcionais):
- `tenantId`: filtrar por cliente
- `status`: `online` | `offline` | `waiting_qr` | `error` | `unknown`
- `page`, `limit`

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Suporte Principal",
      "wppSessionId": "empresa-abc-suporte",
      "status": "online",
      "lastPolledAt": "2026-06-03T10:29:00Z",
      "tenant": {
        "id": "uuid",
        "name": "Empresa ABC"
      }
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

---

## POST /clients/:clientId/instances

Cria uma nova instância WhatsApp para o cliente especificado.

**Request**
```json
{
  "name": "Suporte Principal",
  "wppSessionId": "empresa-abc-suporte"
}
```

**Validações**:
- `wppSessionId` único globalmente (usado como session name no WPPConnect)
- Número de instâncias do cliente não pode exceder `plan_limit` (null = sem limite)

**Response 201**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Suporte Principal",
  "wppSessionId": "empresa-abc-suporte",
  "status": "waiting_qr",
  "createdAt": "2026-06-03T10:00:00Z"
}
```

**Response 422**
```json
{ "error": "Limite de instâncias do plano atingido (5 de 5)" }
```

**Response 409**
```json
{ "error": "Session ID já em uso" }
```

---

## DELETE /instances/:instanceId

Remove uma instância da plataforma e fecha a sessão no WPPConnect.

**Response 204**: sem corpo

**Efeito colateral**: `DELETE /api/{wppSessionId}` chamado no WPPConnect. Evento
`disconnected` registrado no log antes da remoção.

---

## GET /logs

Log global de eventos de todas as instâncias de todos os clientes.

**Query params** (opcionais):
- `tenantId`: filtrar por cliente
- `instanceId`: filtrar por instância
- `eventType`: `connected` | `disconnected` | `qr_scanned` | `error` | `reconnect_attempt`
- `from`: ISO date (default: 24h atrás)
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
      "details": { "reason": "timeout" },
      "instance": {
        "id": "uuid",
        "name": "Suporte Principal"
      },
      "tenant": {
        "id": "uuid",
        "name": "Empresa ABC"
      }
    }
  ],
  "total": 234,
  "page": 1,
  "limit": 50
}
```
