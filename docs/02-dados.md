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
| `payable_category` | `infra, freela, ferramentas, imposto, outro` |
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
| contact_name / contact_phone / contact_email | text | |
| origin | **text livre** | ex.: "veio pelo Roberto que conhece a Maria". SEM enum, SEM tabela de origens |
| owner_id | uuid fk→profiles set null | DRI |
| notes | text | |

**SEM coluna `status`** — o estado do contato é derivado (ver "Estado derivado" abaixo).

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
| due_date | date | |
| impact / effort | level_scale | priorização Impacto×Esforço |

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
| notes | text | |

Idempotência de recorrência: UNIQUE parcial `(contract_id, due_date)` where contract_id is not null.

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
| Qualquer mudança de `deal.stage` | grava `deal_stage_events` |
| Deal → `oportunidade` | EXIGE nome do projeto no modal → cria `projects` vinculado (company + deal). Sem projeto, a transição não acontece |
| Deal → além de `oportunidade` | validação: precisa ter projeto vinculado |
| Deal → `perdido` | exige `lost_reason` |
| Deal → `desqualificado` | só permitido a partir de `prospect` ou `lead` |
| Deal → `fechado` | exige `has_maintenance` (sim/não). Cria charge `setup` com `amount = deal.estimated_value` (editável depois), vencimento default +7 dias. Projeto passa a aparecer em Implementação. Se `has_maintenance = true` → redireciona para criar o contrato de manutenção |
| Contrato `mensal` criado/ativado | gera `min_months` parcelas `recorrencia` em charges, a partir de `start_date`, vencendo no `billing_day`. Idempotente por (contract_id, due_date) |
| Mudança de `project.status` | grava `project_stage_events` |
| Check-in registrado | atualiza `progress`/`confidence` do commitment |

## RLS e acesso

Organização fechada de 2 sócios — padrão deliberado:
- RLS habilitado em TODAS as tabelas.
- Política única por tabela: `for all to authenticated using (true) with check (true)` + GRANT em authenticated.
- `anon` não acessa nada. Sem signup público (usuários criados no painel do Supabase).
- Os warnings `rls_policy_always_true` do advisor são esperados e aceitos.

## Migrations

Numeradas `0001_…` em `supabase/migrations/`, aplicadas via MCP. Sugestão de corte: `0001` enums+profiles+companies · `0002` deals+events+diagnostics+activities · `0003` projects+events+tasks · `0004` contracts+charges+payables · `0005` NCT (narratives, commitments, checkins) · `0006` strategy_blocks+org_settings+seeds · `0007` índices (FKs, due_date, stage).
