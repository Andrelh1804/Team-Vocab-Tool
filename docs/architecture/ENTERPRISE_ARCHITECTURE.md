# NexSupport AI — Especificação Técnica de Arquitetura Enterprise

**Versão:** 1.0  
**Data:** Julho 2025  
**Status:** Documento de Referência Arquitetural  
**Classificação:** Confidencial — Uso Interno

---

## Índice

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Diagrama Textual dos Microsserviços](#2-diagrama-textual-dos-microsserviços)
3. [Fluxo Completo de Comunicação](#3-fluxo-completo-de-comunicação)
4. [Justificativa Técnica das Tecnologias](#4-justificativa-técnica-das-tecnologias)
5. [Estrutura do Monorepo](#5-estrutura-do-monorepo)
6. [Catálogo de Microsserviços](#6-catálogo-de-microsserviços)
7. [Catálogo de Eventos](#7-catálogo-de-eventos)
8. [Estratégia de Escalabilidade](#8-estratégia-de-escalabilidade)
9. [Estratégia de Segurança](#9-estratégia-de-segurança)
10. [Roadmap Técnico](#10-roadmap-técnico)

---

## 1. Arquitetura Geral

### 1.1 Visão Estratégica

A NexSupport AI é uma plataforma SaaS **Multi-Tenant** para gestão de TI corporativa, projetada para monitorar centenas de milhares de dispositivos simultaneamente. A arquitetura adota os princípios de **Domain-Driven Design (DDD)**, **Clean Architecture**, **Hexagonal Architecture** e **CQRS**, permitindo escalabilidade horizontal ilimitada sem acoplamento entre domínios.

### 1.2 Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTES                                    │
│   Web App (React)  │  Admin Panel  │  Mobile  │  Agent (Windows/    │
│                    │               │          │  Linux/macOS)        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EDGE / CDN LAYER                                 │
│              Cloudflare (WAF, DDoS, CDN, DNS)                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                               │
│   Rate Limit │ Auth (JWT/OAuth2/OIDC) │ Routing │ Versioning        │
│   Compression │ Audit Log │ Circuit Breaker │ Load Balancer         │
└─────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  IDENTITY &     │  │   CORE DOMAIN    │  │   AI / ML DOMAIN   │
│  TENANT DOMAIN  │  │   SERVICES       │  │   SERVICES         │
└─────────────────┘  └──────────────────┘  └────────────────────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MESSAGE BROKER LAYER                              │
│              RabbitMQ (Events) │ Redis Streams (Real-time)          │
└─────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   PostgreSQL    │  │  TimescaleDB     │  │   Redis Cluster    │
│   (per-tenant   │  │  (time-series    │  │   (cache/sessions/ │
│   schemas)      │  │  metrics)        │  │   pub-sub)         │
└─────────────────┘  └──────────────────┘  └────────────────────┘
              │                 │                 │
              ▼                 ▼                 ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   pgvector      │  │   MinIO          │  │   Elasticsearch    │
│   (embeddings   │  │   (files/scripts │  │   (full-text       │
│   RAG/semantic) │  │   reports)       │  │   search/logs)     │
└─────────────────┘  └──────────────────┘  └────────────────────┘
```

### 1.3 Princípios Arquiteturais Aplicados

| Princípio | Aplicação |
|-----------|-----------|
| **DDD** | Cada microsserviço é um Bounded Context com linguagem ubíqua própria |
| **Clean Architecture** | Camadas: Domain → Application → Infrastructure → Presentation |
| **Hexagonal (Ports & Adapters)** | Domínio isolado via interfaces; adapters para DB, MQ, HTTP |
| **CQRS** | Commands e Queries segregados em todos os serviços com estado |
| **Repository Pattern** | Acesso a dados encapsulado por repositórios por agregado |
| **Factory Pattern** | Criação de entidades complexas (Tenant, Agent, Alert) isolada |
| **DI** | Inversão de dependência em toda a camada de aplicação |
| **Event-Driven** | Comunicação assíncrona entre domínios via eventos de domínio |
| **Saga Pattern** | Transações distribuídas (ex: onboarding de tenant) com compensação |
| **Outbox Pattern** | Garantia de entrega de eventos junto à transação de banco |
| **Idempotência** | Todos os handlers de eventos e endpoints POST/PUT possuem chave de idempotência |
| **API First / Contract First** | OpenAPI 3.1 como fonte única de verdade para todos os contratos |

---

## 2. Diagrama Textual dos Microsserviços

### 2.1 Mapa de Domínios e Serviços

```
DOMÍNIO: IDENTITY & ACCESS
├── identity-service         ← AuthN/AuthZ, JWT, OAuth2, OIDC, MFA
├── tenant-service           ← Gerenciamento de tenants, planos, isolamento
└── user-service             ← Usuários, perfis, RBAC, convites

DOMÍNIO: ASSET MANAGEMENT
├── inventory-service        ← Inventário de dispositivos, CMDB
├── hardware-service         ← Hardware specs, CPU/RAM/disk, SMART
├── software-inventory-svc   ← Software instalado, versões, CVEs
├── license-service          ← Licenças de software, conformidade
└── discovery-service        ← Descoberta automática via rede (SNMP, WMI, SSH)

DOMÍNIO: MONITORING
├── agent-service            ← Gerenciamento de agentes instalados
├── performance-service      ← Métricas de performance, séries temporais
├── alert-service            ← Regras de alerta, threshold, correlação
├── snmp-service             ← Polling SNMP para network devices
└── printer-monitoring-svc   ← Status de impressoras, toner, papel

DOMÍNIO: AUTOMATION & AI
├── automation-service       ← Regras, gatilhos, workflows
├── script-library-service   ← Repositório de scripts PowerShell/Bash/Python
├── ai-service               ← Orquestrador de IA, diagnósticos, sugestões
├── rag-service              ← Retrieval-Augmented Generation, knowledge base
└── embedding-service        ← Geração e indexação de embeddings vetoriais

DOMÍNIO: HELPDESK
├── ticket-service           ← Chamados, SLA, assignees, comments
└── knowledge-base-service   ← Base de conhecimento, artigos, soluções

DOMÍNIO: COMMUNICATION
├── notification-service     ← Email, SMS, Push, Slack, Teams, webhooks
└── webhook-service          ← Delivery de eventos para sistemas externos

DOMÍNIO: REMOTE ACCESS
└── remote-access-service    ← Shell remoto, RDP proxy, VNC, file transfer

DOMÍNIO: ANALYTICS & REPORTING
├── reporting-service        ← Geração de relatórios PDF/XLSX
├── dashboard-service        ← Agregação de dados para dashboards
└── analytics-service        ← Análise histórica, trends, forecasting

DOMÍNIO: PLATFORM
├── file-service             ← Upload/download de arquivos via MinIO
├── scheduler-service        ← Agendamento de tarefas (cron distribuído)
├── configuration-service    ← Feature flags, configurações dinâmicas
├── secrets-service          ← Gestão segura de segredos (Vault integrado)
├── update-service           ← Deploy de atualizações de agente
├── audit-service            ← Log imutável de auditoria por tenant
└── integration-service      ← Integrações com ServiceNow, Jira, AD, etc.

DOMÍNIO: BILLING
├── billing-service          ← Cobranças, invoices, histórico
├── subscription-service     ← Planos, limites, metering
└── marketplace-service      ← Plugins, extensões, add-ons

DOMÍNIO: OBSERVABILIDADE
└── telemetry-service        ← Coleta de telemetria dos agentes
```

### 2.2 Relações entre Domínios

```
identity-service ──────────────────► TODOS OS SERVIÇOS (validação de token)
tenant-service ─────────────────────► inventory, performance, alert, ticket...
agent-service ──────────────────────► performance, hardware, software-inventory
discovery-service ──────────────────► inventory (cria/atualiza dispositivos)
alert-service ──────────────────────► notification, ticket (auto-criação), ai
automation-service ─────────────────► script-library, alert, ticket, notification
ai-service ─────────────────────────► rag, embedding, script-library, performance
ticket-service ─────────────────────► notification, knowledge-base, ai
subscription-service ───────────────► billing, feature-flags (via config-service)
audit-service ◄─────────────────────── TODOS OS SERVIÇOS (consume eventos)
```

---

## 3. Fluxo Completo de Comunicação

### 3.1 Matriz de Protocolos por Cenário

| Protocolo | Quando Usar | Serviços |
|-----------|-------------|----------|
| **REST/HTTP** | Operações CRUD síncronas, consultas simples, operações que precisam de resposta imediata | API Gateway → todos os serviços; serviço → serviço síncrono |
| **GraphQL** | Consultas flexíveis com múltiplos campos, dashboards que precisam de dados compostos sem over-fetching | Dashboard Service, Reporting Service (query interface) |
| **WebSocket** | Streaming em tempo real: métricas ao vivo, status de alertas, notificações push, terminal remoto | Performance Service, Alert Service, Remote Access Service |
| **RabbitMQ** | Eventos de domínio assíncronos, integração entre bounded contexts, processamento garantido com ACK | DeviceDiscovered → inventory; AlertTriggered → notification/ticket |
| **Redis Streams** | Telemetria de alta frequência, streaming de métricas de agentes, filas com consumer groups | Agent → Telemetry Service → Performance Service |
| **gRPC/RPC** | Comunicação interna entre serviços com contrato forte e baixa latência | AI Service ↔ RAG Service ↔ Embedding Service |

### 3.2 Fluxo: Onboarding de Novo Tenant (Saga)

```
[Admin] ──POST /tenants──► [API Gateway]
                                │
                                ▼
                        [Tenant Service]
                         │  Cria tenant
                         │  Publica: TenantCreated
                                │
              ┌─────────────────┼──────────────────────┐
              ▼                 ▼                      ▼
     [Identity Service]  [Billing Service]    [Config Service]
     Cria namespace      Cria subscription    Provisiona feature flags
     RBAC inicial        Aplica plano trial   do plano
              │                 │                      │
              ▼                 ▼                      ▼
     Publica:            Publica:              Publica:
     TenantNamespace     SubscriptionCreated   TenantConfigured
     Provisioned
              │
              ▼
     [Audit Service] ◄──── Todos os eventos acima são consumidos
```

### 3.3 Fluxo: Agente Reportando Problema Crítico

```
[Agent Windows]
  │  WebSocket/HTTPS
  ▼
[API Gateway] → valida JWT do agente → roteamento
  │
  ▼
[Telemetry Service]  ← Redis Streams: alta frequência
  │  Detecta CPU > 90% por 5 min
  │  Publica: HighCPUDetected
  ▼
[RabbitMQ: monitoring.events]
  │
  ├──► [Alert Service]
  │      Avalia regras do tenant
  │      Correlaciona com outros eventos
  │      Publica: AlertCreated (severity=critical)
  │           │
  │           ├──► [Notification Service] → Email/Slack/Teams
  │           │
  │           ├──► [Ticket Service] → Cria ticket automático
  │           │
  │           └──► [AI Service] → Inicia diagnóstico assíncrono
  │                    │
  │                    ├──► [RAG Service] → busca KB por problema similar
  │                    └──► [Script Library] → sugere script de remediação
  │
  └──► [Audit Service] → Registra evento imutável
```

### 3.4 Fluxo: Execução de Automação

```
[Automation Service]
  │  Trigger: alert_created (severity=critical)
  │  Rule: "Reiniciar serviço + abrir ticket"
  ▼
[Scheduler Service] → agenda execução imediata
  │
  ├──► [Script Library Service] → busca script de restart
  │
  ├──► [Agent Service] → envia comando ao agente via WebSocket
  │         │
  │         ▼
  │    [Agent Windows] → executa PowerShell → retorna resultado
  │
  └──► [Audit Service] → AutomationExecuted
           │
           ▼
       [Notification Service] → notifica resultado ao operador
```

---

## 4. Justificativa Técnica das Tecnologias

### 4.1 Bancos de Dados

#### PostgreSQL (Dados Transacionais por Tenant)

**O que armazena:** Tenants, usuários, dispositivos, tickets, automações, scripts, alertas, licenças, configurações.

**Estratégia de isolamento Multi-Tenant:**
```
Opção adotada: Schema-per-Tenant
├── schema: public           → tabelas de sistema, tenants, planos
├── schema: tenant_{uuid}    → todos os dados do tenant isolados
│     ├── devices
│     ├── tickets
│     ├── alerts
│     ├── automations
│     └── ...
└── Row Level Security (RLS) como segunda camada de proteção
```

**Particionamento:** Tabelas de alto volume (audit_logs, device_metrics) particionadas por `created_at` (partição mensal). PostgreSQL nativo via `PARTITION BY RANGE`.

**Índices críticos:**
- `devices(tenant_id, status)` — filtro mais frequente
- `alerts(tenant_id, created_at DESC, severity)` — listagem paginada
- `tickets(tenant_id, status, assignee_id)` — dashboard helpdesk
- `audit_logs(tenant_id, created_at DESC)` — particionado + índice parcial

**Alta disponibilidade:** PostgreSQL 16 com Patroni (HA) + PgBouncer (connection pooling). Primary + 2 replicas. Failover automático < 30s.

**Backup:** pg_basebackup diário + WAL archiving contínuo para S3/MinIO. Retenção: 30 dias full + 1 ano WAL.

---

#### TimescaleDB (Métricas de Performance)

**O que armazena:** CPU, memória, disco, rede, temperatura — séries temporais dos agentes. Volume estimado: 100B+ pontos/mês em escala máxima.

**Modelo:**
```sql
CREATE TABLE device_metrics (
  time        TIMESTAMPTZ NOT NULL,
  device_id   UUID        NOT NULL,
  tenant_id   UUID        NOT NULL,
  metric_name TEXT        NOT NULL,
  value       DOUBLE PRECISION,
  tags        JSONB
);
SELECT create_hypertable('device_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
```

**Políticas de retenção:**
- Dados brutos: 30 dias (1 ponto/minuto por métrica)
- Agregados horários: 1 ano (via continuous aggregates)
- Agregados diários: 3 anos
- Agregados mensais: indefinido

**Compressão:** TimescaleDB native compression ativa após 7 dias. Redução estimada: 90% de espaço.

**Particionamento:** Hypertables automáticas por tempo + partição por `device_id` (space partitioning) para distribuição de carga.

---

#### Redis Cluster (Cache, Sessões, Pub/Sub, Rate Limiting)

**O que armazena:**
- Sessões JWT (TTL = expiração do token)
- Cache de queries frequentes (device list, dashboard KPIs)
- Rate limit counters por IP/API key/tenant
- Pub/Sub para notificações em tempo real via WebSocket
- Distributed locks (Redlock) para operações singleton

**Estratégia de cache:**
```
Cache-Aside padrão:
1. App lê do Redis → HIT: retorna direto
2. MISS: lê do PostgreSQL → salva no Redis com TTL → retorna
3. Invalidação por evento de domínio (ex: DeviceUpdated → invalida cache)

TTLs:
- Dashboard KPIs: 30s (dados quase-real-time)
- Device list: 60s
- User session: 3600s (renovável)
- Rate limit window: 60s (sliding window)
```

**Alta disponibilidade:** Redis Cluster (6 nodes: 3 masters + 3 replicas) com sentinel. Failover automático.

---

#### pgvector (Embeddings para RAG)

**O que armazena:** Embeddings vetoriais de: artigos da base de conhecimento, scripts, soluções de tickets anteriores, diagnósticos de IA. Permite busca semântica (similaridade cosseno/L2).

**Modelo:**
```sql
CREATE TABLE knowledge_embeddings (
  id          UUID PRIMARY KEY,
  tenant_id   UUID,
  source_type TEXT,   -- 'kb_article' | 'script' | 'ticket_solution'
  source_id   UUID,
  content     TEXT,
  embedding   vector(1536),  -- OpenAI ada-002 / local model
  created_at  TIMESTAMPTZ
);
CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Estratégia:** Embeddings gerados de forma assíncrona pelo Embedding Service. Reindexação incremental via evento `KnowledgeBaseUpdated`.

---

#### MinIO (Object Storage)

**O que armazena:** Scripts de automação, relatórios PDF/XLSX, logs de execução de agente, backups de configuração, instaladores de agente, assets de UI whitelabel.

**Estrutura de buckets:**
```
nexsupport-agents/          → instaladores por versão/OS
nexsupport-scripts/         → scripts por tenant (lifecycle via S3 policies)
nexsupport-reports/         → relatórios gerados (TTL: 90 dias)
nexsupport-audit-exports/   → exports de audit para LGPD
nexsupport-backups/         → backups de configuração (TTL: 1 ano)
```

**Políticas:** Acesso via presigned URLs com expiração de 15 min. Buckets privados. Replicação cross-region para DR.

---

### 4.2 API Gateway

**Tecnologia recomendada:** Kong Gateway (open-source) ou Traefik Enterprise.

**Funcionalidades projetadas:**

```yaml
Rate Limiting:
  - Por IP: 1000 req/min (unauthenticated)
  - Por API Key: conforme plano do tenant
    - Starter: 5.000 req/hora
    - Pro: 50.000 req/hora
    - Enterprise: ilimitado (com burst protection)
  - Por endpoint sensível: /ai/chat → 100 req/hora/tenant

Autenticação:
  - JWT (RS256): tokens de usuário interno
  - OAuth2 + OIDC: SSO com Google, Microsoft, Okta
  - API Keys: integração machine-to-machine
  - mTLS: comunicação dos agentes (certificados por tenant)

Versionamento:
  - Header: Accept-Version: v1 / v2
  - Path: /api/v1/ → /api/v2/ (deprecation após 12 meses)

Cache:
  - GET endpoints: Cache-Control headers + Vary: Authorization
  - Shared cache para dados públicos (status page, planos)

Compressão:
  - gzip/brotli para responses > 1KB

Auditoria:
  - Todos os requests logados com: tenant_id, user_id, ip, endpoint, status, latency
  - Forwarded para Audit Service via RabbitMQ (fire-and-forget)

Circuit Breaker:
  - Configurado por rota upstream
  - Threshold: 50% falhas em 10s → abre circuito por 30s
```

---

## 5. Estrutura do Monorepo

### 5.1 Organização com Turborepo

```
nexsupport/
├── turbo.json                    ← Pipeline de build Turborepo
├── package.json                  ← Workspace root
├── pnpm-workspace.yaml
│
├── apps/                         ← Aplicações deployáveis
│   ├── web/                      ← Frontend principal (React + Vite)
│   ├── admin/                    ← Painel super-admin interno
│   ├── api-gateway/              ← Kong config / custom gateway middleware
│   ├── identity-service/         ← Auth, JWT, OAuth2, MFA
│   ├── tenant-service/           ← Multi-tenancy, isolamento, planos
│   ├── user-service/             ← Usuários, RBAC, convites
│   ├── inventory-service/        ← CMDB, dispositivos
│   ├── hardware-service/         ← Hardware specs, SMART
│   ├── software-inventory-svc/   ← Software instalado, CVEs
│   ├── license-service/          ← Licenças, conformidade
│   ├── discovery-service/        ← Auto-discovery SNMP/WMI
│   ├── agent-service/            ← Gerenciamento de agentes
│   ├── performance-service/      ← Métricas, TimescaleDB
│   ├── alert-service/            ← Alertas, correlação, threshold
│   ├── snmp-service/             ← SNMP polling
│   ├── printer-monitoring-svc/   ← Impressoras
│   ├── automation-service/       ← Regras, gatilhos, workflows
│   ├── script-library-service/   ← Repositório de scripts
│   ├── ai-service/               ← Orquestrador IA, diagnósticos
│   ├── rag-service/              ← RAG, contexto, knowledge retrieval
│   ├── embedding-service/        ← Geração de embeddings
│   ├── ticket-service/           ← Helpdesk, SLA, comments
│   ├── knowledge-base-service/   ← KB, artigos, soluções
│   ├── notification-service/     ← Email, SMS, Push, Slack
│   ├── webhook-service/          ← Delivery de eventos externos
│   ├── remote-access-service/    ← Shell remoto, RDP proxy
│   ├── reporting-service/        ← Relatórios PDF/XLSX
│   ├── dashboard-service/        ← Agregação para dashboards
│   ├── analytics-service/        ← Análise histórica, trends
│   ├── file-service/             ← Upload/download MinIO
│   ├── scheduler-service/        ← Cron distribuído
│   ├── configuration-service/    ← Feature flags, config dinâmica
│   ├── secrets-service/          ← Vault integration
│   ├── update-service/           ← OTA updates de agentes
│   ├── audit-service/            ← Log imutável de auditoria
│   ├── integration-service/      ← ServiceNow, Jira, AD, etc.
│   ├── billing-service/          ← Cobranças, invoices
│   ├── subscription-service/     ← Planos, metering, limites
│   ├── marketplace-service/      ← Plugins, extensões
│   └── telemetry-service/        ← Ingestão de telemetria
│
├── agents/                       ← Agentes de endpoint instaláveis
│   ├── windows-agent/            ← Go ou Rust — WMI, PowerShell, WinRM
│   ├── linux-agent/              ← Go — /proc, systemd, SSH
│   └── macos-agent/              ← Go — IOKit, launchd, AppleScript
│
├── packages/                     ← Pacotes compartilhados internos
│   ├── ui/                       ← Design system (shadcn base + NexSupport tokens)
│   ├── config/                   ← ESLint, TypeScript, Prettier configs
│   ├── auth/                     ← JWT helpers, OIDC client, middleware
│   ├── database/                 ← Drizzle ORM, migrations, seed, schema base
│   ├── logger/                   ← Pino structured logger com trace context
│   ├── telemetry/                ← OpenTelemetry SDK, traces, metrics, spans
│   ├── events/                   ← Tipos de eventos de domínio (TypeScript)
│   ├── contracts/                ← OpenAPI schemas, Zod validators gerados
│   ├── common/                   ← Utilities, error types, Result<T,E> monad
│   └── sdk/                      ← SDK público para integrações de clientes
│
├── libs/                         ← Bibliotecas de protocolo e contratos
│   ├── shared/                   ← Types compartilhados entre apps
│   ├── protocols/                ← Protobuf/gRPC definitions (AI, RAG, etc.)
│   ├── events/                   ← Event schemas JSON Schema / AsyncAPI
│   └── contracts/                ← OpenAPI specs por serviço
│
├── infra/                        ← Infraestrutura como código
│   ├── docker/
│   │   ├── docker-compose.yml            ← Desenvolvimento local completo
│   │   ├── docker-compose.test.yml       ← Ambiente de testes integração
│   │   └── dockerfiles/                  ← Dockerfiles multi-stage por serviço
│   ├── kubernetes/
│   │   ├── base/                         ← Manifests base (Deployments, Services, HPA)
│   │   ├── overlays/
│   │   │   ├── development/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── charts/                       ← Helm charts por serviço
│   └── terraform/
│       ├── modules/
│       │   ├── eks/                      ← AWS EKS cluster
│       │   ├── gke/                      ← Google GKE cluster
│       │   ├── rds/                      ← PostgreSQL RDS
│       │   ├── elasticache/              ← Redis
│       │   └── s3/                       ← Object storage
│       ├── environments/
│       │   ├── aws-production/
│       │   ├── gcp-production/
│       │   └── hetzner-staging/
│       └── shared/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                ← Lint, test, typecheck por app/package afetado
│       ├── cd-staging.yml        ← Deploy automático para staging
│       ├── cd-production.yml     ← Deploy com aprovação manual para prod
│       └── security-scan.yml     ← Trivy, Snyk, SAST
│
└── docs/
    ├── architecture/             ← Este documento e diagramas
    ├── api/                      ← OpenAPI specs geradas
    ├── runbooks/                 ← Procedimentos operacionais
    ├── adr/                      ← Architecture Decision Records
    └── onboarding/               ← Guia de desenvolvimento
```

---

## 6. Catálogo de Microsserviços

### 6.1 identity-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Autenticação (AuthN) e autorização (AuthZ) de todos os usuários e agentes da plataforma |
| **Banco** | PostgreSQL (users, sessions, roles, permissions, oauth_providers) + Redis (sessions, tokens de refresh) |
| **Endpoints principais** | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /oauth/callback` |
| **Eventos publicados** | `UserLoggedIn`, `UserLoggedOut`, `PasswordChanged`, `MfaEnabled`, `TokenRevoked` |
| **Eventos consumidos** | `UserCreated` (de user-service), `TenantSuspended` (invalida todas as sessões) |
| **Dependências** | user-service, tenant-service |
| **Escalabilidade** | Stateless com JWT RS256; escala horizontal ilimitada; sessions no Redis |
| **Cache** | Public keys (JWKS) em Redis TTL 5min; blacklist de tokens revogados |

---

### 6.2 tenant-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Gerenciamento do ciclo de vida de tenants: criação, configuração, isolamento, suspensão, deleção |
| **Banco** | PostgreSQL (schema: public — tenants, plans, tenant_settings, tenant_domains) |
| **Endpoints principais** | `POST /tenants`, `GET /tenants/:id`, `PUT /tenants/:id`, `POST /tenants/:id/suspend` |
| **Eventos publicados** | `TenantCreated`, `TenantSuspended`, `TenantDeleted`, `TenantPlanChanged`, `TenantConfigured` |
| **Eventos consumidos** | `SubscriptionExpired` (suspende tenant), `PaymentFailed` |
| **Dependências** | subscription-service, billing-service |
| **Escalabilidade** | Baixo volume de operações; cache por tenant_id em Redis (TTL 5min) |
| **Cache** | Tenant metadata (plano, features ativas, limites) por tenant_id |

---

### 6.3 inventory-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | CMDB — repositório central de todos os dispositivos gerenciados, relacionamentos e metadados |
| **Banco** | PostgreSQL (schema por tenant: devices, device_groups, device_tags, device_relations) |
| **Endpoints principais** | `GET /devices`, `POST /devices`, `PUT /devices/:id`, `GET /devices/:id`, `DELETE /devices/:id` |
| **Eventos publicados** | `DeviceRegistered`, `DeviceUpdated`, `DeviceDeleted`, `DeviceGroupChanged` |
| **Eventos consumidos** | `DeviceDiscovered` (de discovery-service), `AgentInstalled`, `AgentOffline` |
| **Dependências** | tenant-service |
| **Escalabilidade** | Read-heavy; replicas de leitura do PostgreSQL; cache de listagem por tenant/filtro |
| **Cache** | Device list por tenant (invalidação por DeviceUpdated); device detail por device_id |

---

### 6.4 performance-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Ingestão, armazenamento e consulta de métricas de performance de dispositivos em série temporal |
| **Banco** | TimescaleDB (device_metrics hypertable) + Redis (últimas leituras por device para alertas) |
| **Endpoints principais** | `POST /metrics` (ingestão bulk), `GET /metrics/:deviceId`, `GET /metrics/aggregate` |
| **Eventos publicados** | `MetricsIngested`, `HighCPUDetected`, `MemoryAlert`, `DiskWarning` |
| **Eventos consumidos** | `AgentMetricsBatch` (de telemetry-service via Redis Streams) |
| **Dependências** | telemetry-service, alert-service |
| **Escalabilidade** | Write-heavy; TimescaleDB chunks distribuídos; ingestão via batch com buffer de 5s |
| **Cache** | Últimas métricas por device (TTL 30s); aggregates de dashboard (TTL 60s) |

---

### 6.5 alert-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Definição de regras de alerta, avaliação de threshold, correlação de eventos, lifecycle de alertas |
| **Banco** | PostgreSQL (alert_rules, alerts, alert_history) + Redis (estado de alertas ativos, supressão) |
| **Endpoints principais** | `GET /alerts`, `GET /alerts/summary`, `POST /alerts/:id/acknowledge`, `POST /alerts/:id/resolve` |
| **Eventos publicados** | `AlertCreated`, `AlertAcknowledged`, `AlertResolved`, `AlertEscalated` |
| **Eventos consumidos** | `HighCPUDetected`, `MemoryAlert`, `DiskWarning`, `AgentOffline`, `PrinterOffline`, `SmartFailureDetected` |
| **Dependências** | performance-service, inventory-service, notification-service |
| **Escalabilidade** | Processamento de regras em paralelo; motor de correlação distribuído; Redis para deduplicação |
| **Cache** | Regras de alerta por tenant (TTL 30s, invalidadas ao salvar nova regra); alertas ativos em Redis |

---

### 6.6 ai-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Orquestração de funcionalidades de IA: diagnóstico de dispositivos, sugestão de scripts, análise de alertas, chat assistant |
| **Banco** | PostgreSQL (ai_sessions, ai_analyses, ai_feedback) + pgvector (via rag-service) |
| **Endpoints principais** | `POST /ai/chat`, `POST /ai/diagnose/:deviceId`, `POST /ai/suggest-script` |
| **Eventos publicados** | `AIAnalysisCompleted`, `AIScriptSuggested`, `AIFeedbackReceived` |
| **Eventos consumidos** | `AlertCreated` (diagnóstico automático em criticals), `TicketCreated` (sugestão de solução) |
| **Dependências** | rag-service, embedding-service, script-library-service, performance-service |
| **Escalabilidade** | Stateless; rate limiting por tenant; fila assíncrona para análises pesadas |
| **Cache** | Análises idênticas deduplicadas (hash do contexto, TTL 10min) |

---

### 6.7 automation-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Definição e execução de workflows automáticos baseados em regras: gatilhos, condições, ações |
| **Banco** | PostgreSQL (automations, automation_runs, automation_logs) |
| **Endpoints principais** | `GET /automations`, `POST /automations`, `PUT /automations/:id`, `POST /automations/:id/toggle` |
| **Eventos publicados** | `AutomationTriggered`, `AutomationExecuted`, `AutomationFailed` |
| **Eventos consumidos** | `AlertCreated`, `TicketCreated`, `DeviceOffline`, `ScheduleTriggered` |
| **Dependências** | script-library-service, agent-service, scheduler-service, notification-service |
| **Escalabilidade** | Execuções em fila assíncrona (RabbitMQ); worker pool escalável |
| **Cache** | Definições de automação por tenant (TTL 60s) |

---

### 6.8 notification-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Entrega de notificações por múltiplos canais: Email (SMTP/SendGrid), SMS (Twilio), Push, Slack, Teams |
| **Banco** | PostgreSQL (notification_templates, notification_logs, user_preferences) + Redis (deduplicação, rate limit) |
| **Endpoints principais** | `POST /notifications/send`, `GET /notifications/history`, `PUT /preferences` |
| **Eventos publicados** | `NotificationSent`, `NotificationFailed`, `NotificationDelivered` |
| **Eventos consumidos** | `AlertCreated`, `AlertEscalated`, `TicketCreated`, `TicketAssigned`, `AutomationFailed` |
| **Dependências** | tenant-service, user-service |
| **Escalabilidade** | Workers por canal (email, SMS, push); rate limiting por tenant; retry com exponential backoff |
| **Cache** | Templates de notificação por tenant (TTL 5min); preferências por usuário |

---

### 6.9 billing-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Geração de invoices, cobrança por uso (metering), histórico financeiro, integração com Stripe |
| **Banco** | PostgreSQL (invoices, invoice_items, payment_methods, payment_history) |
| **Endpoints principais** | `GET /billing/invoices`, `POST /billing/charge`, `GET /billing/usage` |
| **Eventos publicados** | `InvoiceGenerated`, `PaymentSucceeded`, `PaymentFailed`, `SubscriptionExpired` |
| **Eventos consumidos** | `TenantCreated`, `SubscriptionChanged`, `UsageMetricRecorded` |
| **Dependências** | subscription-service, Stripe API |
| **Escalabilidade** | Processamento assíncrono de cobranças; idempotência via Stripe idempotency keys |
| **Cache** | Saldo/uso atual por tenant (TTL 5min para dashboard) |

---

### 6.10 audit-service

| Campo | Detalhes |
|-------|----------|
| **Responsabilidade** | Registro imutável de todas as ações significativas da plataforma. Append-only. Compliance LGPD/SOC2 |
| **Banco** | PostgreSQL (audit_events — append only, sem UPDATE/DELETE), particionado por mês |
| **Endpoints principais** | `GET /audit/events` (somente leitura), `GET /audit/events/export` |
| **Eventos publicados** | Nenhum (leaf service) |
| **Eventos consumidos** | TODOS os eventos de domínio de TODOS os serviços |
| **Dependências** | Nenhuma (apenas consome) |
| **Escalabilidade** | Write-heavy; inserções em batch; particionamento mensal; archive para MinIO após 6 meses |
| **Cache** | Nenhum (dados de auditoria não são cacheados por integridade) |

---

## 7. Catálogo de Eventos

### 7.1 Domínio: Device & Infrastructure

#### `DeviceDiscovered`
```json
{
  "eventId": "uuid-v7",
  "occurredAt": "ISO8601",
  "version": "1.0",
  "tenantId": "uuid",
  "payload": {
    "hostname": "string",
    "ipAddress": "string",
    "macAddress": "string",
    "type": "notebook|desktop|server|router|printer|...",
    "discoveryMethod": "agent|snmp|arp|mdns",
    "rawData": {}
  }
}
```
**Publicado por:** discovery-service, agent-service  
**Consumido por:** inventory-service (cria/atualiza device), audit-service

---

#### `AgentInstalled`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "agentVersion": "string",
    "os": "windows|linux|macos",
    "hostname": "string",
    "agentId": "uuid"
  }
}
```
**Publicado por:** agent-service  
**Consumido por:** inventory-service, notification-service, audit-service

---

#### `AgentOffline`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "agentId": "uuid",
    "lastSeenAt": "ISO8601",
    "offlineDurationSeconds": 300
  }
}
```
**Publicado por:** agent-service (heartbeat monitor)  
**Consumido por:** alert-service (gera alerta), automation-service (trigger), inventory-service (atualiza status), audit-service

---

#### `HighCPUDetected`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "hostname": "string",
    "cpuPercent": 92.5,
    "durationSeconds": 300,
    "threshold": 90.0,
    "topProcesses": [
      {"pid": 1234, "name": "sqlservr.exe", "cpu": 45.2}
    ]
  }
}
```
**Publicado por:** performance-service  
**Consumido por:** alert-service, ai-service, automation-service, audit-service

---

#### `MemoryAlert`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "memoryUsedPercent": 94.1,
    "availableMb": 512,
    "totalMb": 8192,
    "threshold": 90.0
  }
}
```
**Publicado por:** performance-service  
**Consumido por:** alert-service, ai-service, audit-service

---

#### `DiskFailureDetected` / `SmartFailureDetected`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "diskId": "string",
    "model": "string",
    "smartAttributes": {
      "reallocatedSectors": 5,
      "pendingSectors": 2,
      "uncorrectableErrors": 1,
      "healthStatus": "failing"
    },
    "predictedFailureDays": 7
  }
}
```
**Publicado por:** hardware-service  
**Consumido por:** alert-service (severity=critical), ai-service, notification-service, audit-service

---

#### `PrinterOffline` / `PrinterOnline`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "printerName": "string",
    "location": "string",
    "ipAddress": "string",
    "offlineSince": "ISO8601"
  }
}
```
**Publicado por:** printer-monitoring-service  
**Consumido por:** alert-service, notification-service, audit-service

---

#### `SoftwareInstalled` / `SoftwareRemoved`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "deviceId": "uuid",
    "softwareName": "string",
    "version": "string",
    "vendor": "string",
    "installDate": "ISO8601",
    "hasCve": true,
    "cveIds": ["CVE-2024-XXXX"]
  }
}
```
**Publicado por:** software-inventory-service (detectado pelo agente)  
**Consumido por:** license-service, audit-service, alert-service (CVE)

---

### 7.2 Domínio: Tenant & Identity

#### `TenantCreated`
```json
{
  "eventId": "uuid-v7",
  "payload": {
    "tenantId": "uuid",
    "name": "string",
    "plan": "starter|pro|enterprise",
    "adminEmail": "string",
    "country": "BR",
    "createdAt": "ISO8601"
  }
}
```
**Publicado por:** tenant-service  
**Consumido por:** identity-service, billing-service, subscription-service, configuration-service, audit-service

---

#### `UserCreated`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "userId": "uuid",
    "email": "string",
    "name": "string",
    "role": "admin|technician|viewer",
    "invitedBy": "uuid|null"
  }
}
```
**Publicado por:** user-service  
**Consumido por:** identity-service, notification-service (email de boas-vindas), audit-service

---

### 7.3 Domínio: Helpdesk

#### `TicketCreated`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "ticketId": "uuid",
    "title": "string",
    "priority": "critical|high|medium|low",
    "category": "string",
    "reporterId": "uuid",
    "deviceId": "uuid|null",
    "alertId": "uuid|null",
    "slaDeadline": "ISO8601|null"
  }
}
```
**Publicado por:** ticket-service  
**Consumido por:** notification-service, ai-service (sugestão automática), automation-service, audit-service

---

#### `TicketClosed`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "ticketId": "uuid",
    "resolution": "string",
    "closedBy": "uuid",
    "slaBreached": false,
    "resolutionTimeMinutes": 47
  }
}
```
**Publicado por:** ticket-service  
**Consumido por:** analytics-service, knowledge-base-service (aprende com solução), audit-service

---

### 7.4 Domínio: AI & Automation

#### `AIAnalysisCompleted`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "analysisId": "uuid",
    "deviceId": "uuid|null",
    "ticketId": "uuid|null",
    "type": "diagnosis|script_suggestion|alert_analysis",
    "summary": "string",
    "confidence": 0.94,
    "suggestedActions": ["string"],
    "scriptIds": ["uuid"]
  }
}
```
**Publicado por:** ai-service  
**Consumido por:** ticket-service (anexa análise), notification-service, audit-service

