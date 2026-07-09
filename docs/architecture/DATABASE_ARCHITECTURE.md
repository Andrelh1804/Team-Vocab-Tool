# NexSupport AI — Especificação Técnica de Banco de Dados Enterprise

**Versão:** 1.0  
**Data:** Julho 2025  
**Status:** Documento de Referência — Fase de Design  
**Referência:** Prompt 03 — Especificação para implementação no Prompt 04  
**Classificação:** Confidencial — Uso Interno

---

## Índice

1. [Modelo Lógico](#1-modelo-lógico)
2. [Modelo Físico](#2-modelo-físico)
3. [Lista Completa de Tabelas](#3-lista-completa-de-tabelas)
4. [Definição de Tabelas — Campos, Tipos e Constraints](#4-definição-de-tabelas)
5. [Relacionamentos e Cardinalidade](#5-relacionamentos-e-cardinalidade)
6. [Índices](#6-índices)
7. [Estratégia de Particionamento](#7-estratégia-de-particionamento)
8. [Modelo TimescaleDB](#8-modelo-timescaledb)
9. [Modelo pgvector](#9-modelo-pgvector)
10. [Materialized Views](#10-materialized-views)
11. [Estratégia de Auditoria](#11-estratégia-de-auditoria)
12. [Estratégia de Segurança (RLS)](#12-estratégia-de-segurança-rls)
13. [Estratégia de Backup e Alta Disponibilidade](#13-estratégia-de-backup-e-alta-disponibilidade)
14. [Justificativa Técnica das Decisões](#14-justificativa-técnica-das-decisões)

---

## 1. Modelo Lógico

### 1.1 Domínios e Entidades Principais

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: MULTI-TENANT & IDENTIDADE                                          │
│                                                                              │
│  tenants ──── companies ──── branches ──── departments ──── locations       │
│      │                                                                       │
│      └─── users ──── user_roles ──── roles ──── role_permissions            │
│               │                                                              │
│               └─── teams ──── team_members                                  │
│               └─── groups ──── group_members                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: GESTÃO DE ATIVOS                                                   │
│                                                                              │
│  devices ──── device_categories ──── manufacturers ──── device_models       │
│     │                                                                        │
│     ├─── hardware_specs                                                      │
│     │       ├─── cpu_specs                                                   │
│     │       ├─── gpu_specs                                                   │
│     │       ├─── ram_slots ──── ram_modules                                 │
│     │       ├─── storage_devices ──── smart_data                            │
│     │       ├─── network_interfaces                                          │
│     │       ├─── monitors                                                    │
│     │       ├─── batteries                                                   │
│     │       ├─── power_supplies                                              │
│     │       ├─── bios_info                                                   │
│     │       └─── tpm_info                                                    │
│     │                                                                        │
│     ├─── peripheral_devices                                                  │
│     ├─── asset_records ──── asset_movements                                 │
│     └─── device_warranties                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: INVENTÁRIO DE SOFTWARE                                             │
│                                                                              │
│  software_catalog ──── software_versions ──── software_vendors              │
│         │                                                                    │
│         ├─── software_installations ──── devices                            │
│         ├─── software_licenses ──── license_keys ──── license_assignments   │
│         ├─── software_updates                                                │
│         └─── software_usage_metrics                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: MONITORAMENTO (TimescaleDB)                                        │
│                                                                              │
│  device_metrics (hypertable) ──── devices                                   │
│  service_metrics (hypertable)                                                │
│  process_metrics (hypertable)                                                │
│  snmp_metrics (hypertable)                                                   │
│  printer_metrics (hypertable)                                                │
│                                                                              │
│  alert_rules ──── alerts ──── alert_events                                  │
│  health_scores (hypertable)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: REDE                                                                │
│                                                                              │
│  subnets ──── network_hosts ──── ip_addresses ──── arp_cache                │
│      │                                                                       │
│      └─── network_devices ──── switch_ports ──── vlans                      │
│               └─── snmp_credentials ──── lldp_neighbors                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: IMPRESSORAS                                                        │
│                                                                              │
│  printers ──── printer_models ──── printer_manufacturers                    │
│     │                                                                        │
│     ├─── printer_consumables ──── consumable_types                          │
│     ├─── print_queues ──── print_jobs                                       │
│     └─── printer_metrics (hypertable)                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: HELP DESK                                                          │
│                                                                              │
│  tickets ──── ticket_categories ──── ticket_priorities                      │
│     │                                                                        │
│     ├─── ticket_comments ──── ticket_attachments                            │
│     ├─── ticket_checklists ──── checklist_items                             │
│     ├─── ticket_time_entries                                                 │
│     ├─── ticket_costs                                                        │
│     ├─── ticket_approvals                                                    │
│     └─── sla_policies ──── sla_breaches                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: AUTOMAÇÃO                                                           │
│                                                                              │
│  automations ──── automation_triggers ──── automation_conditions            │
│       │                                                                      │
│       └─── automation_actions ──── automation_runs ──── automation_logs     │
│                                                                              │
│  scripts ──── script_versions ──── script_categories ──── script_tags       │
│       └─── script_executions ──── script_execution_logs                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: CONHECIMENTO & IA                                                  │
│                                                                              │
│  kb_articles ──── kb_categories ──── kb_attachments                         │
│       │                                                                      │
│       └─── kb_article_relations ──── kb_feedback                            │
│                                                                              │
│  ai_sessions ──── ai_messages ──── ai_feedback                              │
│  ai_analyses ──── rag_documents ──── rag_chunks ──── embeddings             │
│  ai_memory ──── ai_context                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: NOTIFICAÇÕES & API                                                  │
│                                                                              │
│  notification_templates ──── notification_logs                               │
│  webhook_endpoints ──── webhook_deliveries                                   │
│                                                                              │
│  api_keys ──── oauth_clients ──── oauth_tokens ──── api_scopes              │
│  api_rate_limits ──── api_request_logs                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMÍNIO: AUDITORIA (Append-Only)                                            │
│                                                                              │
│  audit_events (partitioned by month)                                         │
│  audit_change_log (DDL/DML changes)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelo Físico

### 2.1 Estratégia de Schema

```
Schema: public
  Tabelas de plataforma (tenants, plans, billing, audit_events)
  Acessadas por conexões super-admin e billing service

Schema: tenant_{tenant_uuid}
  Todas as demais tabelas — uma cópia por tenant
  Exemplo: tenant_f47ac10b-58cc-4372-a567-0e02b2c3d479
  Acesso via SET search_path = 'tenant_{id}', public
  + Row Level Security como segunda camada de defesa
```

### 2.2 Tipos de Dados Padrão

| Tipo | Uso |
|------|-----|
| `UUID` (gen_random_uuid()) | PKs e FKs — sem colisão distribuída, sem exposição de sequência |
| `TIMESTAMPTZ` | Todos os campos de data/hora — timezone-aware |
| `TEXT` | Strings sem limite definido (evitar VARCHAR arbitrário) |
| `VARCHAR(n)` | Apenas onde limite é contrato de negócio (ex: CEP, CNPJ) |
| `SMALLINT` / `INTEGER` / `BIGINT` | Conforme volume esperado |
| `NUMERIC(p,s)` | Valores monetários (ex: NUMERIC(15,2)) |
| `BOOLEAN` | Flags |
| `JSONB` | Dados semi-estruturados, configurações, metadados extras |
| `TEXT[]` | Arrays de strings (tags, CVE IDs) |
| `INET` | Endereços IP (suporte nativo a IPv4/IPv6) |
| `MACADDR8` | Endereços MAC |
| `CIDR` | Sub-redes |
| `vector(1536)` | Embeddings pgvector |

### 2.3 Colunas Padrão (todo registro)

```
id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY
tenant_id    UUID         NOT NULL REFERENCES tenants(id)
created_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL
updated_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL
deleted_at   TIMESTAMPTZ  NULL  -- soft delete: NULL = ativo
created_by   UUID         NULL REFERENCES users(id)
updated_by   UUID         NULL REFERENCES users(id)
```

> **Nota:** Tabelas no schema `public` (tenants, audit_events) não possuem `tenant_id` auto-referencial.

---

## 3. Lista Completa de Tabelas

### 3.1 Schema: public (Plataforma)

| # | Tabela | Domínio |
|---|--------|---------|
| 1 | `tenants` | Identity |
| 2 | `plans` | Billing |
| 3 | `plan_features` | Billing |
| 4 | `subscriptions` | Billing |
| 5 | `subscription_usage` | Billing |
| 6 | `invoices` | Billing |
| 7 | `invoice_items` | Billing |
| 8 | `payment_methods` | Billing |
| 9 | `payment_transactions` | Billing |
| 10 | `audit_events` | Audit |
| 11 | `platform_settings` | Platform |

### 3.2 Schema: tenant_{id} (por Tenant)

| # | Tabela | Domínio |
|---|--------|---------|
| **MULTI-TENANT / IDENTIDADE** | | |
| 12 | `companies` | Org |
| 13 | `branches` | Org |
| 14 | `departments` | Org |
| 15 | `locations` | Org |
| 16 | `users` | Identity |
| 17 | `user_profiles` | Identity |
| 18 | `user_sessions` | Identity |
| 19 | `user_mfa` | Identity |
| 20 | `roles` | RBAC |
| 21 | `permissions` | RBAC |
| 22 | `role_permissions` | RBAC |
| 23 | `user_roles` | RBAC |
| 24 | `teams` | Org |
| 25 | `team_members` | Org |
| 26 | `groups` | Org |
| 27 | `group_members` | Org |
| **GESTÃO DE ATIVOS** | | |
| 28 | `device_categories` | Assets |
| 29 | `manufacturers` | Assets |
| 30 | `device_models` | Assets |
| 31 | `devices` | Assets |
| 32 | `device_agents` | Assets |
| 33 | `hardware_specs` | Assets |
| 34 | `cpu_specs` | Assets |
| 35 | `gpu_specs` | Assets |
| 36 | `ram_slots` | Assets |
| 37 | `storage_devices` | Assets |
| 38 | `smart_data` | Assets |
| 39 | `network_interfaces` | Assets |
| 40 | `wifi_adapters` | Assets |
| 41 | `monitors` | Assets |
| 42 | `batteries` | Assets |
| 43 | `power_supplies` | Assets |
| 44 | `bios_info` | Assets |
| 45 | `tpm_info` | Assets |
| 46 | `peripheral_devices` | Assets |
| 47 | `usb_devices` | Assets |
| 48 | `dock_stations` | Assets |
| 49 | `asset_records` | Assets |
| 50 | `asset_movements` | Assets |
| 51 | `device_warranties` | Assets |
| 52 | `device_locations` | Assets |
| **SOFTWARE** | | |
| 53 | `software_vendors` | Software |
| 54 | `software_catalog` | Software |
| 55 | `software_versions` | Software |
| 56 | `software_installations` | Software |
| 57 | `software_update_history` | Software |
| 58 | `software_licenses` | Software |
| 59 | `license_keys` | Software |
| 60 | `license_assignments` | Software |
| 61 | `license_compliance` | Software |
| 62 | `software_usage_metrics` | Software |
| **MONITORAMENTO (TimescaleDB)** | | |
| 63 | `device_metrics` | Monitoring |
| 64 | `service_status_metrics` | Monitoring |
| 65 | `process_metrics` | Monitoring |
| 66 | `snmp_metrics` | Monitoring |
| 67 | `printer_metrics` | Monitoring |
| 68 | `health_scores` | Monitoring |
| 69 | `windows_events` | Monitoring |
| 70 | `linux_logs` | Monitoring |
| 71 | `bsod_events` | Monitoring |
| 72 | `alert_rules` | Monitoring |
| 73 | `alerts` | Monitoring |
| 74 | `alert_events` | Monitoring |
| **REDE / DESCOBERTA** | | |
| 75 | `subnets` | Network |
| 76 | `network_hosts` | Network |
| 77 | `ip_addresses` | Network |
| 78 | `arp_cache` | Network |
| 79 | `dns_records` | Network |
| 80 | `network_devices` | Network |
| 81 | `switch_ports` | Network |
| 82 | `vlans` | Network |
| 83 | `snmp_credentials` | Network |
| 84 | `lldp_neighbors` | Network |
| 85 | `network_topology` | Network |
| **IMPRESSORAS** | | |
| 86 | `printer_manufacturers` | Printers |
| 87 | `printer_models` | Printers |
| 88 | `printers` | Printers |
| 89 | `consumable_types` | Printers |
| 90 | `printer_consumables` | Printers |
| 91 | `print_queues` | Printers |
| 92 | `print_jobs` | Printers |
| **HELP DESK** | | |
| 93 | `ticket_categories` | HelpDesk |
| 94 | `ticket_priorities` | HelpDesk |
| 95 | `tickets` | HelpDesk |
| 96 | `ticket_comments` | HelpDesk |
| 97 | `ticket_attachments` | HelpDesk |
| 98 | `ticket_checklists` | HelpDesk |
| 99 | `checklist_items` | HelpDesk |
| 100 | `ticket_time_entries` | HelpDesk |
| 101 | `ticket_costs` | HelpDesk |
| 102 | `ticket_approvals` | HelpDesk |
| 103 | `sla_policies` | HelpDesk |
| 104 | `sla_breaches` | HelpDesk |
| **AUTOMAÇÃO** | | |
| 105 | `automations` | Automation |
| 106 | `automation_triggers` | Automation |
| 107 | `automation_conditions` | Automation |
| 108 | `automation_actions` | Automation |
| 109 | `automation_runs` | Automation |
| 110 | `automation_logs` | Automation |
| **BIBLIOTECA DE SCRIPTS** | | |
| 111 | `script_categories` | Scripts |
| 112 | `scripts` | Scripts |
| 113 | `script_versions` | Scripts |
| 114 | `script_tags` | Scripts |
| 115 | `script_tag_assignments` | Scripts |
| 116 | `script_executions` | Scripts |
| 117 | `script_execution_logs` | Scripts |
| **BASE DE CONHECIMENTO** | | |
| 118 | `kb_categories` | Knowledge |
| 119 | `kb_articles` | Knowledge |
| 120 | `kb_article_versions` | Knowledge |
| 121 | `kb_attachments` | Knowledge |
| 122 | `kb_article_relations` | Knowledge |
| 123 | `kb_feedback` | Knowledge |
| **IA & RAG (pgvector)** | | |
| 124 | `ai_sessions` | AI |
| 125 | `ai_messages` | AI |
| 126 | `ai_analyses` | AI |
| 127 | `ai_feedback` | AI |
| 128 | `ai_memory` | AI |
| 129 | `rag_documents` | AI/RAG |
| 130 | `rag_chunks` | AI/RAG |
| 131 | `embeddings` | AI/RAG |
| **NOTIFICAÇÕES** | | |
| 132 | `notification_channels` | Notifications |
| 133 | `notification_templates` | Notifications |
| 134 | `notification_logs` | Notifications |
| 135 | `user_notification_prefs` | Notifications |
| 136 | `webhook_endpoints` | Notifications |
| 137 | `webhook_deliveries` | Notifications |
| **API** | | |
| 138 | `api_keys` | API |
| 139 | `oauth_clients` | API |
| 140 | `oauth_tokens` | API |
| 141 | `api_scopes` | API |
| 142 | `api_rate_limits` | API |
| 143 | `api_request_logs` | API |
| **CONFIGURAÇÃO** | | |
| 144 | `feature_flags` | Config |
| 145 | `tenant_settings` | Config |
| 146 | `integration_configs` | Config |

**Total: 146 tabelas**

---

## 4. Definição de Tabelas

### 4.1 Domínio: Multi-Tenant / Identidade

#### `tenants` (schema: public)
```
id               UUID          PK
name             TEXT          NOT NULL
slug             VARCHAR(63)   UNIQUE NOT NULL          -- URL-safe identifier
display_name     TEXT
plan_id          UUID          FK → plans(id)
status           TEXT          CHECK IN ('active','suspended','deleted','trial')
country          VARCHAR(2)    NOT NULL DEFAULT 'BR'
timezone         TEXT          DEFAULT 'America/Sao_Paulo'
locale           VARCHAR(10)   DEFAULT 'pt-BR'
max_devices      INTEGER       DEFAULT 50
max_users        INTEGER       DEFAULT 10
settings         JSONB         DEFAULT '{}'
trial_ends_at    TIMESTAMPTZ
suspended_at     TIMESTAMPTZ
suspended_reason TEXT
created_at       TIMESTAMPTZ   DEFAULT NOW()
updated_at       TIMESTAMPTZ   DEFAULT NOW()
deleted_at       TIMESTAMPTZ
```

#### `companies` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK → public.tenants(id)
name             TEXT    NOT NULL
legal_name       TEXT
cnpj             VARCHAR(18)
ie               VARCHAR(30)                             -- Inscrição Estadual
email            TEXT
phone            VARCHAR(20)
website          TEXT
address_street   TEXT
address_number   TEXT
address_city     TEXT
address_state    VARCHAR(2)
address_zip      VARCHAR(9)
address_country  VARCHAR(2)   DEFAULT 'BR'
logo_url         TEXT
metadata         JSONB
[padrão: created_at, updated_at, deleted_at, created_by, updated_by]
```

#### `branches` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
company_id       UUID    FK → companies(id)
parent_branch_id UUID    FK → branches(id) NULL          -- hierarquia
name             TEXT    NOT NULL
code             TEXT
type             TEXT    CHECK IN ('matrix','branch','franchise','remote')
address_*        TEXT    (mesmo padrão de companies)
manager_id       UUID    FK → users(id) NULL
[padrão]
```

#### `departments` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
branch_id        UUID    FK → branches(id)
parent_dept_id   UUID    FK → departments(id) NULL
name             TEXT    NOT NULL
code             TEXT
manager_id       UUID    FK → users(id) NULL
cost_center      TEXT
[padrão]
```

#### `locations` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
branch_id        UUID    FK → branches(id)
department_id    UUID    FK → departments(id) NULL
name             TEXT    NOT NULL                         -- "Sala 301", "Data Center A"
type             TEXT    CHECK IN ('room','floor','building','rack','zone')
description      TEXT
floor            TEXT
rack_unit_start  SMALLINT NULL
rack_unit_end    SMALLINT NULL
metadata         JSONB
[padrão]
```

#### `users` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
email            TEXT    UNIQUE NOT NULL
name             TEXT    NOT NULL
display_name     TEXT
phone            VARCHAR(20)
avatar_url       TEXT
department_id    UUID    FK → departments(id) NULL
branch_id        UUID    FK → branches(id) NULL
status           TEXT    CHECK IN ('active','inactive','invited','suspended')
last_login_at    TIMESTAMPTZ
password_hash    TEXT    NOT NULL                         -- bcrypt
failed_login_attempts SMALLINT DEFAULT 0
locked_until     TIMESTAMPTZ
[padrão]
```

#### `roles` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
name             TEXT    NOT NULL
slug             TEXT    NOT NULL
description      TEXT
is_system        BOOLEAN DEFAULT FALSE                    -- roles padrão imutáveis
[padrão]
UNIQUE(tenant_id, slug)
```

#### `permissions` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
resource         TEXT    NOT NULL                         -- 'tickets', 'devices', etc.
action           TEXT    NOT NULL                         -- 'create', 'read', 'update', 'delete'
scope            TEXT    DEFAULT 'tenant'                 -- 'tenant', 'own', 'department'
description      TEXT
[padrão]
UNIQUE(tenant_id, resource, action, scope)
```

#### `role_permissions` (pivot)
```
role_id          UUID    FK → roles(id)
permission_id    UUID    FK → permissions(id)
PRIMARY KEY (role_id, permission_id)
```

#### `user_roles` (pivot)
```
user_id          UUID    FK → users(id)
role_id          UUID    FK → roles(id)
granted_by       UUID    FK → users(id)
granted_at       TIMESTAMPTZ DEFAULT NOW()
expires_at       TIMESTAMPTZ NULL
PRIMARY KEY (user_id, role_id)
```

#### `teams` (schema: tenant)
```
id               UUID    PK
tenant_id        UUID    FK
name             TEXT    NOT NULL
description      TEXT
team_lead_id     UUID    FK → users(id) NULL
color            VARCHAR(7)                               -- hex color
[padrão]
```

#### `team_members` (pivot)
```
team_id          UUID    FK → teams(id)
user_id          UUID    FK → users(id)
role_in_team     TEXT    CHECK IN ('lead','member','observer')
joined_at        TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (team_id, user_id)
```

---

### 4.2 Domínio: Gestão de Ativos

#### `devices` (tabela central — schema: tenant)
```
id                   UUID    PK
tenant_id            UUID    FK
category_id          UUID    FK → device_categories(id)
model_id             UUID    FK → device_models(id) NULL
branch_id            UUID    FK → branches(id) NULL
department_id        UUID    FK → departments(id) NULL
location_id          UUID    FK → locations(id) NULL
assigned_user_id     UUID    FK → users(id) NULL
hostname             TEXT
display_name         TEXT
serial_number        TEXT
asset_tag            TEXT
status               TEXT    CHECK IN ('online','offline','unknown','maintenance','decommissioned')
os_name              TEXT
os_version           TEXT
os_build             TEXT
os_architecture      TEXT    CHECK IN ('x86_64','arm64','x86')
os_install_date      TIMESTAMPTZ
domain_name          TEXT
workgroup            TEXT
last_seen_at         TIMESTAMPTZ
agent_installed      BOOLEAN DEFAULT FALSE
agent_version        TEXT
agent_id             UUID    UNIQUE NULL
ip_address           INET
mac_address          MACADDR8
ipv6_address         INET
public_ip            INET
is_virtual           BOOLEAN DEFAULT FALSE
virtualization_type  TEXT                                 -- 'vmware','hyper-v','virtualbox',etc
notes                TEXT
tags                 TEXT[]
metadata             JSONB
[padrão]
```

#### `hardware_specs`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id) UNIQUE
total_ram_mb         INTEGER
ram_slots_total      SMALLINT
ram_slots_used       SMALLINT
storage_total_gb     NUMERIC(10,2)
form_factor          TEXT                                 -- 'notebook','desktop','server','mini-pc'
chassis_type         TEXT
chassis_serial       TEXT
[padrão]
```

#### `cpu_specs`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id)
socket               TEXT
manufacturer         TEXT
brand                TEXT
model                TEXT
logical_cores        SMALLINT
physical_cores       SMALLINT
threads_per_core     SMALLINT
base_clock_mhz       INTEGER
boost_clock_mhz      INTEGER
cache_l2_kb          INTEGER
cache_l3_kb          INTEGER
architecture         TEXT
tdp_watts            SMALLINT
[padrão]
```

#### `storage_devices`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id)
model                TEXT
serial_number        TEXT
type                 TEXT    CHECK IN ('ssd','hdd','nvme','emmc','usb')
interface            TEXT    CHECK IN ('sata','nvme','usb','scsi')
capacity_gb          NUMERIC(10,2)
used_gb              NUMERIC(10,2)
health_status        TEXT    CHECK IN ('good','warning','failing','failed','unknown')
temperature_c        SMALLINT
firmware_version     TEXT
is_system_drive      BOOLEAN DEFAULT FALSE
partition_scheme     TEXT    CHECK IN ('mbr','gpt','unknown')
[padrão]
```

#### `smart_data`
```
id                   UUID    PK
tenant_id            UUID    FK
storage_device_id    UUID    FK → storage_devices(id)
collected_at         TIMESTAMPTZ NOT NULL
reallocated_sectors  INTEGER DEFAULT 0
pending_sectors      INTEGER DEFAULT 0
uncorrectable_errors INTEGER DEFAULT 0
spin_retry_count     INTEGER DEFAULT 0
power_on_hours       INTEGER
power_cycle_count    INTEGER
temperature_c        SMALLINT
overall_health       TEXT    CHECK IN ('passed','failed','unknown')
raw_data             JSONB                                -- todos os atributos SMART brutos
[padrão]
```

#### `asset_records`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id) UNIQUE
patrimony_number     TEXT    UNIQUE
acquisition_date     DATE
acquisition_value    NUMERIC(15,2)
acquisition_currency VARCHAR(3) DEFAULT 'BRL'
supplier_name        TEXT
invoice_number       TEXT
depreciation_years   SMALLINT
current_value        NUMERIC(15,2)
status               TEXT    CHECK IN ('active','disposed','lost','stolen')
disposal_date        DATE
disposal_reason      TEXT
[padrão]
```

#### `device_warranties`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id)
type                 TEXT    CHECK IN ('manufacturer','extended','onsite','depot')
provider             TEXT
contract_number      TEXT
start_date           DATE    NOT NULL
end_date             DATE    NOT NULL
support_level        TEXT
contact_phone        TEXT
contact_email        TEXT
notes                TEXT
[padrão]
```

---

### 4.3 Domínio: Inventário de Software

#### `software_catalog`
```
id                   UUID    PK
tenant_id            UUID    FK
vendor_id            UUID    FK → software_vendors(id)
name                 TEXT    NOT NULL
category             TEXT    CHECK IN ('os','office','security','erp','browser','dev','media','utility','other')
publisher_name       TEXT
is_managed           BOOLEAN DEFAULT FALSE                -- TI gerencia ativamente
is_authorized        BOOLEAN DEFAULT TRUE                 -- permitido no ambiente
icon_url             TEXT
metadata             JSONB
[padrão]
```

#### `software_licenses`
```
id                   UUID    PK
tenant_id            UUID    FK
software_id          UUID    FK → software_catalog(id)
vendor_id            UUID    FK → software_vendors(id)
name                 TEXT    NOT NULL
type                 TEXT    CHECK IN ('perpetual','subscription','oem','volume','trial','freeware','opensource')
seats_total          INTEGER                              -- NULL = ilimitado
seats_used           INTEGER DEFAULT 0
purchase_date        DATE
expiration_date      DATE
auto_renewal         BOOLEAN DEFAULT FALSE
annual_cost          NUMERIC(15,2)
currency             VARCHAR(3) DEFAULT 'BRL'
vendor_contract_id   TEXT
po_number            TEXT
notes                TEXT
[padrão]
```

#### `software_installations`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id)
software_id          UUID    FK → software_catalog(id)
version_id           UUID    FK → software_versions(id) NULL
installed_at         TIMESTAMPTZ
install_path         TEXT
install_source       TEXT    CHECK IN ('msi','exe','store','package_manager','manual','unknown')
is_64bit             BOOLEAN
is_system            BOOLEAN DEFAULT FALSE
uninstall_string     TEXT
size_mb              INTEGER
license_assignment_id UUID   FK → license_assignments(id) NULL
[padrão]
```

---

### 4.4 Domínio: Monitoramento

#### `alert_rules`
```
id                   UUID    PK
tenant_id            UUID    FK
name                 TEXT    NOT NULL
description          TEXT
is_active            BOOLEAN DEFAULT TRUE
metric_type          TEXT    NOT NULL                     -- 'cpu','memory','disk','temperature',etc
operator             TEXT    CHECK IN ('gt','gte','lt','lte','eq','neq')
threshold_value      NUMERIC(10,4) NOT NULL
threshold_unit       TEXT
duration_seconds     INTEGER DEFAULT 0                    -- deve persistir por N segundos
severity             TEXT    CHECK IN ('info','warning','high','critical')
scope                TEXT    CHECK IN ('all_devices','category','device','tag')
scope_value          TEXT                                 -- ID ou tag value
auto_close           BOOLEAN DEFAULT TRUE
auto_close_after_s   INTEGER DEFAULT 300
notification_enabled BOOLEAN DEFAULT TRUE
[padrão]
```

#### `alerts`
```
id                   UUID    PK
tenant_id            UUID    FK
rule_id              UUID    FK → alert_rules(id) NULL
device_id            UUID    FK → devices(id) NULL
severity             TEXT    CHECK IN ('info','warning','high','critical')
title                TEXT    NOT NULL
description          TEXT
metric_type          TEXT
metric_value         NUMERIC(10,4)
threshold_value      NUMERIC(10,4)
status               TEXT    CHECK IN ('open','acknowledged','resolved','suppressed')
acknowledged_by      UUID    FK → users(id) NULL
acknowledged_at      TIMESTAMPTZ
resolved_by          UUID    FK → users(id) NULL
resolved_at          TIMESTAMPTZ
resolution_note      TEXT
ticket_id            UUID    FK → tickets(id) NULL
first_seen_at        TIMESTAMPTZ NOT NULL
last_seen_at         TIMESTAMPTZ NOT NULL
occurrence_count     INTEGER DEFAULT 1
[padrão]
```

#### `bsod_events`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id)
occurred_at          TIMESTAMPTZ NOT NULL
stop_code            TEXT
bug_check_code       TEXT
driver_name          TEXT
module_name          TEXT
stack_trace          TEXT
dump_file_path       TEXT
dump_file_url        TEXT                                 -- link MinIO
is_recurring         BOOLEAN DEFAULT FALSE
[padrão]
```

---

### 4.5 Domínio: Rede / Descoberta

#### `subnets`
```
id                   UUID    PK
tenant_id            UUID    FK
branch_id            UUID    FK → branches(id) NULL
network_cidr         CIDR    NOT NULL
name                 TEXT
description          TEXT
gateway              INET
dns_primary          INET
dns_secondary        INET
vlan_id              INTEGER
scan_enabled         BOOLEAN DEFAULT TRUE
last_scan_at         TIMESTAMPTZ
scan_interval_min    INTEGER DEFAULT 60
[padrão]
```

#### `network_devices`
```
id                   UUID    PK
tenant_id            UUID    FK
subnet_id            UUID    FK → subnets(id) NULL
type                 TEXT    CHECK IN ('switch','router','firewall','ap','ups','server','unknown')
name                 TEXT
ip_address           INET    NOT NULL
mac_address          MACADDR8
manufacturer         TEXT
model                TEXT
firmware_version     TEXT
snmp_enabled         BOOLEAN DEFAULT FALSE
snmp_credential_id   UUID    FK → snmp_credentials(id) NULL
status               TEXT    CHECK IN ('online','offline','unknown')
last_seen_at         TIMESTAMPTZ
[padrão]
```

#### `switch_ports`
```
id                   UUID    PK
tenant_id            UUID    FK
network_device_id    UUID    FK → network_devices(id)
port_number          SMALLINT NOT NULL
port_name            TEXT
speed_mbps           INTEGER
duplex               TEXT    CHECK IN ('full','half','auto','unknown')
status               TEXT    CHECK IN ('up','down','admin_down','unknown')
vlan_id              INTEGER
poe_enabled          BOOLEAN DEFAULT FALSE
poe_watts            NUMERIC(5,1)
connected_device_id  UUID    FK → devices(id) NULL
connected_mac        MACADDR8
[padrão]
```

---

### 4.6 Domínio: Impressoras

#### `printers`
```
id                   UUID    PK
tenant_id            UUID    FK
device_id            UUID    FK → devices(id) NULL        -- se tem agente instalado
model_id             UUID    FK → printer_models(id)
location_id          UUID    FK → locations(id) NULL
name                 TEXT    NOT NULL
ip_address           INET
mac_address          MACADDR8
serial_number        TEXT
firmware_version     TEXT
status               TEXT    CHECK IN ('online','offline','error','warning','maintenance')
snmp_enabled         BOOLEAN DEFAULT TRUE
snmp_credential_id   UUID    FK → snmp_credentials(id) NULL
last_seen_at         TIMESTAMPTZ
[padrão]
```

#### `printer_consumables`
```
id                   UUID    PK
tenant_id            UUID    FK
printer_id           UUID    FK → printers(id)
type_id              UUID    FK → consumable_types(id)
name                 TEXT    NOT NULL                     -- "Toner Black", "Drum Unit", "Fuser"
current_level_pct    SMALLINT CHECK (current_level_pct BETWEEN 0 AND 100)
pages_remaining      INTEGER
serial_number        TEXT
part_number          TEXT
is_low               BOOLEAN DEFAULT FALSE
low_threshold_pct    SMALLINT DEFAULT 15
last_replaced_at     TIMESTAMPTZ
replacement_count    SMALLINT DEFAULT 0
[padrão]
```

#### `print_jobs`
```
id                   UUID    PK
tenant_id            UUID    FK
printer_id           UUID    FK → printers(id)
queue_id             UUID    FK → print_queues(id)
job_name             TEXT
submitted_by         TEXT
submitted_at         TIMESTAMPTZ NOT NULL
completed_at         TIMESTAMPTZ
status               TEXT    CHECK IN ('queued','printing','completed','cancelled','error')
pages                INTEGER
copies               SMALLINT DEFAULT 1
color_pages          INTEGER DEFAULT 0
paper_size           TEXT
error_message        TEXT
[padrão]
```

---

### 4.7 Domínio: Help Desk

#### `tickets`
```
id                   UUID    PK
tenant_id            UUID    FK
number               BIGINT  GENERATED ALWAYS AS IDENTITY  -- ex: #10042
category_id          UUID    FK → ticket_categories(id)
priority_id          UUID    FK → ticket_priorities(id)
sla_policy_id        UUID    FK → sla_policies(id) NULL
title                TEXT    NOT NULL
description          TEXT
status               TEXT    CHECK IN ('open','in_progress','waiting_customer','waiting_third_party','resolved','closed')
type                 TEXT    CHECK IN ('incident','request','problem','change')
reporter_id          UUID    FK → users(id)
assignee_id          UUID    FK → users(id) NULL
team_id              UUID    FK → teams(id) NULL
device_id            UUID    FK → devices(id) NULL
alert_id             UUID    FK → alerts(id) NULL
source               TEXT    CHECK IN ('portal','email','phone','chat','automation','api')
tags                 TEXT[]
internal_notes       TEXT
first_response_at    TIMESTAMPTZ
resolved_at          TIMESTAMPTZ
closed_at            TIMESTAMPTZ
sla_deadline         TIMESTAMPTZ
sla_breached         BOOLEAN DEFAULT FALSE
satisfaction_score   SMALLINT CHECK (satisfaction_score BETWEEN 1 AND 5)
[padrão]
```

#### `sla_policies`
```
id                   UUID    PK
tenant_id            UUID    FK
name                 TEXT    NOT NULL
description          TEXT
is_default           BOOLEAN DEFAULT FALSE
business_hours_only  BOOLEAN DEFAULT TRUE
first_response_hours NUMERIC(5,1) NOT NULL               -- horas para 1ª resposta
resolution_hours     NUMERIC(5,1) NOT NULL                -- horas para resolução
escalation_hours     NUMERIC(5,1)
escalate_to_user_id  UUID    FK → users(id) NULL
applies_to_priority  TEXT[]                               -- quais prioridades cobre
[padrão]
```

#### `ticket_time_entries`
```
id                   UUID    PK
tenant_id            UUID    FK
ticket_id            UUID    FK → tickets(id)
user_id              UUID    FK → users(id)
started_at           TIMESTAMPTZ NOT NULL
ended_at             TIMESTAMPTZ
duration_minutes     INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM ended_at - started_at)/60) STORED
billable             BOOLEAN DEFAULT TRUE
hourly_rate          NUMERIC(10,2)
notes                TEXT
[padrão]
```

---

### 4.8 Domínio: Automação

#### `automations`
```
id                   UUID    PK
tenant_id            UUID    FK
name                 TEXT    NOT NULL
description          TEXT
is_active            BOOLEAN DEFAULT TRUE
trigger_type         TEXT    CHECK IN ('event','schedule','manual','webhook')
run_count            BIGINT  DEFAULT 0
last_run_at          TIMESTAMPTZ
last_run_status      TEXT    CHECK IN ('success','failure','running','skipped')
metadata             JSONB
[padrão]
```

#### `automation_triggers`
```
id                   UUID    PK
tenant_id            UUID    FK
automation_id        UUID    FK → automations(id)
event_type           TEXT                                 -- ex: 'alert.created', 'device.offline'
cron_expression      TEXT                                 -- para trigger type schedule
webhook_secret       TEXT                                 -- para trigger type webhook
config               JSONB   DEFAULT '{}'
[padrão]
```

#### `automation_conditions`
```
id                   UUID    PK
tenant_id            UUID    FK
automation_id        UUID    FK → automations(id)
order_index          SMALLINT NOT NULL
field                TEXT    NOT NULL                     -- campo a avaliar
operator             TEXT    CHECK IN ('eq','neq','gt','gte','lt','lte','contains','in','not_in')
value                TEXT    NOT NULL
logic_operator       TEXT    CHECK IN ('AND','OR') DEFAULT 'AND'
[padrão]
```

#### `automation_actions`
```
id                   UUID    PK
tenant_id            UUID    FK
automation_id        UUID    FK → automations(id)
order_index          SMALLINT NOT NULL
action_type          TEXT    CHECK IN ('run_script','create_ticket','send_notification','update_device','call_webhook','assign_ticket')
config               JSONB   NOT NULL                     -- parâmetros específicos da ação
script_id            UUID    FK → scripts(id) NULL
timeout_seconds      INTEGER DEFAULT 300
retry_count          SMALLINT DEFAULT 0
[padrão]
```

#### `automation_runs`
```
id                   UUID    PK
tenant_id            UUID    FK
automation_id        UUID    FK → automations(id)
trigger_event_id     TEXT                                 -- ID do evento que disparou
device_id            UUID    FK → devices(id) NULL
status               TEXT    CHECK IN ('pending','running','success','failure','cancelled','timeout')
started_at           TIMESTAMPTZ
completed_at         TIMESTAMPTZ
duration_ms          INTEGER
error_message        TEXT
context              JSONB                                -- dados do contexto de execução
[padrão]
```

---

### 4.9 Domínio: Biblioteca de Scripts

#### `scripts`
```
id                   UUID    PK
tenant_id            UUID    FK NULL                      -- NULL = script da plataforma (público)
category_id          UUID    FK → script_categories(id)
name                 TEXT    NOT NULL
description          TEXT
language             TEXT    CHECK IN ('powershell','cmd','batch','bash','python','sql','javascript')
os_support           TEXT[]  CHECK os_support <@ ARRAY['windows','linux','macos']
current_version_id   UUID    FK → script_versions(id) NULL
author_id            UUID    FK → users(id) NULL
is_public            BOOLEAN DEFAULT FALSE                -- compartilhado no marketplace
requires_elevation   BOOLEAN DEFAULT FALSE
is_signed            BOOLEAN DEFAULT FALSE
signature_hash       TEXT
risk_level           TEXT    CHECK IN ('low','medium','high','critical')
usage_count          BIGINT  DEFAULT 0
[padrão]
```

#### `script_versions`
```
id                   UUID    PK
tenant_id            UUID    FK NULL
script_id            UUID    FK → scripts(id)
version              TEXT    NOT NULL                     -- semver: '1.0.0'
content              TEXT    NOT NULL                     -- código do script
content_hash         TEXT    NOT NULL                     -- SHA-256 do content
change_notes         TEXT
is_validated         BOOLEAN DEFAULT FALSE
validated_by         UUID    FK → users(id) NULL
validated_at         TIMESTAMPTZ
[padrão]
UNIQUE(script_id, version)
```

#### `script_executions`
```
id                   UUID    PK
tenant_id            UUID    FK
script_id            UUID    FK → scripts(id)
version_id           UUID    FK → script_versions(id)
device_id            UUID    FK → devices(id)
executed_by          UUID    FK → users(id) NULL
automation_run_id    UUID    FK → automation_runs(id) NULL
ticket_id            UUID    FK → tickets(id) NULL
status               TEXT    CHECK IN ('pending','running','success','failure','timeout','cancelled')
exit_code            INTEGER
started_at           TIMESTAMPTZ
completed_at         TIMESTAMPTZ
duration_ms          INTEGER
parameters           JSONB
[padrão]
```

---

### 4.10 Domínio: Base de Conhecimento

#### `kb_articles`
```
id                   UUID    PK
tenant_id            UUID    FK NULL                      -- NULL = artigo global da plataforma
category_id          UUID    FK → kb_categories(id)
title                TEXT    NOT NULL
slug                 TEXT    NOT NULL
content              TEXT    NOT NULL                     -- Markdown
excerpt              TEXT
status               TEXT    CHECK IN ('draft','review','published','archived')
author_id            UUID    FK → users(id)
reviewer_id          UUID    FK → users(id) NULL
reviewed_at          TIMESTAMPTZ
published_at         TIMESTAMPTZ
view_count           BIGINT  DEFAULT 0
helpful_count        BIGINT  DEFAULT 0
not_helpful_count    BIGINT  DEFAULT 0
tags                 TEXT[]
related_manufacturers TEXT[]
related_products     TEXT[]
[padrão]
```

---

### 4.11 Domínio: IA & RAG

#### `ai_sessions`
```
id                   UUID    PK
tenant_id            UUID    FK
user_id              UUID    FK → users(id)
device_id            UUID    FK → devices(id) NULL
ticket_id            UUID    FK → tickets(id) NULL
type                 TEXT    CHECK IN ('chat','diagnosis','analysis','suggestion')
title                TEXT
model_used           TEXT    NOT NULL                     -- 'gpt-4o','claude-3-5-sonnet',etc
total_tokens_used    INTEGER DEFAULT 0
total_cost_usd       NUMERIC(10,6) DEFAULT 0
status               TEXT    CHECK IN ('active','completed','archived')
last_message_at      TIMESTAMPTZ
[padrão]
```

#### `ai_messages`
```
id                   UUID    PK
tenant_id            UUID    FK
session_id           UUID    FK → ai_sessions(id)
role                 TEXT    CHECK IN ('user','assistant','system','tool')
content              TEXT    NOT NULL
tokens_used          INTEGER
model_used           TEXT
latency_ms           INTEGER
rag_chunks_used      UUID[]                               -- IDs dos chunks usados
tool_calls           JSONB                                -- function calls
metadata             JSONB
[padrão]
```

#### `ai_analyses`
```
id                   UUID    PK
tenant_id            UUID    FK
session_id           UUID    FK → ai_sessions(id) NULL
type                 TEXT    CHECK IN ('device_diagnosis','alert_analysis','script_suggestion','ticket_solution')
target_id            UUID                                 -- device_id, alert_id, ticket_id, etc.
target_type          TEXT
summary              TEXT
confidence_score     NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1)
suggested_actions    JSONB
script_ids           UUID[]
tokens_used          INTEGER
model_used           TEXT
feedback_score       SMALLINT CHECK (feedback_score BETWEEN 1 AND 5)
[padrão]
```

#### `ai_memory`
```
id                   UUID    PK
tenant_id            UUID    FK
user_id              UUID    FK → users(id) NULL
device_id            UUID    FK → devices(id) NULL
scope                TEXT    CHECK IN ('user','device','tenant','global')
key                  TEXT    NOT NULL
value                TEXT    NOT NULL
importance           SMALLINT DEFAULT 1                   -- 1-5
expires_at           TIMESTAMPTZ NULL
[padrão]
UNIQUE(tenant_id, scope, key)
```

#### `rag_documents` (pgvector)
```
id                   UUID    PK
tenant_id            UUID    FK NULL                      -- NULL = documento global
source_type          TEXT    CHECK IN ('kb_article','script','ticket_solution','manual','firmware_doc','support_page')
source_id            UUID    NOT NULL
title                TEXT    NOT NULL
language             TEXT    DEFAULT 'pt'
metadata             JSONB
total_chunks         INTEGER DEFAULT 0
last_embedded_at     TIMESTAMPTZ
embedding_model      TEXT    DEFAULT 'text-embedding-3-small'
[padrão]
```

#### `rag_chunks` (pgvector)
```
id                   UUID    PK
tenant_id            UUID    FK NULL
document_id          UUID    FK → rag_documents(id)
chunk_index          SMALLINT NOT NULL
content              TEXT    NOT NULL
token_count          INTEGER
embedding            vector(1536)                         -- pgvector
metadata             JSONB                                -- page, section, headers
[padrão]
INDEX: HNSW on embedding (vector_cosine_ops) — melhor recall/performance
```

#### `embeddings` (tabela genérica para múltiplas fontes)
```
id                   UUID    PK
tenant_id            UUID    FK NULL
entity_type          TEXT    NOT NULL                     -- 'device_log','alert','ticket','command'
entity_id            UUID    NOT NULL
content_hash         TEXT    NOT NULL                     -- evita re-embedding de conteúdo idêntico
embedding            vector(1536)
model_used           TEXT
created_at           TIMESTAMPTZ DEFAULT NOW()
UNIQUE(entity_type, entity_id, model_used)
```

---

### 4.12 Domínio: Notificações

#### `notification_templates`
```
id                   UUID    PK
tenant_id            UUID    FK NULL
channel              TEXT    CHECK IN ('email','sms','push','slack','teams','discord','whatsapp','webhook')
event_type           TEXT    NOT NULL
subject              TEXT
body_html            TEXT
body_text            TEXT
body_json            JSONB                                -- para canais que usam blocos (Slack, Teams)
language             VARCHAR(10) DEFAULT 'pt-BR'
is_active            BOOLEAN DEFAULT TRUE
[padrão]
UNIQUE(tenant_id, channel, event_type, language)
```

#### `notification_logs`
```
id                   UUID    PK
tenant_id            UUID    FK
template_id          UUID    FK → notification_templates(id) NULL
channel              TEXT    NOT NULL
recipient_id         UUID    FK → users(id) NULL
recipient_address    TEXT    NOT NULL                     -- email, phone, user id, etc.
event_type           TEXT    NOT NULL
reference_id         UUID                                 -- ticket_id, alert_id, etc.
reference_type       TEXT
status               TEXT    CHECK IN ('pending','sent','delivered','failed','bounced')
sent_at              TIMESTAMPTZ
delivered_at         TIMESTAMPTZ
failure_reason       TEXT
retry_count          SMALLINT DEFAULT 0
external_id          TEXT                                 -- ID no provedor (SendGrid, Twilio, etc.)
[padrão]
```

#### `webhook_endpoints`
```
id                   UUID    PK
tenant_id            UUID    FK
name                 TEXT    NOT NULL
url                  TEXT    NOT NULL
secret               TEXT    NOT NULL                     -- HMAC-SHA256 signing secret (hash)
is_active            BOOLEAN DEFAULT TRUE
event_types          TEXT[]  NOT NULL                     -- ['alert.created','ticket.closed',etc]
headers              JSONB   DEFAULT '{}'
timeout_seconds      SMALLINT DEFAULT 10
retry_count          SMALLINT DEFAULT 3
[padrão]
```

---

### 4.13 Domínio: API

#### `api_keys`
```
id                   UUID    PK
tenant_id            UUID    FK
user_id              UUID    FK → users(id) NULL
name                 TEXT    NOT NULL
key_hash             TEXT    NOT NULL UNIQUE              -- SHA-256+salt, NUNCA plaintext
key_prefix           VARCHAR(8) NOT NULL                  -- ex: 'ns_k8s_' para identificação visual
scopes               TEXT[]  NOT NULL
expires_at           TIMESTAMPTZ NULL
last_used_at         TIMESTAMPTZ
last_used_ip         INET
usage_count          BIGINT  DEFAULT 0
is_active            BOOLEAN DEFAULT TRUE
[padrão]
```

#### `oauth_clients`
```
id                   UUID    PK
tenant_id            UUID    FK
name                 TEXT    NOT NULL
client_id            TEXT    UNIQUE NOT NULL
client_secret_hash   TEXT    NOT NULL
redirect_uris        TEXT[]  NOT NULL
allowed_scopes       TEXT[]  NOT NULL
grant_types          TEXT[]  DEFAULT ARRAY['authorization_code','refresh_token']
is_confidential      BOOLEAN DEFAULT TRUE
is_active            BOOLEAN DEFAULT TRUE
[padrão]
```

#### `api_request_logs` (particionado por dia)
```
id                   UUID    DEFAULT gen_random_uuid()
tenant_id            UUID    NOT NULL
api_key_id           UUID    FK → api_keys(id) NULL
user_id              UUID    FK → users(id) NULL
method               VARCHAR(7)
path                 TEXT
query_params         TEXT
status_code          SMALLINT
duration_ms          INTEGER
ip_address           INET
user_agent           TEXT
request_id           UUID
error_message        TEXT
created_at           TIMESTAMPTZ NOT NULL
-- Sem PK declarada — append-only partitioned table
PARTITION BY RANGE (created_at)
```

---

## 5. Relacionamentos e Cardinalidade

### 5.1 Diagrama ER Textual (Entidades Principais)

```
tenants (1) ──────────── (N) users
tenants (1) ──────────── (N) companies
tenants (1) ──────────── (N) devices
tenants (1) ──────────── (N) tickets
tenants (1) ──────────── (N) automations
tenants (1) ──────────── (N) scripts
tenants (1) ──────────── (1) subscriptions

companies (1) ─────────── (N) branches
branches (1) ──────────── (N) departments
departments (1) ────────── (N) users
departments (1) ────────── (N) devices
locations (1) ─────────── (N) devices
locations (1) ─────────── (N) printers

devices (1) ───────────── (1) hardware_specs
devices (1) ───────────── (N) cpu_specs (multi-socket)
devices (1) ───────────── (N) storage_devices
storage_devices (1) ────── (N) smart_data
devices (1) ───────────── (N) network_interfaces
devices (1) ───────────── (N) software_installations
devices (1) ───────────── (N) alerts
devices (1) ───────────── (N) asset_records (1:1)
devices (1) ───────────── (N) device_warranties
devices (1) ───────────── (N) script_executions

software_installations (N) ── (1) software_catalog
software_catalog (1) ──────── (N) software_versions
software_licenses (1) ─────── (N) license_keys
software_licenses (1) ─────── (N) license_assignments
license_assignments (N) ────── (1) users

alert_rules (1) ───────── (N) alerts
alerts (N) ────────────── (1) devices
alerts (1) ────────────── (N) tickets (auto-abertura)

tickets (1) ───────────── (N) ticket_comments
tickets (1) ───────────── (N) ticket_attachments
tickets (1) ───────────── (N) ticket_time_entries
tickets (1) ───────────── (1) sla_policies

automations (1) ─────────── (N) automation_triggers
automations (1) ─────────── (N) automation_conditions
automations (1) ─────────── (N) automation_actions
automations (1) ─────────── (N) automation_runs
automation_actions (N) ───── (1) scripts
automation_runs (1) ────────── (N) script_executions

scripts (1) ───────────── (N) script_versions
script_executions (N) ────── (1) devices

ai_sessions (1) ──────────── (N) ai_messages
ai_sessions (1) ──────────── (N) ai_analyses
rag_documents (1) ─────────── (N) rag_chunks
rag_chunks: embedding (vector) ←→ pgvector index

subnets (1) ──────────── (N) network_hosts
subnets (1) ──────────── (N) network_devices
network_devices (1) ───── (N) switch_ports
switch_ports (N) ────────── (1) devices (via connected_device_id)

printers (1) ──────────── (N) printer_consumables
printers (1) ──────────── (N) print_queues
print_queues (1) ─────────── (N) print_jobs
```

### 5.2 Chaves Estrangeiras Críticas

| Tabela | FK | Referência | ON DELETE |
|--------|----|-----------|-----------|
| `devices` | `category_id` | `device_categories(id)` | SET NULL |
| `devices` | `model_id` | `device_models(id)` | SET NULL |
| `devices` | `assigned_user_id` | `users(id)` | SET NULL |
| `alerts` | `device_id` | `devices(id)` | CASCADE |
| `alerts` | `rule_id` | `alert_rules(id)` | SET NULL |
| `tickets` | `reporter_id` | `users(id)` | RESTRICT |
| `tickets` | `alert_id` | `alerts(id)` | SET NULL |
| `script_executions` | `device_id` | `devices(id)` | CASCADE |
| `automation_actions` | `script_id` | `scripts(id)` | RESTRICT |
| `rag_chunks` | `document_id` | `rag_documents(id)` | CASCADE |
| `audit_events` | `tenant_id` | `tenants(id)` | RESTRICT |

> **Regra geral:** Dados de segurança e auditoria: `RESTRICT`. Dados operacionais pai→filho: `CASCADE`. Referências opcionais: `SET NULL`.

---

## 6. Índices

### 6.1 Índices B-Tree Compostos (Mais Frequentes)

```
-- devices: filtro primário de todo o produto
CREATE INDEX idx_devices_tenant_status ON devices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_devices_tenant_category ON devices(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_devices_tenant_last_seen ON devices(tenant_id, last_seen_at DESC);
CREATE INDEX idx_devices_assigned_user ON devices(tenant_id, assigned_user_id) WHERE assigned_user_id IS NOT NULL;

-- alerts: dashboard principal de monitoramento
CREATE INDEX idx_alerts_tenant_status_severity ON alerts(tenant_id, status, severity);
CREATE INDEX idx_alerts_tenant_device ON alerts(tenant_id, device_id);
CREATE INDEX idx_alerts_tenant_created ON alerts(tenant_id, created_at DESC);

-- tickets: helpdesk
CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_tenant_assignee ON tickets(tenant_id, assignee_id);
CREATE INDEX idx_tickets_tenant_priority ON tickets(tenant_id, priority_id, created_at DESC);
CREATE INDEX idx_tickets_sla_deadline ON tickets(tenant_id, sla_deadline) WHERE status NOT IN ('resolved','closed');

-- software_installations: inventário
CREATE INDEX idx_sw_install_tenant_device ON software_installations(tenant_id, device_id);
CREATE INDEX idx_sw_install_tenant_software ON software_installations(tenant_id, software_id);

-- script_executions
CREATE INDEX idx_script_exec_tenant_device ON script_executions(tenant_id, device_id, created_at DESC);
CREATE INDEX idx_script_exec_tenant_status ON script_executions(tenant_id, status);

-- audit_events (append-only, particionado)
CREATE INDEX idx_audit_tenant_created ON audit_events(tenant_id, created_at DESC);
CREATE INDEX idx_audit_tenant_actor ON audit_events(tenant_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_tenant_resource ON audit_events(tenant_id, resource_type, resource_id);
```

### 6.2 Índices GIN (JSONB e Arrays)

```
-- metadata e configurações com queries JSONB
CREATE INDEX idx_devices_metadata_gin ON devices USING GIN(metadata);
CREATE INDEX idx_devices_tags_gin ON devices USING GIN(tags);
CREATE INDEX idx_alerts_data_gin ON alerts USING GIN(context);
CREATE INDEX idx_scripts_tags_gin ON script_tag_assignments USING GIN(tags);
CREATE INDEX idx_api_key_scopes_gin ON api_keys USING GIN(scopes);
CREATE INDEX idx_webhook_events_gin ON webhook_endpoints USING GIN(event_types);
```

### 6.3 Índices GiST (Rede / Geo)

```
-- Queries de overlap de sub-redes (INET containment)
CREATE INDEX idx_subnets_cidr_gist ON subnets USING GiST(network_cidr inet_ops);
CREATE INDEX idx_ip_addresses_gist ON ip_addresses USING GiST(address inet_ops);
CREATE INDEX idx_network_hosts_ip_gist ON network_hosts USING GiST(ip_address inet_ops);
```

### 6.4 Índices BRIN (Séries Temporais e Logs)

```
-- Tabelas append-only com crescimento linear no tempo — BRIN é 100-1000x menor que B-Tree
CREATE INDEX idx_audit_events_brin ON audit_events USING BRIN(created_at);
CREATE INDEX idx_api_request_logs_brin ON api_request_logs USING BRIN(created_at);
CREATE INDEX idx_notification_logs_brin ON notification_logs USING BRIN(sent_at);
-- TimescaleDB gerencia seus próprios índices BRIN por chunk automaticamente
```

### 6.5 Índices Hash (Lookups por Igualdade Exata)

```
-- API key lookup por hash — operação crítica a cada request
CREATE INDEX idx_api_keys_hash ON api_keys USING HASH(key_hash);
CREATE INDEX idx_devices_serial ON devices USING HASH(serial_number);
CREATE INDEX idx_devices_agent_id ON devices USING HASH(agent_id);
```

### 6.6 Full Text Search

```
-- Busca global em tickets
CREATE INDEX idx_tickets_fts ON tickets
  USING GIN(to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'')));

-- Busca em base de conhecimento
CREATE INDEX idx_kb_articles_fts ON kb_articles
  USING GIN(to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(content,'')));

-- Busca em scripts
CREATE INDEX idx_scripts_fts ON scripts
  USING GIN(to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'')));
```

### 6.7 Índices pgvector (Embeddings)

```
-- HNSW: melhor para recall alto e queries de produção (mais lento para build, mais rápido para search)
CREATE INDEX idx_rag_chunks_hnsw ON rag_chunks
  USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- IVFFlat: para tabelas muito grandes (>1M vetores), mais eficiente em memória
CREATE INDEX idx_embeddings_ivfflat ON embeddings
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 200);
```

---

## 7. Estratégia de Particionamento

### 7.1 Particionamento por Range de Tempo

```
-- audit_events: partição mensal automática (via pg_partman ou manual)
CREATE TABLE audit_events (
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Partições criadas mensalmente (automação via pg_partman):
-- audit_events_2025_01, audit_events_2025_02, ..., audit_events_2025_12

-- api_request_logs: partição diária (volume muito alto)
CREATE TABLE api_request_logs (
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- notification_logs: partição mensal
-- smart_data: partição mensal (histórico de SMART)
```

### 7.2 Particionamento por Hash (Multi-Tenant em Alta Escala)

Para escala extrema (>10.000 tenants), adicionar hash partition sobre `tenant_id`:

```
-- devices: partição por hash de tenant_id (16 partitions = boa distribuição)
CREATE TABLE devices (...) PARTITION BY HASH (tenant_id);
CREATE TABLE devices_p0 PARTITION OF devices FOR VALUES WITH (MODULUS 16, REMAINDER 0);
-- ... devices_p1 até devices_p15
```

### 7.3 Retenção de Dados

| Tabela | Retenção | Ação |
|--------|----------|------|
| `audit_events` | 5 anos (legal) | Archive para MinIO após 1 ano |
| `api_request_logs` | 90 dias | Drop de partição antiga |
| `notification_logs` | 1 ano | Drop de partição |
| `smart_data` | 2 anos | Archive para MinIO |
| `device_metrics` (TimescaleDB) | 30 dias raw | Continuous aggregate → retenção seletiva |
| `automation_logs` | 1 ano | Archive |
| `script_execution_logs` | 2 anos | Archive |
| `print_jobs` | 6 meses | Drop de partição |

---

## 8. Modelo TimescaleDB

### 8.1 Hypertables e Configuração

#### `device_metrics` (principal — CPU, RAM, Disco, Rede, Temperatura, Bateria, GPU)

```
Colunas:
  time          TIMESTAMPTZ   NOT NULL
  tenant_id     UUID          NOT NULL
  device_id     UUID          NOT NULL
  metric_name   TEXT          NOT NULL  -- 'cpu_percent','memory_used_pct','disk_read_bps',etc.
  value         DOUBLE PRECISION NOT NULL
  unit          TEXT                    -- '%','bytes','celsius','rpm'
  tags          JSONB         DEFAULT '{}'  -- cpu_core=0, disk_id=sda, interface=eth0

Hypertable: chunk_time_interval = 1 DAY
Space partitioning: by device_id (4 partitions)

Chunk size estimado: 10M devices × 10 métricas × 1440 pts/dia = ~144B pts/dia total na plataforma
Por chunk diário por partition: gerenciável com compressão nativa
```

#### `service_status_metrics` (serviços do OS monitorados)
```
  time          TIMESTAMPTZ   NOT NULL
  tenant_id     UUID          NOT NULL
  device_id     UUID          NOT NULL
  service_name  TEXT          NOT NULL
  status        TEXT          -- 'running','stopped','paused','unknown'
  cpu_percent   DOUBLE PRECISION
  memory_mb     INTEGER
  pid           INTEGER
  restart_count SMALLINT

chunk_time_interval = 1 HOUR (alta frequência)
```

#### `process_metrics`
```
  time          TIMESTAMPTZ   NOT NULL
  tenant_id     UUID          NOT NULL
  device_id     UUID          NOT NULL
  pid           INTEGER       NOT NULL
  process_name  TEXT          NOT NULL
  cpu_percent   DOUBLE PRECISION
  memory_mb     INTEGER
  disk_read_bps BIGINT
  disk_write_bps BIGINT
  net_bytes_in  BIGINT
  net_bytes_out BIGINT

chunk_time_interval = 1 HOUR
Retenção raw: 7 dias (volume muito alto)
```

#### `snmp_metrics`
```
  time            TIMESTAMPTZ   NOT NULL
  tenant_id       UUID          NOT NULL
  network_device_id UUID        NOT NULL
  oid             TEXT          NOT NULL
  value_type      TEXT          -- 'counter','gauge','string','integer'
  value_numeric   DOUBLE PRECISION
  value_text      TEXT

chunk_time_interval = 1 DAY
```

#### `printer_metrics`
```
  time              TIMESTAMPTZ   NOT NULL
  tenant_id         UUID          NOT NULL
  printer_id        UUID          NOT NULL
  total_page_count  BIGINT
  mono_pages        BIGINT
  color_pages       BIGINT
  a4_pages          BIGINT
  a3_pages          BIGINT
  toner_black_pct   SMALLINT
  toner_cyan_pct    SMALLINT
  toner_magenta_pct SMALLINT
  toner_yellow_pct  SMALLINT
  drum_pct          SMALLINT
  status            TEXT

chunk_time_interval = 1 DAY
```

#### `health_scores`
```
  time            TIMESTAMPTZ   NOT NULL
  tenant_id       UUID          NOT NULL
  device_id       UUID          NOT NULL
  overall_score   SMALLINT      CHECK (overall_score BETWEEN 0 AND 100)
  cpu_score       SMALLINT
  memory_score    SMALLINT
  disk_score      SMALLINT
  network_score   SMALLINT
  security_score  SMALLINT
  calculation_details JSONB

chunk_time_interval = 1 HOUR
```

### 8.2 Políticas de Retenção e Compressão

```
Compressão (TimescaleDB Native Compression):
  device_metrics:        compress after 7 days,  DROP after 30 days (raw)
  service_status_metrics: compress after 1 day,  DROP after 7 days
  process_metrics:       compress after 1 day,   DROP after 7 days
  snmp_metrics:          compress after 7 days,  DROP after 90 days
  printer_metrics:       compress after 7 days,  DROP after 365 days
  health_scores:         compress after 7 days,  DROP after 90 days

Segmentar por: [tenant_id, device_id] — melhor taxa de compressão por correlação
Redução esperada: 90-97% (TSDB nativo comprime series com alta correlação temporal)
```

### 8.3 Continuous Aggregates (Materialized em Tempo Real)

```
device_metrics_hourly:
  bucket = 1 hora
  colunas: avg(value), min(value), max(value), stddev(value), count(*)
  retenção: 1 ANO

device_metrics_daily:
  bucket = 1 dia
  from: device_metrics_hourly (hierarquical CA)
  retenção: 3 ANOS

device_metrics_monthly:
  bucket = 1 mês
  from: device_metrics_daily
  retenção: INDEFINIDO

health_scores_hourly:
  bucket = 1 hora
  retenção: 90 dias

printer_metrics_daily:
  bucket = 1 dia
  retenção: 2 ANOS
```

---

## 9. Modelo pgvector

### 9.1 Estratégia de Embedding por Tipo de Conteúdo

| Fonte | Tabela de embedding | Dimensão | Modelo |
|-------|---------------------|----------|--------|
| Artigos KB | `rag_chunks` | 1536 | text-embedding-3-small |
| Scripts | `rag_chunks` | 1536 | text-embedding-3-small |
| Soluções de tickets | `rag_chunks` | 1536 | text-embedding-3-small |
| Manuais de fabricantes | `rag_chunks` | 1536 | text-embedding-3-small |
| Logs de diagnóstico | `embeddings` | 1536 | text-embedding-3-small |
| Comandos de automação | `embeddings` | 1536 | text-embedding-3-small |
| Diagnósticos IA | `embeddings` | 1536 | text-embedding-3-small |

### 9.2 Estratégia de Chunking para RAG

```
Regra de chunking:
  Tamanho máximo por chunk: 512 tokens
  Overlap: 50 tokens (preserva contexto entre chunks consecutivos)
  Split: por parágrafo > por sentença > por token count

Metadados obrigatórios por chunk:
  - source_type: origem do documento
  - section_title: título da seção
  - position: [início, fim] em caracteres no doc original
  - language: 'pt' | 'en'
```

### 9.3 Pipeline de Embedding

```
Trigger: KnowledgeBaseUpdated / ScriptUpdated / TicketClosed (com solução)
    │
    ▼
Embedding Service (async queue via RabbitMQ)
    │  1. Chunking do texto
    │  2. Chamada à API de embedding (OpenAI / local Ollama)
    │  3. Upsert em rag_chunks com vector
    │
    ▼
pgvector (IVFFlat index re-treinado semanalmente se > 10k novos vetores)
```

### 9.4 Query de Similaridade

```
Busca semântica (exemplo conceitual):
SELECT
  rc.id,
  rd.title,
  rd.source_type,
  rc.content,
  1 - (rc.embedding <=> $query_vector) AS similarity
FROM rag_chunks rc
JOIN rag_documents rd ON rd.id = rc.document_id
WHERE
  (rd.tenant_id = $tenant_id OR rd.tenant_id IS NULL)
  AND 1 - (rc.embedding <=> $query_vector) > 0.75
ORDER BY rc.embedding <=> $query_vector
LIMIT 10;
```

---

## 10. Materialized Views

### 10.1 Dashboard Executivo

```
mv_executive_dashboard (refresh: a cada 5 min)
Dados:
  - Total de dispositivos por status (online/offline/unknown)
  - Uptime percentual (últimas 24h)
  - Alertas críticos abertos
  - Tickets abertos por prioridade
  - SLA compliance (% chamados dentro do prazo — 7 dias)
  - Dispositivos com health score < 50

Fonte: devices, alerts, tickets, health_scores (TimescaleDB CA)
```

### 10.2 Dashboard Técnico

```
mv_technical_dashboard (refresh: a cada 1 min)
Dados:
  - Dispositivos online agora vs há 1h
  - Top 10 alertas por frequência (7 dias)
  - CPU médio e pico por categoria de dispositivo (1h)
  - Fila de automações pendentes
  - Scripts em execução agora
  - Agentes offline por mais de 15 min

Fonte: devices, alerts, automations, device_metrics (TimescaleDB)
```

### 10.3 Inventário Consolidado

```
mv_inventory_summary (refresh: a cada 15 min)
Dados:
  - Total de ativos por categoria
  - Dispositivos sem agente instalado
  - Dispositivos com garantia vencida / a vencer em 30/60/90 dias
  - Discos com saúde SMART crítica
  - Softwares instalados sem licença

Fonte: devices, hardware_specs, storage_devices, smart_data, device_warranties,
       software_installations, license_assignments
```

### 10.4 Licenciamento

```
mv_license_compliance (refresh: a cada 1 hora)
Dados:
  - Licenças utilizadas vs contratadas (% ocupação)
  - Licenças próximas do vencimento (30/60/90 dias)
  - Software instalado sem licença atribuída
  - Licenças subutilizadas (< 20% uso nos últimos 30 dias)
  - Custo total de licenças por vendor

Fonte: software_licenses, license_assignments, software_installations,
       software_usage_metrics
```

### 10.5 Performance (por Tenant)

```
mv_performance_summary (refresh: a cada 5 min)
Dados:
  - Média de CPU/RAM por categoria de dispositivo (1h)
  - Top 20 dispositivos com mais alertas (7 dias)
  - Top 10 processos mais pesados por tenant
  - Dispositivos com SMART degradado (health < good)

Fonte: device_metrics (TimescaleDB CA hourly), process_metrics (CA),
       storage_devices, smart_data
```

### 10.6 SLA

```
mv_sla_compliance (refresh: a cada 5 min)
Dados:
  - % chamados resolvidos dentro do SLA por período
  - Tempo médio de primeira resposta
  - Tempo médio de resolução
  - Chamados com SLA violado ainda abertos
  - Técnicos com mais SLA breaches

Fonte: tickets, sla_policies, sla_breaches, ticket_time_entries
```

---

## 11. Estratégia de Auditoria

### 11.1 Tabela `audit_events` (schema: public, append-only)

```
id                UUID          PK (gen_random_uuid())
event_id          UUID          UNIQUE NOT NULL              -- idempotência
tenant_id         UUID          NOT NULL FK → tenants(id)
actor_id          UUID          NULL                         -- user ou system
actor_type        TEXT          CHECK IN ('user','system','api_key','agent')
actor_email       TEXT          NULL                         -- denormalizado p/ auditoria fora do contexto de usuário
action            TEXT          NOT NULL                     -- 'devices.create','tickets.close',etc.
resource_type     TEXT          NOT NULL                     -- 'device','ticket','user','script'
resource_id       UUID          NULL
resource_name     TEXT          NULL
old_values        JSONB         NULL                         -- snapshot antes da mudança
new_values        JSONB         NULL                         -- snapshot depois
ip_address        INET          NULL
user_agent        TEXT          NULL
request_id        UUID          NULL
session_id        UUID          NULL
status            TEXT          CHECK IN ('success','failure')
failure_reason    TEXT          NULL
metadata          JSONB         DEFAULT '{}'
occurred_at       TIMESTAMPTZ   NOT NULL
created_at        TIMESTAMPTZ   DEFAULT NOW()

PARTITION BY RANGE (occurred_at)
-- Sem UPDATE, sem DELETE permitidos via RLS policy
```

### 11.2 Eventos Auditados Obrigatórios

| Categoria | Eventos |
|-----------|---------|
| **Identidade** | Login, Logout, LoginFailed, PasswordChanged, MfaEnabled/Disabled, UserCreated/Updated/Deleted, RoleAssigned |
| **Dispositivos** | DeviceCreated, DeviceDeleted, DeviceAssigned, AgentInstalled, AgentUninstalled |
| **Scripts** | ScriptCreated, ScriptExecuted, ScriptDeleted, ScriptVersionApproved |
| **Tickets** | TicketCreated, TicketAssigned, TicketClosed, SlaBreached |
| **Automações** | AutomationCreated, AutomationToggled, AutomationExecuted, AutomationFailed |
| **Inventário** | SoftwareInstalled, SoftwareRemoved, LicenseAssigned |
| **Config** | SettingsChanged, FeatureFlagChanged, IntegrationConfigured |
| **Segurança** | ApiKeyCreated, ApiKeyRevoked, OAuthClientCreated, RlsPolicyChanged |
| **Billing** | PlanChanged, PaymentProcessed, SubscriptionCancelled |

### 11.3 Trigger de Auditoria (via Outbox Pattern)

Ao invés de triggers PostgreSQL por tabela (acoplamento alto), toda auditoria flui via:

```
Aplicação → grava audit_event na mesma transação (Outbox)
         → RabbitMQ consumer persiste no audit_events particionado
         → Imutabilidade garantida: nenhuma aplicação tem GRANT UPDATE/DELETE em audit_events
```

---

## 12. Estratégia de Segurança (RLS)

### 12.1 Row Level Security por Tenant

```
-- Política padrão aplicada em TODAS as tabelas do schema tenant_*
-- O app define SET LOCAL nexsupport.current_tenant_id = $tenantId antes de qualquer query

CREATE POLICY tenant_isolation_select ON devices
  FOR SELECT
  USING (tenant_id = current_setting('nexsupport.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON devices
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('nexsupport.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON devices
  FOR UPDATE
  USING (tenant_id = current_setting('nexsupport.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('nexsupport.current_tenant_id')::uuid);

-- Soft delete: UPDATE apenas, não DELETE
CREATE POLICY no_hard_delete ON devices
  FOR DELETE
  USING (FALSE);  -- hard delete proibido para todos
```

### 12.2 Roles de Banco

```
nexsupport_app       → role usada pelos microsserviços (DML: SELECT, INSERT, UPDATE)
nexsupport_reader    → role para analytics/reporting (SELECT only)
nexsupport_admin     → role para migrations e operações de plataforma (DDL)
nexsupport_audit     → role para audit service (INSERT only em audit_events; SELECT para compliance)
```

### 12.3 Criptografia de Campos Sensíveis

Campos que requerem `pgp_sym_encrypt` via extensão `pgcrypto`:
- `license_keys.key_value`
- `snmp_credentials.community_string` / `auth_password` / `priv_password`
- `integration_configs.credentials` (JSONB inteiro)
- `webhook_endpoints.secret`
- `oauth_clients.client_secret_hash` (hash, não cifrado)

### 12.4 Mascaramento de Dados (LGPD)

```
-- View mascarada para acesso de operadores de suporte (sem dados PII completos)
CREATE VIEW users_masked AS
SELECT
  id,
  tenant_id,
  -- Mascaramento de email: "jo***@example.com"
  regexp_replace(email, '(?<=.{2}).(?=.*@)', '*', 'g') AS email,
  LEFT(name, 1) || '***' AS name,
  status,
  last_login_at,
  created_at
FROM users
WHERE deleted_at IS NULL;

-- Acesso: GRANT SELECT ON users_masked TO nexsupport_reader;
-- Acesso negado: REVOKE SELECT ON users FROM nexsupport_reader;
```

---

## 13. Estratégia de Backup e Alta Disponibilidade

### 13.1 Topologia de Alta Disponibilidade

```
┌─────────────────────────────────────────────────────────┐
│                  POSTGRESQL HA CLUSTER                   │
│                                                          │
│  [Primary]  ──WAL─→  [Replica 1 - sync]                │
│      │       ──WAL─→  [Replica 2 - async]               │
│      │                                                   │
│  [Patroni]  ← coordena eleição de líder via etcd        │
│  [PgBouncer] ← connection pooling (port 5432 público)   │
│                                                          │
│  Failover automático: < 30 segundos                     │
│  Replica 1 (sync): zero RPO para leituras críticas      │
│  Replica 2 (async): para analytics/reporting (lag < 1s) │
└─────────────────────────────────────────────────────────┘
```

### 13.2 Estratégia de Backup

| Tipo | Frequência | Retenção | Destino |
|------|-----------|----------|---------|
| **pg_basebackup** (full snapshot) | Diário, 02:00 UTC | 30 dias | MinIO (bucket: `nexsupport-backups`) |
| **WAL Archiving** (PITR) | Contínuo (a cada WAL segment ~16MB) | 7 dias | MinIO |
| **Logical backup** por tenant | Semanal | 90 dias | MinIO (criptografado GPG) |
| **Schema-only dump** | A cada deploy | 1 ano | Git + MinIO |

### 13.3 Point-in-Time Recovery (PITR)

```
RTO (Recovery Time Objective): < 1 hora para restore completo
RPO (Recovery Point Objective): < 5 minutos (último WAL segment arquivado)

Procedure:
1. Restore do último basebackup para instância de recovery
2. Replay de WAL archives até o ponto desejado
3. Promoção da instância de recovery como novo primary
4. Redirecionamento do PgBouncer
```

### 13.4 TimescaleDB Backup

- Hypertables são backupeadas junto com o PostgreSQL via pg_basebackup
- Chunks comprimidos antigos: exportados para Parquet no MinIO (via timescaledb-backup tool)
- Retenção de Parquet: indefinida (cold storage)

### 13.5 Disaster Recovery

- **RTO target:** < 4 horas (restore completo em nova infra)
- **RPO target:** < 15 minutos
- Réplica de DR em região diferente (streaming replication assíncrona)
- Runbook de DR documentado e testado trimestralmente

---

## 14. Justificativa Técnica das Decisões

| Decisão | Justificativa |
|---------|---------------|
| **UUID v7 como PK** | Time-ordered (reduz fragmentação de índice B-tree vs UUIDv4), sem colisão distribuída, sem exposição de sequência serial |
| **Schema-per-tenant** | Isolamento completo, backup por tenant, migrações independentes, sem risco de data leak por erro de WHERE. Trade-off: complexidade de migrations (solucionado por scripts automatizados) |
| **Soft Delete universal** | Permite auditoria de deleções, undo operacional, análise de ciclo de vida. Índices parciais `WHERE deleted_at IS NULL` mantêm performance |
| **TIMESTAMPTZ sempre** | Suporte a tenants em fusos horários diferentes; comparações corretas entre datas de sistemas distribuídos |
| **JSONB para configurações/metadata** | Flexibilidade sem migrações para atributos variáveis por tenant/dispositivo. GIN index mantém performance de queries |
| **TimescaleDB para métricas** | Superset do PostgreSQL (sem novo sistema a operar), compressão nativa 90%+, continuous aggregates automáticos, particionamento por tempo gerenciado |
| **pgvector no PostgreSQL** | Evita infraestrutura adicional de vector DB (Pinecone, Weaviate); ACID junto às transações de negócio; RLS aplicado naturalmente |
| **HNSW sobre IVFFlat para RAG** | Melhor recall (>99% vs ~95%), sem fase de treinamento ao inserir vetores, mais previsível em produção. IVFFlat reservado para tabelas > 1M vetores |
| **Append-only em audit_events** | Integridade legal: impossível alterar histórico. Particionamento mensal = DROP de partição antiga em O(1) sem impacto |
| **RLS como segunda camada** | Mesmo com bug na camada de aplicação (ex: tenant_id errado), o banco bloqueia. Defense in depth para dados de múltiplos tenants |
| **BRIN em tabelas de log** | 100-1000x menor que B-tree, suficiente para filtros por range de data em dados sequencialmente inseridos. Não adequado para UUIDs aleatórios |
| **Índices parciais com WHERE deleted_at IS NULL** | 90%+ dos registros nunca são deletados; índice parcial é muito menor e mais eficiente para queries que filtram ativos |
| **Materialized Views com refresh agendado** | Evita recalcular KPIs em cada request do dashboard. Dados aceitavelmente frescos (1-5 min) sem custo de query em tempo real |
| **Criptografia seletiva de campos** | Criptografar tudo tem custo de CPU e impossibilita índices. Apenas campos PII/sensíveis reais são cifrados; demais campos têm proteção via RLS + TLS |
| **NUMERIC para valores monetários** | Precisão exata sem arredondamento de ponto flutuante. NUMERIC(15,2) cobre até R$ 999 trilhões |

---

*Documento gerado em: Julho 2025*  
*Próxima etapa: Prompt 04 — Implementação SQL do banco de dados*  
*Responsável: Principal Database Architect — NexSupport AI*
