# Plano — Backend final (Fases 4–6) + validação

> **Substitui** `docs/PROMPT-PROXIMA-SESSAO.md` (desatualizado: dizia 16 rotas e `/config` mock).
> Front-end 100% pronto e aprovado. Falta **só ligar dados** das telas mock ao Supabase,
> **sem tocar no layout**. Banco já existe (projeto `czkcfhchsjtmmhtvethg`, MCP `supabase`).

---

## 1. Estado real (verificado nesta sessão)

| Área | Estado | O que falta |
|---|---|---|
| Comercial (Contatos, Projetos, Funil, tela do projeto) | ✅ **REAL** | nada |
| Operacional / Manutenção + tarefas | ✅ **REAL** | nada (`/implementacao/[id]` é do sócio dev) |
| Arquivar / Excluir transversal | ✅ **REAL** | nada |
| **`/config`** (Perfil, Equipe, Financeiro, CRM, Aparência, Segurança) | ✅ **REAL** | nada — `getOrgSettings`/`getProfiles`/`updateOrgSettings` já existem |
| **Financeiro** (`/financeiro`, `/financeiro/contas`) | 🟡 MOCK | queries + actions |
| **Estratégia** (`/estrategia`) | 🟡 MOCK | seed + queries + action (só UPDATE) |
| **NCT** (`/nct`, `/nct/[id]`) | 🟡 MOCK | queries + actions (CRUD + check-in) |
| **Tarefas** board global (`/tarefas`) | 🟡 MOCK | queries + actions |
| **Dashboard** (`/`) | 🟡 MOCK | queries de resumo (agrega tudo acima) |

**Pronto para reuso (não recriar):** `lib/validations/{finance,nct,config}.ts`, `lib/rules/{net-revenue,recurrence,task-recurrence,funnel-metrics}.ts`, `lib/queries/config.ts` (`getOrgSettings`, `getProfiles`).

---

## 2. Princípios de eficiência de token (seguir SEMPRE)

A execução é barata porque o trabalho de descoberta **já foi feito**. Cada sessão deve:

1. **Não reler os 9 docs.** O contrato de cada tela são os **tipos dos mocks** (`lib/mock/*`) — snake_case = schema. Ler **só o mock da fase** + o arquivo-modelo indicado.
2. **Mover, não reescrever.** Os `type` exportados pelos mocks (`Charge`, `Commitment`, `ManagedTask`…) vão para o arquivo de query real com **o mesmo nome**. Nos componentes, troca-se **uma linha de import** (`@/lib/mock/x` → `@/lib/queries/x`). Layout intocado.
3. **Copiar padrão existente.** Já há queries/actions reais testadas. Para cada fase aponto o **arquivo-modelo** — copiar a estrutura, não inventar.
4. **Execução direta, sem subagentes.** Spawnar agente re-deriva contexto e custa mais. Rodar inline. (Subagente só se uma fase virar grande demais e paralelizável — não é o caso aqui.)
5. **Uma fase = uma sessão = um commit.** Fechar com `npm run build` + `npm test` verdes antes da próxima. Não acumular contexto entre fases.
6. **Ordem por reuso:** Dashboard por **último** — ele agrega as queries das fases anteriores (`getFinanceOverview`, `getNctSummary`…) em vez de reimplementar somas.

**Padrão de dados (obrigatório):** página = Server Component → `lib/queries/*` → componente client; mutação = Server Action (`lib/actions/*`) com **zod → regra (`lib/rules/*`) → Supabase server client → `revalidatePath`**. Após qualquer mudança de schema: **regenerar `lib/supabase/types.ts`** via MCP `supabase`.

**RLS já aplicada (migration 0007):** policy `authenticated_all` (`FOR ALL`, `USING`/`WITH CHECK` true) em **todas** as tabelas das 5 áreas (`charges`, `accounts_payable`, `narratives`, `commitments`, `commitment_checkins`, `strategy_blocks`, `tasks`, `org_settings`, `profiles`). **Não criar nem duplicar policy** nas Fases 4–6.

**Idempotência:** o índice único `(contract_id, due_date)` cobre **só** `charges` de `recorrencia`. Avulsos/setups têm `contract_id = null` e **não** são idempotentes — `createCharge` avulso sempre insere.

---

## 3. Sessões (ordem de execução)