---

#### `AutomationExecuted`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "automationId": "uuid",
    "automationName": "string",
    "trigger": "alert|schedule|ticket_created|device_offline|manual",
    "deviceId": "uuid|null",
    "success": true,
    "executionTimeMs": 2340,
    "output": "string",
    "scriptId": "uuid|null"
  }
}
```
**Publicado por:** automation-service  
**Consumido por:** notification-service, audit-service, analytics-service

---

#### `LicenseExpired`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "licenseId": "uuid",
    "softwareName": "string",
    "expirationDate": "ISO8601",
    "devicesAffected": ["uuid"],
    "renewalCost": 1200.00,
    "currency": "BRL"
  }
}
```
**Publicado por:** license-service  
**Consumido por:** alert-service, notification-service, audit-service

---

#### `NotificationSent`
```json
{
  "eventId": "uuid-v7",
  "tenantId": "uuid",
  "payload": {
    "notificationId": "uuid",
    "channel": "email|sms|push|slack|teams",
    "recipientId": "uuid",
    "templateId": "string",
    "deliveryStatus": "sent|delivered|failed",
    "referenceEventId": "uuid"
  }
}
```
**Publicado por:** notification-service  
**Consumido por:** audit-service

---

## 8. Estratégia de Escalabilidade

### 8.1 Modelo de Crescimento

