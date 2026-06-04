# Contrato: Admin — Gestão de Clientes

**Base URL**: `/api/v1/admin/clients`
**Auth**: Bearer JWT (role: admin)

---

## GET /

Lista todos os clientes cadastrados.

**Query params** (opcionais):
- `status`: `active` | `inactive` | `pending`
- `page`: número da página (default 1)
- `limit`: itens por página (default 20, max 100)

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Empresa ABC",
      "email": "contato@abc.com",
      "planType": "five",
      "planLimit": 5,
      "status": "active",
      "instanceCount": 3,
      "createdAt": "2026-06-03T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## POST /

Cria um novo cliente e envia email de convite automaticamente.

**Request**
```json
{
  "name": "Empresa ABC",
  "email": "contato@abc.com",
  "planType": "five"
}
```

Para plano customizado:
```json
{
  "name": "Empresa XYZ",
  "email": "contato@xyz.com",
  "planType": "custom",
  "planLimit": 12
}
```

**Validações**:
- `planType` obrigatório; se `custom`, `planLimit` deve ser inteiro positivo
- `email` único — rejeita se já cadastrado

**Response 201**
```json
{
  "id": "uuid",
  "name": "Empresa ABC",
  "email": "contato@abc.com",
  "planType": "five",
  "planLimit": 5,
  "status": "pending",
  "createdAt": "2026-06-03T10:00:00Z"
}
```

**Response 409**
```json
{ "error": "Email já cadastrado" }
```

**Efeito colateral**: Email de convite enviado via Resend com link de ativação (expira 72h).

---

## GET /:id

Retorna detalhes de um cliente específico, incluindo instâncias.

**Response 200**
```json
{
  "id": "uuid",
  "name": "Empresa ABC",
  "email": "contato@abc.com",
  "planType": "five",
  "planLimit": 5,
  "status": "active",
  "instances": [
    {
      "id": "uuid",
      "name": "Suporte Principal",
      "wppSessionId": "empresa-abc-suporte",
      "status": "online",
      "lastPolledAt": "2026-06-03T10:29:00Z"
    }
  ],
  "createdAt": "2026-06-03T10:00:00Z"
}
```

---

## PATCH /:id

Atualiza dados do cliente (nome, plano, status).

**Request** (campos opcionais):
```json
{
  "name": "Empresa ABC Ltda",
  "planType": "custom",
  "planLimit": 20,
  "status": "inactive"
}
```

**Validação**: Se novo `planLimit` < instâncias existentes, retornar 422.

**Response 200**: objeto atualizado do cliente

**Response 422**
```json
{
  "error": "Novo limite de instâncias (3) é menor que instâncias existentes (5)"
}
```

---

## POST /:id/resend-invite

Reenvia email de convite para cliente ainda não ativado. Invalida token anterior e gera novo.

**Response 200**
```json
{ "message": "Convite reenviado com sucesso" }
```

**Response 400**
```json
{ "error": "Cliente já possui conta ativa" }
```
