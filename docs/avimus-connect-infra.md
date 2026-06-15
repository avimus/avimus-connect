# 🖥️ INFRAESTRUTURA — Avimus Connect
> Documento de referência para acesso, manutenção e recuperação do servidor

---

## ☁️ PROVEDOR

| Item | Valor |
|------|-------|
| Provedor | Google Cloud Platform (GCP) |
| Projeto | `avimus-connect` |
| Console | https://console.cloud.google.com/compute/instances?project=avimus-connect |
| Região | `us-central1` (Iowa, EUA) |
| Zona | `us-central1-a` |

---

## 🖥️ SERVIDORES (VMs)

### VM 1 — Avimus Connect (Backend + Frontend)

| Item | Valor |
|------|-------|
| Nome | `avimus-connect-vm` |
| IP Externo | `34.31.134.203` |
| IP Interno | `10.128.0.2` |
| Tipo | `e2-medium` (2 vCPU, 4GB RAM) |
| Disco | 30GB SSD |
| OS | Ubuntu 22.04 LTS |
| Zona | `us-central1-a` |
| Status | Running |

### VM 2 — WPPConnect (WhatsApp)

| Item | Valor |
|------|-------|
| Nome | `wpp-service-vm` |
| IP Externo | `34.171.150.35` |
| Zona | `us-central1-a` |
| Serviço | WPPConnect Server |
| API | http://34.171.150.35:21465 |
| Secret | `THISISMYSECURETOKEN` |
| Docs | http://34.171.150.35:21465/api-docs/#/ |

---

## 🔌 CONECTAR AO SERVIDOR

### Via Google Cloud CLI (PowerShell local)

```powershell
# Conectar na VM principal
gcloud compute ssh avimus-connect-vm --project=avimus-connect --zone=us-central1-a

# Conectar na VM do WPP
gcloud compute ssh wpp-service-vm --project=avimus-connect --zone=us-central1-a
```

### Pré-requisito
Google Cloud SDK instalado e autenticado:
```powershell
gcloud auth login
gcloud config set project avimus-connect
```

---

## 🐳 BANCO DE DADOS

| Item | Valor |
|------|-------|
| Engine | PostgreSQL 15 |
| Hospedagem | Docker na `avimus-connect-vm` |
| Container | `avimus-pg` |
| Porta | `5432` |
| Usuário | `avimus` |
| Senha | `avimus123` |
| Database | `avimus_connect` |

### Comandos úteis (dentro da VM)

```bash
# Ver status do container
docker ps

# Iniciar banco (se parado)
docker start avimus-pg

# Acessar PostgreSQL
docker exec -it avimus-pg psql -U avimus -d avimus_connect

# Listar tabelas
docker exec -it avimus-pg psql -U avimus -d avimus_connect -c "\dt"

# Backup do banco
docker exec avimus-pg pg_dump -U avimus avimus_connect > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i avimus-pg psql -U avimus -d avimus_connect < backup.sql
```

---

## ⚙️ PROCESSOS (PM2)

### Comandos úteis (dentro da VM)

```bash
# Ver status de todos os processos
pm2 status

# Ver logs em tempo real
pm2 logs

# Ver logs do backend
pm2 logs avimus-backend --lines 50

# Ver logs do frontend
pm2 logs avimus-frontend --lines 50

# Reiniciar backend
pm2 restart avimus-backend --update-env

# Reiniciar frontend
pm2 restart avimus-frontend

# Reiniciar tudo
pm2 restart all

# Salvar configuração atual
pm2 save
```

### Processos rodando

| ID | Nome | Porta |
|----|------|-------|
| 0 | avimus-backend | 3001 |
| 1 | avimus-frontend | 3000 |

---

## 🌐 NGINX

| Item | Valor |
|------|-------|
| Config | `/etc/nginx/sites-enabled/avimus-connect` |
| Porta HTTP | 80 (redireciona para HTTPS) |
| Porta HTTPS | 443 |
| Proxy frontend | `localhost:3000` |
| Proxy backend | `localhost:3001` (via `/api`) |

### Comandos úteis