```
ESTÁGIO 1 — Até 100 empresas / ~50.000 dispositivos
─────────────────────────────────────────────────────
Infrastructure: Docker Compose ou Kubernetes single-cluster
Database: PostgreSQL single-node + TimescaleDB single-node
Cache: Redis single-node
Message Broker: RabbitMQ single-node
Microservices: Monorepo deployado como serviços separados, 1 replica cada
Custo estimado: $500–2.000/mês (Hetzner CX41 x4 ou Railway)

ESTÁGIO 2 — Até 1.000 empresas / ~500.000 dispositivos
─────────────────────────────────────────────────────────
Infrastructure: Kubernetes (EKS ou GKE) multi-zone
Database: PostgreSQL com Patroni HA (1 primary + 2 replicas) + PgBouncer
           TimescaleDB multi-node
Cache: Redis Cluster (3 masters + 3 replicas)
Message Broker: RabbitMQ cluster (3 nodes)
Microservices: HPA por serviço (min 2, max 10 replicas)
               Core services (alert, performance, notification): min 3
Custo estimado: $5.000–15.000/mês

ESTÁGIO 3 — Até 10.000 empresas / ~5.000.000 dispositivos
───────────────────────────────────────────────────────────
Infrastructure: Multi-cluster Kubernetes (por região: us-east, eu-west, sa-east)
Database: PostgreSQL com Citus (sharding horizontal por tenant_id)
           TimescaleDB distribuído com workers
Cache: Redis Enterprise com geo-replication
Message Broker: RabbitMQ Federation entre clusters regionais
Ingestão: Kafka para telemetria de alta frequência (substitui Redis Streams neste nível)
Read replicas: por região para latência <100ms
Custo estimado: $50.000–150.000/mês

ESTÁGIO 4 — Até 100.000 empresas / >100.000.000 dispositivos
──────────────────────────────────────────────────────────────
Infrastructure: Multi-cloud (AWS primary + GCP DR) com Istio service mesh
Database: Citus com 20+ worker nodes + read-only replicas regionais
           TimescaleDB + ClickHouse para analytics histórico
Cache: Distributed cache por serviço com local L1 + Redis L2
Message Broker: Apache Kafka (dedicated cluster por domínio)
Sharding: tenant_id hash-based routing no API Gateway
CDN: Cloudflare com edge caching de assets e APIs públicas
Custo estimado: $500.000+/mês (negociação enterprise com provedores)
```

