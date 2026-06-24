# 02 — Modelo de Dados

> Schema completo do Supabase novo. Tudo nasce limpo — sem legado, sem expand/contract.
> Convenções: toda tabela tem `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz`. FKs com `on delete` explícito. Nomes em inglês, snake_case.

## Enums

| Enum | Valores |
|---|---|
| `deal_stage` | `prospect, lead, diagnostico, oportunidade, escopo, proposta, negociacao, fechado, perdido, reativar_futuramente, desqualificado` |
| `deal_urgency` | `baixa, media, alta` |
| `project_status` | `a_iniciar, briefing, desenvolvimento, revisao, entregue` |
| `task_status` | `analisar, todo, doing, impedimento, done` |
| `task_priority` | `urgente, proximo, futuro` |
| `task_area` | `gestao, comercial, operacional, financeiro, sistema` |
| `level_scale` | `baixo, medio, alto` (usado em impact/effort) |
| `confidence_level` | `baixa, media, alta` |
| `contract_kind` | `mensal, avulso` |
| `contract_status` | `ativo, encerrado` |
| `narrative_status` | `ativa, concluida, arquivada` |
| `commitment_type` | `think_it, build_it, launch_it, quantitativo` |
| `commitment_status` | `em_andamento, cumprido, nao_cumprido` |
| `charge_kind` | `setup, recorrencia, avulso` |
| `charge_status` | `pendente, pago, cancelado` (reusado em accounts_payable) |
| `charge_method` | `pix, boleto, cartao, transferencia, outro` |
| `payable_category` | `fixo, variavel, imposto` |
| `task_recurrence` | `none, monthly` |
| `activity_type` | `nota, reuniao, ligacao, email, whatsapp, outro` |
| `strategy_block_kind` | `missao, proposito, swot, asis_tobe, blueprint` |

## Tabelas

### `profiles` (equipe)
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid pk | = `auth.users.id` |
| name | text not null | |
| email | text not null | |
| active | boolean default true | |

### `companies` (Contatos)
| Coluna | Tipo | Regra |
|---|---|---|
| name | text not null | nome da empresa/pessoa |
| segment | text | |
| city | text | |
| contact_name / contact_phone / contact_email | text | espelham o primeiro registro de `company_contacts` (compat) |
| origin | **text livre** | ex.: "veio pelo Roberto que conhece a Maria". SEM enum, SEM tabela de origens |
| owner_id | uuid fk→profiles set null | DRI (sem uso na UI — decision do Octavio: "todos somos responsáveis") |
| notes | text | |
| archived_at | timestamptz | NULL = ativo; preenchido = arquivado (soft delete, reversível) |

**SEM coluna `status`** — o estado do contato é derivado (ver "Estado derivado" abaixo).

### `company_contacts` (múltiplos contatos por empresa — migration 0015)
| Coluna | Tipo | Regra |
|---|---|---|
| company_id | uuid fk→companies cascade not null | |
| name | text not null | |
| phone | text | |
| position | int default 0 | ordenação; position=0 é o contato principal |

UI limita a 3 contatos por empresa. O primeiro (position=0) espelha `companies.contact_name/phone` para compat.

### `deals` (Negócios)
| Coluna | Tipo | Regra |
|---|---|---|
| company_id | uuid fk→companies cascade not null | |
| title | text not null | |
| stage | deal_stage not null default 'prospect' | |
| estimated_value | numeric(12,2) | |
| budget | text | qualificação |
| urgency | deal_urgency | qualificação |
| decision_maker | text | qualificação |
| next_action | text | |
| next_action_date | date | |
| owner_id | uuid fk→profiles set null | DRI |
| has_maintenance | boolean | obrigatório (not null) quando stage='fechado' |
| lost_reason | text | obrigatório quando stage='perdido' |
| closed_at | timestamptz | preenchido quando stage ∈ {fechado, perdido, reativar_futuramente, desqualificado} |

CHECKs: `perdido ⇒ lost_reason not null` · `fechado ⇒ has_maintenance not null` · `estágio terminal ⇔ closed_at not null`.

`archived_at timestamptz` — NULL = ativo; preenchido = arquivado (some das listas ativas, reversível). **Excluir** é DELETE real (cascata nos projetos/tasks vinculadas).

### `deal_stage_events` (histórico do funil — alimenta a página Funil)
| Coluna | Tipo |
|---|---|
| deal_id | uuid fk→deals cascade not null |
| stage | deal_stage not null |
| entered_at | timestamptz default now() |
| created_by | uuid fk→profiles set null |

Gravado pela server action a CADA mudança de estágio (incluindo a criação). Sem trigger.