```bash
# Testar configuração
sudo nginx -t

# Recarregar sem derrubar
sudo nginx -s reload

# Reiniciar
sudo systemctl restart nginx

# Ver status
sudo systemctl status nginx

# Ver config atual
cat /etc/nginx/sites-enabled/avimus-connect
```

---

## 🔒 SSL / HTTPS

| Item | Valor |
|------|-------|
| Provedor | Let's Encrypt (Certbot) |
| Domínio | `connect.avimus.com.br` |
| Certificado | `/etc/letsencrypt/live/connect.avimus.com.br/fullchain.pem` |
| Chave | `/etc/letsencrypt/live/connect.avimus.com.br/privkey.pem` |
| Expiração | 2026-09-02 |
| Renovação | Automática via systemd |

```bash
# Verificar renovação automática
sudo certbot renew --dry-run

# Renovar manualmente (se necessário)
sudo certbot renew
```

---

## 🌍 DNS

| Item | Valor |
|------|-------|
| Provedor DNS | Hostinger |
| Domínio | `avimus.com.br` |
| Subdomínio | `connect.avimus.com.br` |
| Tipo | A |
| IP | `34.31.134.203` |
| TTL | 300 |

---

## 🔥 FIREWALL (GCP)

| Regra | Portas | Tag |
|-------|--------|-----|
| avimus-connect-ports | 80, 3000, 3001 | http-server |
| avimus-https | 443 | http-server |

```powershell
# Listar regras (PowerShell local)
gcloud compute firewall-rules list --project=avimus-connect
```

---

## 📁 ESTRUTURA NA VM

```
/home/projetoapexio_gmail_com/
└── avimus-connect/
    ├── backend/
    │   ├── .env                  ← variáveis de ambiente (NÃO está no git)
    │   ├── dist/                 ← build TypeScript compilado
    │   ├── prisma/
    │   │   └── schema.prisma
    │   └── src/
    └── frontend/
        ├── .env.local            ← variáveis de ambiente (NÃO está no git)
        ├── .next/                ← build Next.js
        └── src/
```

---

## 🔄 DEPLOY — PASSO A PASSO

### Atualizar backend

```bash
cd ~/avimus-connect/backend
git pull
npm run build
pm2 restart avimus-backend --update-env
```

### Atualizar frontend

```bash
cd ~/avimus-connect/frontend
git pull
npm run build
pm2 restart avimus-frontend
```

### Atualizar tudo de uma vez

```bash
cd ~/avimus-connect/backend && git pull && npm run build && pm2 restart avimus-backend --update-env
cd ~/avimus-connect/frontend && git pull && npm run build && pm2 restart avimus-frontend
```

---

## 🚨 RECUPERAÇÃO DE EMERGÊNCIA

### VM parou / reiniciou

```bash
# PM2 sobe automaticamente (configurado no systemd)
# Se não subir:
pm2 resurrect

# Se banco não subir:
docker start avimus-pg
```

### Recriar VM do zero

1. Clonar repo: `git clone https://github.com/avimus/avimus-connect.git`
2. Instalar dependências: Node 20, Docker, Nginx, PM2
3. Subir banco Docker com as credenciais acima
4. Criar `.env` e `.env.local` com as variáveis (ver documento de contexto)
5. Rodar migrations: `npx prisma migrate deploy`
6. Rodar seed: `npm run seed`
7. Build e PM2
8. Configurar Nginx
9. Certbot para SSL

### Seed do admin

```bash
cd ~/avimus-connect/backend
npm run seed
# Cria: avimushealthtech@gmail.com com senha padrão do .env
```

---

## 📊 MONITORAMENTO BÁSICO

```bash
# CPU e memória
htop

# Espaço em disco
df -h

# Logs do sistema
journalctl -f

# Uso de memória dos containers
docker stats avimus-pg
```

---

## 🔗 LINKS RÁPIDOS

| Destino | URL |
|---------|-----|
| Aplicação | https://connect.avimus.com.br |
| API Docs (Swagger) | https://connect.avimus.com.br/api/docs/ |
| WPPConnect Docs | http://34.171.150.35:21465/api-docs/#/ |
| Console GCP | https://console.cloud.google.com/compute/instances?project=avimus-connect |
| Resend | https://resend.com |
| Hostinger DNS | https://hpanel.hostinger.com |
