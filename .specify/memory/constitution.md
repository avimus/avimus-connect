<!--
SYNC IMPACT REPORT
==================
Version Change: (template blank) → 1.0.0
Bump Type: MINOR — first population of all sections from template placeholders.

Principles Added (all new):
  - I. UX Premium & Design System
  - II. Multi-Tenancy First
  - III. Security First
  - IV. Clean & Scalable Code
  - V. V1 Pragmatism — Core First

Sections Added:
  - Core Principles (5 principles)
  - Restrições de Arquitetura SaaS
  - Fluxo de Desenvolvimento

Sections Removed: N/A

Templates Reviewed:
  ✅ .specify/memory/constitution.md         — written (this file)
  ⚠  .specify/templates/plan-template.md    — Constitution Check section is generic;
                                               /speckit-plan must reference these five
                                               principles when generating gates.
  ✅ .specify/templates/spec-template.md    — generic enough; no update required.
  ✅ .specify/templates/tasks-template.md   — generic enough; no update required.
  ✅ No command template files found        — nothing to update.

Deferred TODOs: None — all placeholders resolved.
-->

# Ávimus Connect Constitution

## Core Principles

### I. UX Premium & Design System

A interface é a promessa do produto. Todo componente visual DEVE seguir o design system
Ávimus sem exceções.

- Tema MUST ser dark por padrão; nenhum componente pode assumir fundo claro.
- Paleta primária: roxo `#775EFC`; variações DEVEM ser derivadas desta cor-base.
- Tipografia: `Montserrat` para todos os textos de interface; fontes alternativas são
  proibidas sem aprovação explícita.
- Glassmorphism é o padrão de superfície: `backdrop-filter`, `border` semi-transparente
  e `box-shadow` suave DEVEM ser aplicados a cards, modais e painéis.
- Nenhuma cor, espaçamento ou shadow ad-hoc pode ser inserido fora do token system.
- Interações (hover, focus, loading, error) DEVEM ser consistentes e previsíveis em
  toda a aplicação.

**Rationale**: A confiabilidade percebida começa pela consistência visual. Um produto
que parece premium reduz fricção e aumenta retenção.

### II. Multi-Tenancy First

Isolamento de dados entre clientes é ABSOLUTO e NÃO NEGOCIÁVEL.

- Toda query ao banco de dados DEVE incluir filtro explícito por `tenant_id`; queries
  sem esse filtro são consideradas bug crítico.
- O schema do banco DEVE modelar isolamento multi-tenant desde a primeira migration;
  adicionar tenant_id retroativamente está proibido.
- Middleware de autenticação DEVE validar e injetar o contexto de tenant em cada
  requisição autenticada antes de qualquer lógica de negócio ser executada.
- Nenhum objeto, cache ou sessão pode ser compartilhado entre tenants diferentes.
- Testes de isolamento DEVEM cobrir cenários de cross-tenant access para cada endpoint
  que opera sobre dados sensíveis.

**Rationale**: Vazar dados entre clientes destrói confiança e gera responsabilidade
legal. Corrigir isolamento retroativamente em produção é inviável; DEVE ser correto
desde o início.

### III. Security First

Segurança é um requisito funcional, não um opcional de fase posterior.

- Autenticação DEVE usar JWT com expiração configurável; tokens DEVEM ser validados
  em todas as rotas protegidas sem exceção.
- Tokens de convite DEVEM ser de uso único: invalidados imediatamente após o primeiro
  uso bem-sucedido.
- Toda entrada de dados externa (body, query params, headers) DEVE ser validada
  server-side antes de qualquer processamento; validação client-side é complementar,
  nunca substituta.
- Nenhuma informação sensível (senhas, tokens, PII) pode aparecer em logs ou em
  respostas de erro expostas ao cliente.
- Zero trust em dados do cliente: nunca confiar em IDs, roles ou claims enviados
  diretamente pelo frontend sem verificação server-side.
- Code review DEVE incluir checklist de segurança antes de merge em main.

**Rationale**: Falhas de segurança em SaaS multi-tenant têm impacto amplificado —
um vetor compromete potencialmente todos os clientes. O custo de correção pós-produção
é ordens de magnitude maior que prevenção.

### IV. Clean & Scalable Code

O código é um ativo de longo prazo; legibilidade e manutenibilidade DEVEM superar
esperteza.