### Sessão 1 — Financeiro
**Ler:** `lib/mock/finance.ts` · modelo de query `lib/queries/opportunity-detail.ts` · modelo de action `lib/actions/project.ts` (já lê/grava `charges`).
**Migration `0011` (decisão §4.1):** alinhar o enum `payable_category` do banco aos valores da UI (`fixo | variavel | imposto`) — recreate de enum **destrutivo**, seguir a skill `migrations-seguras` (em fases), depois regenerar `lib/supabase/types.ts`. O banco hoje tem `infra/freela/ferramentas/imposto/outro` (descartados). O `accountPayableSchema` (`validations/finance.ts:58`) **já está correto** para os novos valores — não mexer.
**Criar:**
- `lib/queries/finance.ts` — move os tipos `Charge`/`AccountPayable`/`AccountRow`. `getAccounts({ tipo, from, to })`: faz **dois selects** (charges com join `projects.name`/`contracts.name`; accounts_payable com join `projects.name`), deriva `origin_label` e monta o `AccountRow[]` (união discriminada `{ type: 'receber' | 'pagar', data }`) **no servidor**. Definir o filtro de `cancelado` — o mock exibe avulso cancelado (`a-3`) na aba "Todos", então **retornar tudo e filtrar na view**, não na query. `getFinanceOverview({ from, to })`: 6 cards (bruta, impostos, líquida via `calculateNetRevenue(gross, getOrgSettings().tax_rate)`, a receber, a pagar, saldo).
- `lib/actions/finance.ts` — `toggleChargePaid`/`togglePayablePaid` (grava `status`+`paid_at`); `createCharge` (kind `avulso`, **não idempotente**); `createPayable`; `updateAccount`/`deleteAccount` (manual: avulso/payable). Zod de `lib/validations/finance.ts` (enum já ajustado). Todas revalidam **`/financeiro` e `/financeiro/contas`**.
**Religar (sem mexer no JSX):** `app/(dashboard)/financeiro/page.tsx`, `app/(dashboard)/financeiro/contas/page.tsx`, `components/finance/{accounts-view,new-account-dialog,edit-account-dialog,financeiro-view}.tsx`.
**Migration:** `0011` — recreate do enum `payable_category` para `fixo/variavel/imposto` (destrutivo; skill `migrations-seguras`, em fases) + regenerar `lib/supabase/types.ts`.
**Gate:** fechar 1 negócio com manutenção → cobranças `setup`+`recorrencia` aparecem em `/financeiro/contas` com **origem + link**; **líquida reflete a alíquota** do `/config`; marcar pago atualiza cards e lista.

---

### Sessão 2 — Estratégia + Profiles (curta)
**Profiles (destrava NCT e Tarefas):**
- Reusar `getProfiles` de `lib/queries/config.ts`. Mover `initialsOf` de `lib/mock/profiles.ts` para `lib/format.ts` (helper de exibição).
- ⚠️ **NÃO é "troca de 1 import":** hoje os componentes client (`components/nct/*`, `components/tasks/*`) importam `findProfile`/`initialsOf` de `lib/mock/profiles` e fazem busca num **array global**. Vira **refactor de props** — o Server Component carrega `getProfiles()` e passa a lista por prop; `findProfile` deixa de ser busca global e passa a operar sobre a lista recebida.
- **Decisão §4.3: equipe = só sócios que logam.** Selects de DRI/assignee listam `getProfiles()` (quem já logou); **sem** membros sem login, **sem migration**. Os 4 UUIDs do mock são descartados (telas nascem vazias, §4.5).

**Estratégia:**
- **Ler:** `lib/mock/strategy.ts` (contrato do `content` jsonb por kind).
- **Seed JÁ existe** (migration 0006 insere as 5 kinds com o shape do mock). **Não criar migration/seed nova** — só confirmar via `select` que as 5 linhas existem e seguir para query/action.
- Criar `lib/queries/strategy.ts` (`getStrategyBlocks` — move tipos + `STRATEGY_BLOCK_META`) e `lib/actions/strategy.ts` (`updateStrategyBlock` — **só UPDATE** do `content` por kind; validar o shape por kind com zod). Revalida **`/estrategia`**.
- **Religar:** `app/(dashboard)/estrategia/page.tsx`, `components/strategy/{strategy-view,strategy-block-dialog}.tsx`.
**Migration:** nenhuma.
**Gate:** editar SWOT/Missão/Blueprint persiste; reload mantém; não dá para criar/excluir bloco.

---

