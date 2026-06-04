# Feature Specification: Ávimus Connect — Plataforma de Gerenciamento WhatsApp Multi-Tenant

**Feature Branch**: `001-wppconnect-saas`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Quero um SaaS multi-tenant de gerenciamento de instâncias WhatsApp via WPPConnect para a Ávimus..."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Onboarding Completo: Admin Cria Cliente e Cliente Ativa Conta (Priority: P1)

O Administrador acessa o painel e cria um novo cliente definindo nome, email, e plano de instâncias (1, 5, ilimitado ou número customizado). O sistema envia automaticamente um email de convite ao cliente com um link de ativação de uso único. O cliente acessa o link, define sua senha e entra na plataforma pela primeira vez, já vendo seu painel personalizado.

**Why this priority**: Sem onboarding funcional nenhum cliente pode usar a plataforma. É o pré-requisito de todo o restante.

**Independent Test**: Pode ser testado completamente criando um cliente como Admin, interceptando o email de convite, acessando o link, definindo senha e confirmando acesso ao painel do cliente — sem necessidade de instâncias WhatsApp ativas.

**Acceptance Scenarios**:

1. **Given** o Admin está autenticado no painel, **When** preenche nome, email e plano do cliente e confirma criação, **Then** o cliente aparece na lista de clientes com status "Aguardando ativação" e o email de convite é enviado em até 30 segundos.
2. **Given** o cliente recebeu o email de convite, **When** clica no link e define uma senha válida, **Then** a conta é ativada, o token de convite é invalidado e o cliente é redirecionado ao seu painel.
3. **Given** o cliente tenta usar o mesmo link de convite uma segunda vez, **When** acessa a URL, **Then** recebe mensagem de "link expirado ou já utilizado" e não consegue acessar.
4. **Given** o Admin tenta criar dois clientes com o mesmo email, **When** confirma criação, **Then** o sistema rejeita com mensagem de email já cadastrado.

---

### User Story 2 — Admin Gerencia Instâncias e Visualiza Logs Globais (Priority: P2)

O Administrador pode criar instâncias WhatsApp para qualquer cliente (respeitando o limite do plano), visualizar o status em tempo real de todas as instâncias de todos os clientes em uma única tela consolidada, e acessar um log global de eventos (conexão, desconexão, QR Code escaneado) com filtros por cliente e período.

**Why this priority**: O Admin precisa ter visibilidade operacional completa para gerenciar o produto. Sem isso a plataforma não tem valor para a equipe Ávimus.

**Independent Test**: Com pelo menos um cliente ativado, o Admin cria instâncias, verifica status no painel consolidado e filtra eventos no log global — sem necessidade de o cliente estar logado.

**Acceptance Scenarios**:

1. **Given** o Admin está na tela de gerenciamento de um cliente, **When** cria uma nova instância (nome + identificador), **Then** a instância aparece na lista com status "Aguardando QR" e é registrada no log global.
2. **Given** o cliente atingiu o limite de instâncias do seu plano, **When** o Admin tenta criar mais uma instância para esse cliente, **Then** o sistema bloqueia a criação e exibe o limite do plano.
3. **Given** uma instância muda de status (ex: vai offline), **When** o Admin visualiza o painel global, **Then** o novo status é exibido sem necessidade de recarregar a página (polling automático ≤30s).
4. **Given** o Admin filtra o log global por cliente e período, **When** aplica os filtros, **Then** apenas os eventos do cliente e período selecionados são exibidos.

---

### User Story 3 — Cliente Gerencia Suas Instâncias e Escaneia QR Code (Priority: P3)

O Cliente acessa seu painel e vê apenas as instâncias pertencentes à sua conta, com status em tempo real (online, offline, aguardando QR). Pode reconectar uma instância desconectada e escanear o QR Code diretamente no painel para autenticar o WhatsApp, sem sair da plataforma.

**Why this priority**: É a funcionalidade central do produto para o usuário final. Sem ela o produto não entrega valor ao cliente.

**Independent Test**: Com instâncias criadas pelo Admin, o cliente faz login, vê o status, inicia reconexão e escaneia QR Code diretamente na tela — verificável de ponta a ponta com um celular real.

**Acceptance Scenarios**:

1. **Given** o cliente está autenticado, **When** acessa o painel, **Then** vê apenas as instâncias da sua conta (nunca de outros clientes) com status atual (online/offline/aguardando QR).
2. **Given** uma instância está offline, **When** o cliente clica em "Reconectar", **Then** o sistema inicia o processo de reconexão e exibe o QR Code em até 15 segundos se necessário.
3. **Given** o QR Code está visível no painel, **When** o cliente escaneia com o celular via WhatsApp, **Then** a instância muda para status "Online" e o evento é registrado no log.
4. **Given** o cliente tenta acessar uma instância que não pertence à sua conta (via URL direta), **When** a requisição chega ao servidor, **Then** recebe resposta de "não autorizado" sem exposição de dados.