- Funções e métodos DEVEM ter responsabilidade única e clara; nomes de identificadores
  devem dispensar comentários explicativos do "o quê".
- Módulos e camadas DEVEM ter fronteiras explícitas; dependências cruzadas sem
  justificativa são proibidas.
- Nenhuma dependência externa pode ser adicionada sem justificativa documentada no PR.
- Código morto DEVE ser removido; branches comentadas e arquivos orfãos NÃO DEVEM
  existir em main.
- Convenções de nomenclatura e estrutura de diretórios DEVEM ser consistentes em todo
  o repositório.
- Escalabilidade horizontal DEVE ser considerada nas decisões de arquitetura desde o
  início, mesmo que não implementada na v1.

**Rationale**: Um codebase difícil de ler é um passivo. A velocidade de entrega cai
exponencialmente à medida que a complexidade acidental cresce.

### V. V1 Pragmatism — Core First

Na v1, entregar o fluxo core funcionando tem prioridade absoluta sobre qualidade
técnica perfeita ou features secundárias.

- YAGNI (You Aren't Gonna Need It) é lei: nenhuma abstração, feature ou otimização
  DEVE ser implementada antes de existir caso de uso concreto e validado.
- Três linhas similares são preferíveis a uma abstração prematura; abstrair somente
  quando o padrão estiver provado.
- Over-engineering DEVE ser sinalizado em code review e revertido se não houver
  justificativa de necessidade imediata.
- O fluxo core (happy path) DEVE estar funcional e testável antes de qualquer
  tratamento de edge cases não-críticos.
- Otimizações de performance DEVEM ser medidas antes de implementadas; otimizar
  sem profiling é proibido.

**Rationale**: A v1 valida hipóteses de produto. Complexidade técnica prematura
desperdiça recursos em funcionalidades que podem ser descartadas.

## Restrições de Arquitetura SaaS

- O backend DEVE expor a API como contrato primário (REST ou GraphQL); o frontend
  DEVE consumir exclusivamente essa API, nunca acessar o banco diretamente.
- Autenticação e autorização DEVEM ser camadas separadas e explícitas; nenhuma
  lógica de negócio pode assumir identidade do usuário sem passar por ambas.
- O schema do banco DEVE ser versionado via migrations com histórico auditável;
  alterações manuais em produção são proibidas.
- Variáveis de ambiente DEVEM ser o mecanismo de configuração entre ambientes;
  nenhum segredo pode ser hardcoded no código-fonte.
- Estado global implícito é proibido; dependências DEVEM ser explícitas e injetáveis.

## Fluxo de Desenvolvimento

- Toda feature DEVE passar pelo ciclo: `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → implementação; pull requests sem spec associada requerem
  justificativa explícita.
- O **Constitution Check** é um gate obrigatório em todo `plan.md` antes de iniciar
  implementação; os cinco princípios acima DEVEM ser verificados explicitamente.
- Code review DEVE cobrir: isolamento de tenant, validação de inputs, conformidade
  com design system e ausência de over-engineering.
- Cada tarefa DEVE ser independentemente verificável; tarefas que não podem ser
  testadas isoladamente DEVEM ser quebradas em subtarefas menores.
- Commits DEVEM ser atômicos e descritivos; um commit por tarefa lógica concluída.

## Governance

Esta constituição é o documento de autoridade máxima do projeto Ávimus Connect.
Toda decisão técnica ou de produto DEVE ser consistente com os princípios aqui
definidos. Em caso de conflito com outras práticas ou convenções, esta constituição
prevalece.

**Processo de Emenda**:
1. Propor a emenda com justificativa detalhada em PR dedicado.
2. Descrever impacto nos princípios existentes e nos templates dependentes.
3. Atualizar todos os artefatos afetados (templates, planos ativos) no mesmo PR.
4. Incrementar a versão seguindo semântica: MAJOR para remoção/redefinição de
   princípio; MINOR para adição/expansão; PATCH para clarificações.

**Compliance**: Todo PR que toca arquitetura, autenticação, dados de tenant ou
componentes de interface DEVE referenciar explicitamente os princípios relevantes
desta constituição no description.

**Version**: 1.0.0 | **Ratified**: 2026-06-03 | **Last Amended**: 2026-06-03