### 8.2 Padrões de Escalabilidade Aplicados

#### Auto Scaling (Kubernetes HPA)
```yaml
# Exemplo: performance-service HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef: performance-service
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External
      external:
        metric:
          name: rabbitmq_queue_messages
          selector: "queue=telemetry.metrics"
        target:
          type: AverageValue
          averageValue: "1000"
```

#### Sharding de Tenants
- Hash de `tenant_id` para roteamento no nível do API Gateway
- Tenants "whale" (>100k devices) isolados em cluster dedicado
- Tenants regulares agrupados por região geográfica

#### Circuit Breaker
- Istio / Hystrix por rota de serviço
- Fallback graceful: cache stale ou degraded mode

#### Processamento Assíncrono
- Alertas: processados em fila, nunca síncrono
- Relatórios: gerados em background, URL entregue por notificação
- Diagnóstico IA: enfileirado com prioridade por severidade

#### Cache em Múltiplas Camadas
```
L1: In-process memory (Node.js Map, 5s TTL) — últimas queries por worker
L2: Redis Cluster (60s TTL) — compartilhado entre workers do mesmo serviço
L3: PostgreSQL read replica — queries com latência aceitável
```

---

## 9. Estratégia de Segurança

### 9.1 Identity & Access

#### RBAC (Role-Based Access Control)
```
Roles padrão por tenant:
├── super_admin     → acesso total ao tenant (criador)
├── admin           → gerencia usuários, configurações, billing
├── technician      → gerencia dispositivos, tickets, alertas, scripts
├── viewer          → somente leitura em tudo
└── api_bot         → acesso programático via API key (escopo limitado)

Roles de plataforma (super-admin NexSupport):
├── platform_admin  → acesso a todos os tenants (operações de suporte)
└── platform_ops    → leitura em todos os tenants (monitoramento)
```