---

### User Story 4 — Alertas Automáticos por Email quando Instância Cai (Priority: P4)

Quando uma instância WhatsApp do cliente vai offline (estado anterior era online), o sistema detecta automaticamente e envia um email de alerta ao cliente proprietário da instância informando qual instância caiu e quando.

**Why this priority**: Garante que o cliente seja notificado proativamente de problemas sem precisar monitorar o painel constantemente, reduzindo churn por falta de percepção.

**Independent Test**: Com uma instância online, ao simular desconexão, verificar que o email de alerta chega ao endereço do cliente em até 2 minutos.

**Acceptance Scenarios**:

1. **Given** uma instância estava online e perde conexão, **When** o sistema detecta a mudança de status, **Then** envia email ao cliente em até 2 minutos informando nome da instância, horário da queda e link para o painel.
2. **Given** uma instância já estava offline quando a plataforma foi iniciada, **When** o sistema faz polling de status, **Then** não envia email de alerta (evitar spam em reconexões do próprio sistema).
3. **Given** o email de alerta foi enviado para uma queda, **When** a mesma instância cai novamente após reconexão bem-sucedida, **Then** um novo email de alerta é enviado.

---

### Edge Cases

- O que acontece se o servidor WPPConnect estiver indisponível durante o polling? → O sistema marca instâncias como "status desconhecido" e exibe alerta no painel Admin sem enviar emails falsos de alerta.
- O que acontece se o cliente tentar escanear um QR Code expirado? → O sistema solicita automaticamente um novo QR Code e exibe na tela.
- O que acontece se o email de convite não for entregue? → O Admin pode reenviar convite manualmente pela tela de gerenciamento do cliente.
- O que acontece se uma instância estiver no limite de tentativas de reconexão? → O sistema para de tentar e exibe status "Erro" com orientação para contato com suporte.

---

## Requirements *(mandatory)*

### Functional Requirements

**Autenticação & Acesso**

- **FR-001**: O sistema DEVE autenticar usuários via JWT com expiração configurável por ambiente.
- **FR-002**: O sistema DEVE suportar dois papéis distintos: Admin (acesso total) e Cliente (acesso restrito à própria conta).
- **FR-002a**: A conta Admin DEVE ser provisionada exclusivamente via script de seed executado durante o deploy, com credenciais (email e senha) fornecidas por variáveis de ambiente. Nenhuma rota pública de criação de Admin deve existir.
- **FR-003**: O sistema DEVE gerar tokens de convite de uso único para ativação de conta de clientes.
- **FR-004**: O sistema DEVE invalidar tokens de convite imediatamente após o primeiro uso bem-sucedido.
- **FR-005**: Todas as rotas protegidas DEVEM validar o JWT e o papel do usuário antes de processar qualquer requisição.

**Gerenciamento de Clientes (Admin)**

- **FR-006**: O Admin DEVE poder criar clientes informando nome, email e plano (1, 5, ilimitado ou número customizado de instâncias).
- **FR-007**: O Admin DEVE poder visualizar, editar e desativar clientes existentes.
- **FR-008**: O sistema DEVE enviar email de convite automaticamente ao criar um novo cliente.
- **FR-009**: O Admin DEVE poder reenviar email de convite para clientes que ainda não ativaram a conta.
- **FR-010**: O sistema DEVE impedir criação de dois clientes com o mesmo endereço de email.

**Gerenciamento de Instâncias (Admin)**

- **FR-011**: O Admin DEVE poder criar instâncias WhatsApp para qualquer cliente, respeitando o limite do plano contratado.
- **FR-012**: O Admin DEVE poder visualizar todas as instâncias de todos os clientes em um painel consolidado com status em tempo real.
- **FR-013**: O Admin DEVE poder excluir instâncias.
- **FR-014**: O sistema DEVE atualizar o status de todas as instâncias via polling com intervalo máximo de 30 segundos.

**Painel do Cliente**

- **FR-015**: O Cliente DEVE ver apenas as instâncias pertencentes à sua conta, nunca de outros clientes.
- **FR-016**: O Cliente DEVE poder iniciar reconexão de uma instância offline.
- **FR-017**: O sistema DEVE exibir o QR Code para autenticação diretamente no painel do cliente.
- **FR-018**: O sistema DEVE atualizar o status das instâncias do cliente automaticamente sem recarregar a página.

**Alertas por Email**