### `projects`
| Coluna | Tipo | Regra |
|---|---|---|
| company_id | uuid fk→companies cascade not null | |
| deal_id | uuid fk→deals set null not null na criação | projeto sempre nasce de um deal em Oportunidade |
| name | text not null | nome específico, ex.: "CRM Moda em Foco" |
| status | project_status default 'a_iniciar' | macro-status: colunas FIXAS do kanban de Implementação |
| custom_stages | jsonb | etapas internas customizáveis da barra de progresso: `[{id, name, done}]`. Default: null (usa as 5 padrão) |
| scope_items | jsonb default '[]' | checklist escopo: `[{id, title, contracted: bool, delivered: bool}]` |
| total_value | numeric(12,2) | |
| start_date / due_date | date | |
| owner_id | uuid fk→profiles set null | DRI |
| drive_url | text | |
| notes | text | |
| proposal | jsonb default '{}' | estimativas pré-fechamento: `{setup_estimate, maintenance_min, maintenance_max, hourly_estimate, delivery_estimate, notes}` (migration 0016). Não confundir com cobranças reais (`charges`) |
| completed_at | timestamptz | data real de conclusão (`status='entregue'`); backfill de `updated_at` para itens já entregues (migration 0019) |

**Visibilidade derivada do deal:** o projeto aparece em *Oportunidades* (Comercial) enquanto `deal.stage ∈ {oportunidade, escopo, proposta, negociacao}`; aparece em *Implementação* (Operacional) quando `deal.stage = 'fechado'`. Deal perdido/reativar → projeto some das duas listas (fica acessível pelo perfil do contato).

### `project_stage_events` (histórico de fases da Implementação)
| Coluna | Tipo |
|---|---|
| project_id | uuid fk→projects cascade not null |
| status | project_status not null |
| entered_at | timestamptz default now() |

Gravado pela action a cada mudança de `status`.

### `tasks`
| Coluna | Tipo | Regra |
|---|---|---|
| title | text not null | |
| description | text | |
| status | task_status default 'todo' | |
| priority | task_priority default 'proximo' | |
| area | task_area not null | inclui `gestao` |
| assignee_id | uuid fk→profiles set null | |
| project_id | uuid fk→projects set null | |
| deal_id | uuid fk→deals set null | |
| company_id | uuid fk→companies set null | |
| commitment_id | uuid fk→commitments set null | vínculo NCT (filtro "por compromisso") |
| contract_id | uuid fk→contracts set null | **tarefas de manutenção** (migration 0008) — vincula a tarefa ao contrato |
| due_date | date | |
| impact / effort | level_scale | priorização Impacto×Esforço |
| recurrence | task_recurrence default 'none' | `none` ou `monthly` — tarefas de manutenção recorrentes (migration 0008) |
| recurrence_day | int (1–28) | dia do mês para a próxima ocorrência (obrigatório se recurrence='monthly') |
| archived_at | timestamptz | soft delete (migration 0009) |
| completed_at | timestamptz | data real de conclusão (`status='done'`); backfill de `updated_at` (migration 0019) |

**Distinção de contexto por vínculo:**
- Tarefa de implementação: `project_id` setado, `area='operacional'`, gerenciada em `/implementacao/[id]`
- Tarefa de manutenção: `contract_id` setado, `area='operacional'`, gerenciada em `/manutencao/[contractId]`
- Tarefa global (NCT/gestão): `commitment_id` e/ou nenhum vínculo específico, gerenciada em `/tarefas`

### `contracts` (Manutenção)
| Coluna | Tipo | Regra |
|---|---|---|
| company_id | uuid fk→companies cascade not null | |
| project_id | uuid fk→projects set null | |
| name | text not null | |
| kind | contract_kind not null | `mensal` (recorrente) ou `avulso` (pontual) |
| status | contract_status default 'ativo' | |
| monthly_value | numeric(12,2) | obrigatório se kind='mensal' |
| min_months | int | contrato mínimo em meses — base da geração de parcelas. Obrigatório se kind='mensal' |
| billing_day | int (1–28) | |
| start_date | date not null | |
| sla | text | |
| next_contact_date | date | |
| contact_frequency_days | int | |
| notes | text | |
| hourly_rate | numeric(12,2) | preço por hora do contrato avulso (migration 0010) |
| archived_at | timestamptz | soft delete (migration 0009) |

### `maintenance_interactions` (relatos de manutenção — migration 0017)
| Coluna | Tipo | Regra |
|---|---|---|
| contract_id | uuid fk→contracts cascade not null | |
| content | text not null | |
| created_by | uuid fk→profiles set null | |

Usado na seção "Relacionamento com o cliente" da tela `/manutencao/[contractId]`. O botão "Contato dado" registra uma interação e avança `contracts.next_contact_date` pela `contact_frequency_days`.