#### ABAC (Attribute-Based Access Control)
Para casos mais granulares, combinado com RBAC:
- Técnico só pode ver dispositivos do seu grupo/localização
- Relatórios de billing só para admins do tenant
- Scripts marcados como "restrito" só executáveis por admin

#### Row Level Security (PostgreSQL RLS)
```sql
-- Exemplo: garantia de isolamento de dados por tenant no nível do banco
CREATE POLICY tenant_isolation ON devices
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
```
Toda conexão de serviço define `app.current_tenant_id` antes de executar queries.

### 9.2 Multi-Tenant Isolation

| Camada | Mecanismo de Isolamento |
|--------|------------------------|
| **Network** | Kubernetes NetworkPolicies; namespace por tenant em clusters dedicados |
| **API Gateway** | Tenant extraído do JWT; impossível acessar dados de outro tenant |
| **Aplicação** | `tenant_id` obrigatório em todas as queries; middleware de validação |
| **Banco** | Schema-per-tenant + RLS como segunda camada |
| **Armazenamento** | MinIO bucket policies; prefixo `tenant_{id}/` em todos os objetos |
| **Cache** | Prefixo `t:{tenant_id}:` em todas as keys Redis |
| **Logs** | `tenant_id` em todos os logs; acesso ao Grafana/Loki por tenant |