- **FR-019**: O sistema DEVE enviar email automático ao cliente quando uma instância sua passa de online para offline (transição confirmada).
- **FR-020**: O sistema NÃO DEVE enviar alertas para instâncias que já estavam offline no início do monitoramento.
- **FR-020a**: O sistema NÃO DEVE enviar alertas de email quando o status da instância for "desconhecido" por falha de comunicação com WPPConnect; o painel Admin DEVE exibir aviso de indisponibilidade do serviço nesses casos.
- **FR-020b**: O sistema DEVE aplicar cooldown fixo de 10 minutos por instância nos alertas de queda — no máximo 1 email de alerta por instância a cada 10 minutos, independente da frequência de oscilações.

**Logs de Eventos**

- **FR-021**: O sistema DEVE registrar eventos de conexão, desconexão e QR Code escaneado para cada instância.
- **FR-022**: O Admin DEVE poder visualizar logs globais de todos os clientes com filtro por cliente e período.
- **FR-023**: O Cliente DEVE poder visualizar logs de suas próprias instâncias.

### Key Entities

- **Tenant (Cliente)**: Representa uma empresa ou usuário cliente. Atributos: id, nome, email, plano, status (ativo/inativo/aguardando ativação), data de criação.
- **Plano**: Define o número máximo de instâncias permitidas. Tipos: fixos (1, 5, ilimitado) ou customizado (número arbitrário).
- **Token de Convite**: Link de ativação de uso único. Atributos: token, tenant_id, expiração, usado_em.
- **Usuário**: Pessoa que acessa a plataforma. Atributos: id, tenant_id, email, senha (hash), papel (admin/cliente), criado_em.
- **Instância WhatsApp**: Representa uma sessão WPPConnect. Atributos: id, tenant_id, nome, identificador_wpp, status (online/offline/aguardando_qr/erro/desconhecido), ultima_atualizacao.
- **Evento de Log**: Registro imutável de mudança de estado. Atributos: id, instancia_id, tenant_id, tipo (conexao/desconexao/qr_escaneado/erro), ocorrido_em, detalhes.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Admin consegue criar um cliente e o cliente recebe o email de convite em até 30 segundos após a confirmação.
- **SC-002**: O cliente consegue completar o onboarding (ativar conta + logar) em menos de 3 minutos a partir do recebimento do email de convite.
- **SC-003**: O status de todas as instâncias no painel Admin é atualizado em no máximo 30 segundos após mudança real de estado.
- **SC-004**: O QR Code é exibido no painel do cliente em até 15 segundos após clicar em "Reconectar".
- **SC-005**: Emails de alerta de instância offline chegam ao cliente em até 2 minutos após a detecção da queda.
- **SC-006**: 100% das rotas protegidas rejeita requisições sem JWT válido com status 401.
- **SC-007**: Nenhum cliente consegue visualizar dados de outro cliente em nenhuma tela ou resposta de API.
- **SC-008**: O sistema suporta até 50 clientes simultâneos com polling ativo sem degradação perceptível na interface.

---

## Clarifications

### Session 2026-06-03

- Q: Como a conta do primeiro Admin é provisionada na v1? → A: Via script de seed no deploy, com credenciais definidas por variáveis de ambiente. Nenhuma rota pública de criação de Admin.
- Q: Quando o WPPConnect está inacessível ("status desconhecido"), o sistema deve enviar alertas de email? → A: Não. Alertas são enviados apenas em transição confirmada de online para offline. Status "desconhecido" não dispara notificação.
- Q: Deve existir cooldown entre alertas de email da mesma instância? → A: Sim, cooldown fixo de 10 minutos por instância — no máximo 1 alerta a cada 10 minutos por instância.

---

## Assumptions

- A API WPPConnect está rodando e acessível; a plataforma não é responsável por hospedar ou gerenciar o processo WPPConnect em si.
- O polling de status é suficiente para v1; webhooks do WPPConnect podem ser adicionados em versões futuras para reduzir latência.
- O Admin é um papel único e fixo; gestão de múltiplos admins está fora do escopo da v1.
- Clientes não podem se auto-cadastrar; o fluxo de entrada é sempre via convite enviado pelo Admin.
- A stack técnica definida é: Next.js (frontend), Node.js/Express (backend API), PostgreSQL (banco de dados), Resend (envio de email), GCP (hospedagem).
- Suporte mobile (app nativo) está fora do escopo da v1; a interface responsiva cobre acesso via browser mobile.
- Recuperação de senha (esqueci minha senha) está fora do escopo da v1; o fluxo de reenvio de convite pelo Admin cobre o caso de uso emergencial.
- A identidade visual segue o Design System Ávimus: dark background, roxo `#775EFC`, fonte Montserrat, glassmorphism (definido na Constituição do projeto).
- Logs são armazenados indefinidamente na v1; políticas de retenção serão definidas em versões futuras.
- O número "ilimitado" de instâncias por plano é limitado na prática pela capacidade do servidor WPPConnect, não pela plataforma.
