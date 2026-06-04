# Contrato: Autenticação

**Base URL**: `/api/v1/auth`

---

## POST /login

Autentica um usuário (Admin ou Cliente) e retorna JWT.

**Request**
```json
{
  "email": "admin@avimus.com.br",
  "password": "senha123"
}
```

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@avimus.com.br",
    "role": "admin",
    "tenantId": null
  }
}
```

**Response 401**
```json
{ "error": "Credenciais inválidas" }
```

---

## GET /activate

Valida token de convite e retorna dados do tenant para exibir na página de ativação.

**Query params**: `token` (string, obrigatório)

**Response 200**
```json
{
  "valid": true,
  "tenantName": "Empresa ABC",
  "email": "cliente@empresaabc.com"
}
```

**Response 400**
```json
{ "error": "Token inválido ou expirado" }
```

---

## POST /activate

Ativa a conta do cliente: define a senha e invalida o token de convite.

**Request**
```json
{
  "token": "uuid-do-convite",
  "password": "novaSenha123",
  "passwordConfirm": "novaSenha123"
}
```

**Validações**:
- `password` mínimo 8 caracteres
- `password === passwordConfirm`
- Token válido (não usado, não expirado)

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "cliente@empresaabc.com",
    "role": "client",
    "tenantId": "uuid-do-tenant"
  }
}
```

**Response 400**
```json
{ "error": "Token inválido ou expirado" }
```

**Efeito colateral**: `invite_tokens.used_at` é preenchido imediatamente. Requests
subsequentes com o mesmo token retornam 400.