### 9.3 Criptografia e TLS

| Dado | Proteção |
|------|----------|
| **Dados em trânsito** | TLS 1.3 obrigatório em todas as conexões (externa e interna via mTLS) |
| **Dados em repouso** | PostgreSQL: pg_crypto para campos sensíveis (senhas de integração, API keys); AES-256 |
| **Secrets de integração** | HashiCorp Vault; nunca armazenados no PostgreSQL em plaintext |
| **Backups** | Criptografados com GPG antes do upload para MinIO/S3 |
| **Tokens JWT** | RS256 (assimétrico); private key no Vault; rotação anual |
| **API Keys** | Hash SHA-256 + salt no banco; nunca recuperável após criação |

### 9.4 Rotação de Chaves
- JWT RS256: rotação a cada 90 dias com período de sobreposição de 24h (JWKS endpoint com múltiplas chaves ativas)
- Encryption keys de banco: rotação anual via re-encryption job noturno
- Secrets de integração: notificação de expiração 30 dias antes + rotação manual pelo admin

### 9.5 LGPD (Lei Geral de Proteção de Dados)

| Requisito LGPD | Implementação |
|---------------|---------------|
| **Consentimento** | Opt-in explícito no onboarding; registro de consentimento com timestamp |
| **Direito ao esquecimento** | `DELETE /tenants/:id/gdpr-erasure` — soft delete + job de purge assíncrono |
| **Portabilidade** | `GET /audit/events/export` — exporta dados do tenant em JSON/CSV |
| **Minimização de dados** | Coleta apenas dados necessários; PII não enviado para logs/métricas |
| **Pseudonimização** | Logs de auditoria usam userId (UUID), não email/nome |
| **Data residency** | Deploy regional; tenants BR → cluster sa-east-1; EU → eu-west |