### `charges` (Contas a Receber)
| Coluna | Tipo | Regra |
|---|---|---|
| company_id | uuid fk→companies set null | |
| project_id | uuid fk→projects set null | |
| contract_id | uuid fk→contracts set null | |
| description | text not null | |
| kind | charge_kind not null | `setup` (fechamento de projeto) · `recorrencia` (parcela de manutenção) · `avulso` (manual) |
| amount | numeric(12,2) not null | |
| due_date | date not null | |
| status | charge_status default 'pendente' | |
| method | charge_method | |
| paid_at | timestamptz | CHECK: pago ⇔ paid_at not null |
| hours | numeric(6,2) | horas do lançamento avulso (migration 0010) |
| notes | text | |

Idempotência de recorrência: UNIQUE completo `(contract_id, due_date)` where contract_id is not null (migration 0013 tornou o índice completo para cobrir o ON CONFLICT corretamente).

### `accounts_payable` (Contas a Pagar)
| Coluna | Tipo |
|---|---|
| description | text not null |
| category | payable_category not null |
| amount | numeric(12,2) not null |
| due_date | date not null |
| status | charge_status default 'pendente' |
| paid_at | timestamptz |
| project_id | uuid fk→projects set null |
| source_charge_id | uuid fk→charges cascade set null | vínculo à cobrança que originou o lançamento automático de imposto ou taxa de maquininha (migration 0012) |
| supplier | text |
| notes | text |

### `narratives` (NCT)
| Coluna | Tipo |
|---|---|
| title | text not null |
| purpose | text |
| dri_id | uuid fk→profiles set null |
| status | narrative_status default 'ativa' |

**SEM coluna cycle** — filtros temporais substituem o conceito de trimestre.

### `commitments` (NCT)
| Coluna | Tipo | Regra |
|---|---|---|
| narrative_id | uuid fk→narratives cascade not null | |
| title | text not null | |
| description | text | |
| type | commitment_type not null | |
| status | commitment_status default 'em_andamento' | |
| progress | int default 0 | CHECK 0–100 |
| confidence | confidence_level default 'media' | |
| dri_id | uuid fk→profiles set null | |
| metric_target | text | só faz sentido para type='quantitativo' |

### `commitment_checkins` (histórico semanal)
| Coluna | Tipo |
|---|---|
| commitment_id | uuid fk→commitments cascade not null |
| progress | int CHECK 0–100 |
| confidence | confidence_level not null |
| comment | text |
| author_id | uuid fk→profiles set null |
| created_at | timestamptz default now() |

Ao registrar check-in, a action também atualiza `progress`/`confidence` no commitment (espelho do último check-in).

### `diagnostics` (aba do perfil do contato)
| Coluna | Tipo |
|---|---|
| company_id | uuid fk→companies cascade not null |
| deal_id | uuid fk→deals set null |
| context | text — situação atual do cliente |
| problems | text — dores identificadas |
| opportunities | text — oportunidades de IA/automação |
| proposed_solution | text |
| notes | text |

### `activities` (timeline de interações do contato)
| Coluna | Tipo |
|---|---|
| company_id | uuid fk→companies cascade not null |
| deal_id | uuid fk→deals set null |
| type | activity_type not null |
| content | text not null |
| occurred_at | timestamptz default now() |
| created_by | uuid fk→profiles set null |

### `strategy_blocks` (Estratégia — 5 blocos fixos)
| Coluna | Tipo | Regra |
|---|---|---|
| kind | strategy_block_kind not null UNIQUE | exatamente 5 linhas, criadas por seed |
| content | jsonb not null default '{}' | estrutura por kind (abaixo) |
| updated_by | uuid fk→profiles set null | |

Estrutura do `content` por kind:
- `missao` / `proposito`: `{ text }`
- `swot`: `{ strengths, weaknesses, opportunities, threats }` (textos)
- `asis_tobe`: `{ as_is, to_be }` (textos)
- `blueprint`: `{ channels, revenue, value_proposition, segments }` (textos)

UI só permite UPDATE — nunca INSERT/DELETE.

### `org_settings` (linha única)
| Coluna | Tipo | Regra |
|---|---|---|
| tax_rate | numeric(5,2) default 0 | Alíquota (%) — aplicada no cálculo de receita líquida |
| card_fee_rate | numeric(5,2) default 0 | Taxa de maquininha (%) — materializada como despesa variável ao confirmar pagamento por Cartão (migration 0014) |
| stale_deal_days | int default 7 | X dias para "negócio parado" no Dashboard |

Seed cria a linha única; UI só edita.

## Estado derivado do contato (REGRA CENTRAL — sem coluna, sem trigger)

Calculado na query (função TypeScript pura + testada, recebendo deals/projects/contracts do contato). Precedência de cima para baixo — o primeiro que casar vence:

1. **`em_negociacao`** — existe deal com stage ∈ {prospect…negociacao} (funil ativo)
2. **`cliente_ativo`** — existe projeto de deal fechado com status ≠ 'entregue', OU contrato de manutenção ativo
3. **`reativar`** — o deal mais recente terminou em `reativar_futuramente`
4. **`perdido`** — o deal mais recente terminou em `perdido`
5. **`inativo`** — já teve projeto entregue (e não caiu nas regras acima)
6. **`contato`** — nunca entrou no funil (sem deals, ou só desqualificados)

Deal `desqualificado` não conta como funil ativo nem como perdido — o contato volta a ser `contato`.

## Automações (todas em server actions, idempotentes, sem cron e sem triggers)

| Gatilho | Efeito |
|---|---|
| Qualquer mudança de `deal.stage` | Grava `deal_stage_events` |
| Deal → `oportunidade` | EXIGE nome do projeto no modal → cria `projects` vinculado. Sem projeto, a transição não acontece |
| Deal → `perdido` | Exige `lost_reason` |
| Deal → `desqualificado` | Só permitido a partir de `prospect` ou `lead` |
| Deal → `fechado` (wizard) | Coleta valor/parcelas/método de pagamento e opção de manutenção. Cria `charges` kind `setup` (parcelas de pagamento) + contrato de manutenção se solicitado. Sincroniza `projects.total_value` com a soma das parcelas |
| Contrato `mensal` criado/reconfigurado | Gera `min_months` parcelas `recorrencia` em `charges`; idempotente por `(contract_id, due_date)` via upsert; preserva pagas |
| Mudança de `project.status` | Grava `project_stage_events` |
| `charges` com método=Cartão marcada como paga | Materializa taxa de maquininha (`card_fee_rate`) como `accounts_payable` categoria `variavel`, vinculada por `source_charge_id` |
| Qualquer `charges` paga (quando `tax_rate > 0`) | Materializa imposto como `accounts_payable` categoria `imposto`, vinculada por `source_charge_id` |
| Check-in NCT registrado | Atualiza `progress`/`confidence` no `commitment` (espelho do último check-in) |
| Tarefa mensal de manutenção concluída (`status→'done'`) | Gera automaticamente a próxima ocorrência (status `todo`, vencimento no próximo `recurrence_day`) |
| "Contato dado" em manutenção | Registra `maintenance_interaction` + avança `next_contact_date` pelo `contact_frequency_days` (base = max(hoje, próximo) para robustez em atrasados) |

## RLS e acesso

Organização fechada de 2 sócios — padrão deliberado:
- RLS habilitado em TODAS as tabelas.
- Política única por tabela: `for all to authenticated using (true) with check (true)` + GRANT em authenticated.
- `anon` não acessa nada. Sem signup público (usuários criados no painel do Supabase).
- Os warnings `rls_policy_always_true` do advisor são esperados e aceitos.

## Migrations aplicadas (0001–0019)

Arquivos em `supabase/migrations/`. **Próxima livre: 0020.** Aplicar via MCP `supabase` → regenerar `lib/supabase/types.ts`.

| Migration | Conteúdo |
|---|---|
| 0001 | Enums + `profiles` + `companies` |
| 0002 | `deals` + `deal_stage_events` + `diagnostics` + `activities` |
| 0003 | `projects` + `project_stage_events` + `tasks` |
| 0004 | `contracts` + `charges` + `accounts_payable` |
| 0005 | NCT: `narratives` + `commitments` + `commitment_checkins` |
| 0006 | `strategy_blocks` + `org_settings` + seeds (5 blocos fixos + linha de settings) |
| 0007 | Índices + RLS `authenticated_all` em todas as tabelas |
| 0008 | `tasks.contract_id/recurrence/recurrence_day` + enum `task_recurrence` (tarefas de manutenção) |
| 0009 | `archived_at` em `companies`, `deals`, `contracts`, `tasks` (soft delete) |
| 0010 | `contracts.hourly_rate` + `charges.hours` (manutenção avulsa por hora) |
| 0011 | Recreate de enum `payable_category` → `fixo/variavel/imposto` (migration destrutiva) |
| 0012 | `accounts_payable.source_charge_id` FK→charges (para rastrear imposto/taxa originados de uma cobrança) |
| 0013 | Índice UNIQUE `(contract_id, due_date)` em `charges` passou de parcial para completo |
| 0014 | `org_settings.card_fee_rate` (taxa de maquininha global) |
| 0015 | Tabela `company_contacts` (múltiplos contatos por empresa); migra dado atual |
| 0016 | `projects.proposal jsonb` (estimativas pré-fechamento) |
| 0017 | Tabela `maintenance_interactions` (relatos de manutenção) |
| 0018 | Hardening: revoga `EXECUTE` de `rls_auto_enable` de PUBLIC/anon/authenticated |
| 0019 | `projects.completed_at` + `tasks.completed_at` (data real de conclusão; backfill de `updated_at`) |