### Sessão 3 — NCT + Tarefas (a maior)
**Pré-requisito:** Sessão 2 feita — assignee/DRI listam quem logou via `getProfiles()` (decisão §4.3). Dados de exemplo NÃO entram (telas vazias, §4.5).
**Ler:** `lib/mock/nct.ts` + `lib/mock/tasks.ts`. Modelo: `lib/actions/tasks.ts` (CRUD de `tasks`) e `lib/queries/maintenance-detail.ts`.
**NCT:**
- `lib/queries/nct.ts` — `getNarrativesWithCommitments()` (lista) e `getCommitmentDetail(id)` (com `commitment_checkins`). Move tipos `Narrative`/`Commitment`/`Checkin`.
- `lib/actions/nct.ts` — CRUD narrativa, CRUD compromisso, `createCheckin`. **`createCheckin` faz DUAS escritas na mesma action:** insere em `commitment_checkins` **e** dá `update` em `commitments` setando `progress`/`confidence` com os valores do check-in recém-criado (o último check-in é a fonte de verdade do card). Revalida **`/nct` e `/nct/[commitmentId]`** (a lista mostra o % atualizado). Zod de `lib/validations/nct.ts`.
**Tarefas board global:**
- `lib/queries/tasks.ts` — `getManagedTasks(filtros: projeto/compromisso/área/pessoa/prioridade)`. Move tipo `ManagedTask` + `PROJECT_LABELS` (via join `projects.name`).
- `lib/actions/tasks-board.ts` — CRUD + `moveTask` (muda `status`). **Arquivo separado de `lib/actions/tasks.ts`** (este é 100% manutenção: exige `contractId`, fixa `area='operacional'`, revalida `/manutencao`). Nomes distintos. Revalida **`/tarefas`**.
**Religar:** `app/(dashboard)/{nct/page,nct/[commitmentId]/page,tarefas/page}.tsx` e `components/nct/*` + `components/tasks/{tasks-board,task-board-dialog}.tsx`.
**Migration:** nenhuma (tabelas e FK `fk_tasks_commitment` existem).
**Gate:** criar narrativa→compromisso→check-in (% e confiança do card atualizam **na lista e no detalhe**); board de tarefas move/cria/filtra e persiste; tarefas vinculadas aparecem no detalhe do compromisso.

---

### Sessão 4 — Dashboard (agrega tudo)
**Ler:** `lib/mock/dashboard.ts` + `components/dashboard/{dashboard-view,growth-chart}.tsx`.
**Criar:** `lib/queries/dashboard.ts` — um resumo por bloco. **Arquitetura de degradação (concreta):** cada bloco é um Server Component `async` próprio dentro de `<Suspense fallback={skeleton}>`; a query do bloco usa `try/catch` e retorna um **estado de erro local** (card "não foi possível carregar") em vez de lançar. Bloco que falha não derruba os outros.
- Financeiro: reusa `getFinanceOverview`.
- Comercial (`CommercialSummary`) + Implementação (`ImplementationSummary`): agrega `deals`/`projects`.
- NCT: resumo de `commitments`. Tarefas de hoje: `tasks` com `due_date = hoje`.
- `getGrowthData()` — série mensal (Jan–mês atual) conforme decisão §4.4 (receita = `charges` pagas no mês; clientes ativos = `companies` com contrato ativo).
**Religar:** `app/(dashboard)/page.tsx`, `dashboard-view.tsx`, `growth-chart.tsx`.
**Migration:** nenhuma. Revalida **`/`**.
**Gate:** dashboard mostra números reais coerentes com as outras telas; bloco com erro degrada sozinho.

---

### Sessão 5 — Validação final + entrega
1. `npm run build` (limpo) + `npm test` (verde).
2. **`get_advisors`** (security + performance) via MCP `supabase` — tratar o que não for `always_true` esperado.
3. Remover `lib/mock/*` que ficou órfão.
4. Smoke test E2E manual: fechar negócio→cobrança→pagar→dashboard; criar compromisso→check-in; mover tarefa.
5. `git add` + commit `feat(fase-4-6): backend financeiro, gestão e dashboard` + atualizar `.work/STATUS.md`.

---

## 4. Decisões (Octavio, 2026-06-19) — ✅ = tomada · ⚪ = default a confirmar

1. **✅ Enum `payable_category` → ALINHAR O BANCO À UI** (`fixo | variavel | imposto`). Migration `0011` (recreate de enum, **destrutiva** — skill `migrations-seguras`, em fases) + regenerar types. O `accountPayableSchema` (`validations/finance.ts:58`) **já está correto** para esses valores — não mexer. Os valores antigos do banco (`infra/freela/ferramentas/imposto/outro`) são descartados. *(destrava Sessão 1)*
2. **⚪ Excluir conta financeira** — default: `DELETE` para manual/avulso e `status=cancelado` para o resto (sem soft delete; `charges`/`accounts_payable` não têm `archived_at`).
3. **✅ Equipe / profiles → SÓ SÓCIOS QUE LOGAM.** Equipe = quem tem conta; **sem** membros sem login, **sem migration**. Selects de DRI/assignee em NCT e Tarefas listam `getProfiles()` (quem já logou). *(destrava Sessão 3)*
4. **⚪ Growth chart** — default: receita mensal = soma de `charges` **pagas** no mês; clientes ativos = `companies` com contrato ativo no mês.
5. **✅ Dados de exemplo → TELAS NASCEM VAZIAS.** Descartar o conteúdo mock ao religar; usuário cria o real. Exceção: os 5 `strategy_blocks` já semeados (0006). Sem UUID fantasma → sem risco de FK. *(define o gate "reload mantém")*

---

## 5. Prompt de abertura

O prompt **cola-e-roda** vive em **`docs/PROMPT.md`** (fonte única — é o que você copia para o chat novo). Hoje aponta para a **Sessão 1 — Financeiro**.

Ao iniciar a próxima sessão, edite `docs/PROMPT.md`: troque o nome da Sessão, o `lib/mock/*` e o arquivo-modelo conforme o bloco correspondente da §3.