### 9.6 Proteção Contra Ataques (OWASP Top 10)

| Ameaça | Mitigação |
|--------|-----------|
| **Injection** | ORM parametrizado (Drizzle/Prisma); validação Zod em todos os inputs; RLS |
| **Broken Auth** | JWT curtos (15min) + refresh; MFA obrigatório para admins; lockout após 5 tentativas |
| **Sensitive Data Exposure** | HTTPS-only; campos sensíveis criptografados; PII removido de logs |
| **XXE** | Parsers XML configurados sem entity expansion |
| **Broken Access Control** | RBAC + ABAC + RLS; testes automatizados de autorização |
| **Security Misconfiguration** | Helm charts com defaults seguros; Trivy scan no CI; CIS Benchmarks no Kubernetes |
| **XSS** | CSP headers; sanitização de output no React; DOMPurify para conteúdo de usuário |
| **Insecure Deserialization** | Zod validation em todos os endpoints; schema-first com OpenAPI |
| **Using Vulnerable Components** | Renovate/Dependabot; Snyk scan semanal; CVE alerts automáticos |
| **Insufficient Logging** | Audit service imutável; alertas para eventos de segurança (brute force, anomalias) |

---

## 10. Observabilidade

### 10.1 Stack de Observabilidade

```
┌─────────────────────────────────────────────────────┐
│                    GRAFANA                          │  ← Dashboards unificados
├─────────────┬─────────────────┬────────────────────┤
│  Prometheus │      Loki       │       Tempo        │  ← Metrics / Logs / Traces
├─────────────┴─────────────────┴────────────────────┤
│              OpenTelemetry Collector                │  ← Coleta unificada
├─────────────────────────────────────────────────────┤
│         Todos os Microsserviços (SDK OTel)          │  ← Instrumentação automática
└─────────────────────────────────────────────────────┘
```

### 10.2 Instrumentação por Serviço

Cada serviço implementa via `@packages/telemetry`:
```typescript
// Auto-instrumentado via OpenTelemetry SDK
// Traces: HTTP requests, DB queries, MQ publish/consume
// Metrics: request_duration_ms, error_rate, queue_depth
// Logs: structured JSON com trace_id + span_id para correlação
```

### 10.3 Health Checks por Serviço
```
GET /health/live   → liveness (503 = reiniciar pod)
GET /health/ready  → readiness (503 = remover do load balancer)
GET /health/detail → status detalhado (DB, Redis, MQ connections)
```

### 10.4 Alertas de Plataforma
- Error rate > 1% em qualquer serviço → PagerDuty P2
- P99 latency > 500ms → alerta no Slack
- Queue depth > 10.000 mensagens → escalonamento automático + alerta
- Disk usage > 80% em qualquer banco → alerta P1

---

## 10. Roadmap Técnico

### Fase 1 — MVP Funcional (0–3 meses)
**Objetivo:** Plataforma operacional para primeiros clientes piloto

- [ ] Monorepo estruturado com Turborepo
- [ ] identity-service + tenant-service + user-service
- [ ] inventory-service (CRUD de dispositivos)
- [ ] agent-service + agente Windows básico
- [ ] performance-service (ingestão de métricas CPU/RAM/Disk)
- [ ] alert-service (regras básicas + threshold)
- [ ] ticket-service (CRUD + comments + SLA básico)
- [ ] notification-service (Email via SendGrid)
- [ ] ai-service (chat assistant com padrões pré-definidos)
- [ ] Frontend web (React) com os módulos acima
- [ ] API Gateway (Kong ou Traefik)
- [ ] CI/CD com GitHub Actions + Docker Compose deploy
- [ ] Observabilidade básica: logs estruturados + health checks

### Fase 2 — Escala e Inteligência (3–6 meses)
**Objetivo:** Automação avançada e IA real com primeiros 100 clientes

- [ ] automation-service com triggers completos
- [ ] script-library-service + execução remota via agente
- [ ] rag-service + embedding-service (LLM real: OpenAI/local)
- [ ] knowledge-base-service + aprendizado de soluções de tickets
- [ ] discovery-service (SNMP + WMI + ARP scan)
- [ ] snmp-service + printer-monitoring-service
- [ ] hardware-service com dados SMART
- [ ] software-inventory-service + CVE check
- [ ] reporting-service (PDF/XLSX)
- [ ] remote-access-service (shell remoto)
- [ ] Agentes Linux e macOS
- [ ] Kubernetes deployment + HPA
- [ ] Redis Cluster + TimescaleDB otimizado

### Fase 3 — Enterprise e Multi-Cloud (6–12 meses)
**Objetivo:** Clientes enterprise, MSPs, compliance

- [ ] license-service (gestão de licenças de software)
- [ ] billing-service + subscription-service + Stripe integration
- [ ] marketplace-service (extensões e plugins)
- [ ] analytics-service (trends, forecasting, relatórios executivos)
- [ ] integration-service (ServiceNow, Jira, Active Directory, Azure AD)
- [ ] webhook-service (events para sistemas externos)
- [ ] LGPD tooling completo (erasure, export, consent)
- [ ] Multi-region deploy (sa-east-1, eu-west, us-east)
- [ ] Citus sharding horizontal
- [ ] SOC 2 Type II audit readiness
- [ ] SDK público para integrações de parceiros
- [ ] White-label completo (branding por tenant)

### Fase 4 — Hiper-Escala (12–24 meses)
**Objetivo:** Competição com líderes de mercado (NinjaRMM, ConnectWise)

- [ ] Kafka para ingestão de telemetria (substituindo Redis Streams)
- [ ] ClickHouse para analytics histórico (bilhões de eventos)
- [ ] Edge computing: processamento no próprio agente com ML local
- [ ] Mobile app (iOS + Android) para técnicos em campo
- [ ] Marketplace público de scripts e automações da comunidade
- [ ] API pública v2 com GraphQL para parceiros ISV
- [ ] Certificações: ISO 27001, SOC 2, LGPD, GDPR

---

## Decisões Arquiteturais (ADRs Resumidos)

| ADR | Decisão | Justificativa |
|-----|---------|---------------|
| ADR-001 | Schema-per-tenant ao invés de row-per-tenant | Melhor isolamento, backup por tenant, migrações independentes. Desvantagem: complexidade operacional aceitável com automação |
| ADR-002 | RabbitMQ ao invés de Kafka na fase inicial | Menor complexidade operacional, sufficient throughput até 50M events/dia. Kafka na Fase 4 quando necessário |
| ADR-003 | TimescaleDB ao invés de InfluxDB | Superset do PostgreSQL, SQL familiar, extensões nativas, melhor ecosystem de HA |
| ADR-004 | gRPC para comunicação AI/RAG/Embedding | Contrato forte (Protobuf), streaming, menor latência que REST para chamadas internas de alta frequência |
| ADR-005 | Go para agentes de endpoint | Binário único sem dependências, cross-compile trivial, consumo mínimo de memória, acesso nativo a WMI/syscalls |
| ADR-006 | OpenAPI 3.1 como source of truth | Codegen de clientes TypeScript e Zod validators via Orval; documentação sempre sincronizada |
| ADR-007 | Outbox Pattern para eventos críticos | Garante que eventos sejam entregues mesmo com falha transitória do broker, sem risco de perda entre transação e publicação |

---

*Documento gerado em: Julho 2025*  
*Próxima revisão: Outubro 2025*  
*Responsável: Principal Software Architect — NexSupport AI*
