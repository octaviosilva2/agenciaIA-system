# Ajustes do Octavio — Mapa de Execução (3 ondas)

> **Este é o documento-fonte de verdade desta tarefa.** Cada onda lê ESTE arquivo + `.work/STATUS.md`.
> Conforme cada item é concluído, marque `[x]` e anote os arquivos tocados. Se perder o contexto,
> releia este arquivo e retome do **primeiro item `[ ]`** da onda em andamento.

## Contexto técnico (vale para todas as ondas)
- Next.js 16 (App Router, Turbopack) + Tailwind v4 + shadcn/base-ui + Supabase. Projeto Supabase `czkcfhchsjtmmhtvethg` (MCP `supabase`).
- **RLS já aplicada — NÃO criar policy.** Próxima migration livre = **0014** (numere em sequência: 0014, 0015, …).
- Padrão obrigatório: `page = Server Component → lib/queries/* → client component`; mutação = `Server Action com zod → regra pura → Supabase → revalidatePath`.
- Após QUALQUER mudança de schema: **regenerar `lib/supabase/types.ts`** (MCP `generate_typescript_types`).
- Código em **inglês**; comentários e UI em **PT-BR**. Labels/cores de status SEMPRE de `lib/format.ts`. Cursor-pointer em clicáveis (regra global em `globals.css`).
- **Não inventar** label, cor, medida, raio — seguir `docs/06-design-system.md`. Não tocar no layout aprovado além do que o item pede.
- Fechar CADA onda: `npm run build` + `npm test` verdes → **commit** → atualizar este doc (`[x]`) e `.work/STATUS.md`.

## Decisões do Octavio (fechadas no GATE)
1. **Financeiro (anexo 24):** abas = **A Receber, A Pagar, Receita, Despesa** (sem "Todos"). **A Receber / A Pagar = pendentes (a vencer/atrasadas).** **Receita / Despesa = já realizado (status `pago`).** Sub-filtros: A Receber+Receita → `Todos · Implementação · Manutenção · Avulso`; A Pagar+Despesa → `Todos · Fixo · Variável · Imposto`.
2. **Concluída (anexo 3):** card na coluna **Concluída** ganha **risco visual (line-through no título)** como o Trello, **+** limite de **5 cards** + botão **"Ver todos"** abrindo modal com todos os concluídos. Vale nos 3 kanbans.
3. **Implementação (anexo 19):** o backend de tarefas da implementação **NÃO é mais do sócio** — fazer real nesta tarefa.
4. **Múltiplos contatos (anexo 5):** **criar tabela nova** `company_contacts` (todos os contatos da empresa). Migrar o contato atual (`contact_name/contact_phone`) para ela.
5. **Manutenção (anexo 21):** OK criar tabela de interações/relatos + "marcar contato dado" avança `next_contact_date` pela frequência.

## Protocolo de retomada (se perder contexto)
1. Ler este arquivo inteiro + `.work/STATUS.md`.
2. Identificar a onda atual (a do commit mais recente / primeiro item `[ ]`).
3. Continuar do primeiro `[ ]`. Não refazer itens `[x]`.
4. Reusar SEMPRE query/action/componente existente antes de criar novo.

---

# ONDA 1 — Quick wins (1 arquivo cada, sem migration)

- [x] **A1 (anexo 27)** Remover aba **CRM** das configurações. `components/config/config-layout.tsx`: remover `TabsTrigger value="crm"` e `TabsContent value="crm"` (+ import `CrmSection`). Manter o arquivo `crm-section.tsx` (só não plugado). → `components/config/config-layout.tsx` (import + trigger + content removidos; `crm-section.tsx` preservado).
- [x] **A2 (anexo 11)** Remover o campo **"Link do arquivo (proposta)"** do `components/opportunities/proposal-editor.tsx` (input `url`/`driveUrl` no modo edição **e** a linha "Arquivo" no modo leitura). Manter valor e notas. → `components/opportunities/proposal-editor.tsx` (input + linha "Arquivo" + estado `url` removidos; `driveUrl` da prop é preservado no save).
- [x] **A3 (anexo 4)** Compromisso recém-criado não pode contar como "sem check-in há +14 dias". Em `lib/queries/dashboard.ts > getNctSummary`: buscar `created_at` dos compromissos e considerar **stale só se** `created_at` tem +14 dias **E** (sem check-in OU último check-in +14 dias). (Hoje conta qualquer compromisso sem check-in como stale.) → `lib/queries/dashboard.ts` (query extra `commitments(id, created_at)` + filtro de idade).
- [x] **A4 (anexo 13)** Busca + toggle **Ativos/Arquivados** só na visão **Lista**. Em `contacts-view.tsx` e `projects-view.tsx`: renderizar a barra de busca e o toggle Ativos/Arquivados apenas quando `view === 'lista'` (no kanban, esconder). Manter PeriodFilter e o select de estágio. → `components/contacts/contacts-view.tsx` + `components/projects/projects-view.tsx` (busca e toggle Ativos/Arquivados gated por `view==='lista'`; `ml-auto` no toggle Lista/Kanban).
- [x] **A5 (anexos 7 + 12)** Nome do card clicável abre o ID, no kanban de **contatos** e de **projetos**. Em `components/contacts/deal-card.tsx`: tornar o nome (`deal.company`) um clique → `router.push('/contatos/'+companyId)` com `stopPropagation` (não conflitar com o drag — PointerSensor já tem `distance:6`). Projetos: o `opportunity-card.tsx` já tem `onOpen`; garantir que o board passa `onOpen` que navega para `/projetos/[dealId]`. → `components/contacts/deal-card.tsx` (nome clicável c/ stopPropagation) + `components/opportunities/opportunity-card.tsx` (forward `onOpen` no Draggable) + `components/opportunities/opportunities-kanban.tsx` (passa `onOpen` nas colunas ativas).
- [x] **A6 (anexo 10)** Filtro de estágio funcionar no **kanban** de contatos. Em `contacts-view.tsx`: passar o `stage` selecionado para `<ContactsKanban>` e filtrar os deals exibidos por estágio (hoje o kanban ignora o filtro). → `components/contacts/contacts-view.tsx` (passa `stageFilter`) + `components/contacts/contacts-kanban.tsx` (prop `stageFilter` filtra `visibleDeals`; drag opera no conjunto completo).
- [x] **A7 (anexo 14)** Tela do projeto (`/projetos/[id]`): kebab `ProjectHeaderActions` deve ter só **Editar, Arquivar, Excluir** — sem desfechos de funil. (As ações de estágio/fechar/perder/reativar ficam no bloco `OpportunityActions`, reformulado na Onda 3.) Verificar `components/entity-actions-menu.tsx` e garantir item "Editar" (abre edição do nome/proposta na própria tela). → `components/projects/project-header-actions.tsx` (item "Editar" abre dialog de renomear) + `lib/actions/project.ts` (nova action `renameProject`) + `app/(dashboard)/projetos/[id]/page.tsx` (passa `projectId`). Kebab já não tinha desfechos de funil.
- [x] **A8 (anexo 8)** Diagnóstico = **um único campo de texto**. `components/contacts/diagnostic-form.tsx`: um `textarea` só. Gravar na coluna **`diagnostics.notes`** (já existe) em `lib/actions/contact-profile.ts > createDiagnostic`. Exibição: `app/(dashboard)/contatos/[id]/page.tsx` mostra `d.notes` (fallback p/ campos antigos `context/...` se existirem). Não criar migration. → `components/contacts/diagnostic-form.tsx` (1 textarea `notes`) + `lib/actions/contact-profile.ts` (`createDiagnostic` grava só `notes`) + `app/(dashboard)/contatos/[id]/page.tsx` (exibe `d.notes` c/ fallback).
- [x] **A9 (anexo 9)** Interações **e** diagnósticos como **cards limpos** (padrão do escopo) com **quebra de palavra** (`break-words` / `overflow-wrap-anywhere`) — hoje string longa sem espaço estoura. `app/(dashboard)/contatos/[id]/page.tsx` (seções "Interações" e "Diagnósticos"). → `app/(dashboard)/contatos/[id]/page.tsx` (ambas as seções viraram cards com `break-words [overflow-wrap:anywhere]`).
- [x] **A10 (anexo 15)** Escopo sumindo: `components/opportunities/scope-editor.tsx` passa a **auto-salvar** a cada mudança (add/avançar/remover) chamando `updateScopeItems`, como já faz `implementation-detail.tsx`. Pode manter o botão "Salvar escopo" como reforço, mas não depender dele. (Verificado: `projects.scope_items` está `[]` no banco porque hoje só grava no clique do botão.) → `components/opportunities/scope-editor.tsx` (helper `persist` + `router.refresh`; botão "Salvar escopo" mantido como reforço).
- [x] **A11 (anexo 20)** Manutenção: na tela do projeto (`MaintenanceEditor`, contrato mensal) e onde lista parcelas recorrentes, mostrar **só as próximas 2** parcelas pendentes + botão **"Ver mais"** que expande a lista completa. → `components/projects/maintenance-editor.tsx` (leitura mensal: `visibleCharges` = 2 próximas pendentes; "Ver mais (N)"/"Ver menos").

**Fechar Onda 1:** ✅ build + 59 testes verdes → commit `feat(ajustes): onda 1 — quick wins` → marcado `[x]` aqui + nota no STATUS.

---

# ONDA 2 — Médios (2–4 arquivos; 1 migration)

- [ ] **B1 (anexos 1 + 2)** Padronizar o dialog de tarefa. `components/tasks/task-board-dialog.tsx` e `components/nct/linked-task-dialog.tsx` devem ter **exatamente** estes campos (Título obrigatório, resto opcional): **Título · Descrição · Coluna · Prioridade · Responsável · Impacto · Esforço · Compromisso · Prazo**. **Remover "Área" e "Projeto".** Como o campo Área some: remover também o **filtro de Área** no `tasks-board.tsx` (manter filtro de Projeto/Compromisso/Pessoa/Prioridade). `task_area` continua no banco; ao criar, gravar um default (ex.: `gestao`) sem expor na UI.
- [ ] **B2 (anexos 3 + 22-parte)** Coluna **"Concluída"** nos 3 kanbans: (a) título do card com **`line-through`** (risco estilo Trello); (b) exibir no máx. **5** cards; (c) botão **"Ver todos (N)"** abrindo **modal** com a lista completa de concluídos. Criar **1 helper/componente compartilhado** (ex.: `components/tasks/done-column-overflow.tsx`) e usar em: `tasks-board.tsx`, `tasks-kanban.tsx` e o `TaskKanban` interno de `commitment-detail-view.tsx`.
- [ ] **B3 (anexo 6)** Kanban de **contatos** (`contacts-kanban.tsx`): (a) menu `⋯` do card = só **Editar/Arquivar/Excluir** (remover as 3 ações de funil do `extraItems`); (b) tornar as colunas **Desqualificado** e **Reativar futuramente** **arrastáveis** (droppable) — arrastar um card para elas chama `disqualifyDeal`/`reactivateDeal`; (c) **remover** a coluna/possibilidade **Perdido** do kanban (perder fica em Projetos). Ajustar `validateStageTransition`/`canDisqualify` se bloquear o arrasto para desqualificar (hoje só permite de prospect/lead — confirmar com Octavio se quiser liberar de qualquer coluna; por ora respeitar a regra e dar toast).
- [ ] **B4 (ajustes sem anexo 1 + 2)** **Datas em horário de Brasília + filtros temporais corretos.**
  - `lib/format.ts`: `formatDateTime` (e timestamps) com `timeZone: 'America/Sao_Paulo'`. Cuidar para datas `yyyy-MM-dd` (date-only) NÃO deslocarem dia.
  - Criar **helper único** de período (ex.: `lib/date-range.ts`) com "hoje / semana / mês" em Brasília e **unificar** as 3 implementações hoje divergentes: `period-filter.tsx > usePeriodDates`, `financeiro-view.tsx > getKpiRange`, `dashboard.ts`.
  - **Semana = segunda 00:00 → domingo 23:59** (hoje `usePeriodDates` começa no domingo — bug). Hoje = dia inteiro. Mês = mês selecionado inteiro.
- [ ] **B5 (anexo 23)** Taxa de maquininha só desconta **ao confirmar pago** (igual imposto). **Migration 0014:** `org_settings.card_fee_rate numeric default 0`. No `/config` aba Financeiro (`financial-section.tsx`), adicionar o campo. Em `lib/actions/finance.ts > toggleChargePaid`: ao marcar charge **paga com `method='cartao'`**, materializar `accounts_payable` categoria `variavel` (`source_charge_id`), e remover ao reverter — espelhando o bloco de imposto. **Remover** o lançamento antecipado da taxa em `lib/actions/project.ts > setProjectPayment` (e o input de taxa no `payment-editor.tsx` vira informativo ou sai). Regenerar types.
- [ ] **B6 (anexo 24)** Financeiro / Contas (`components/finance/accounts-view.tsx`): abas = **A Receber · A Pagar · Receita · Despesa** (remover "Todos"). **A Receber/A Pagar** = `status === 'pendente'` (inclui vencidas). **Receita/Despesa** = `status === 'pago'`. Sub-filtros: A Receber+Receita → `Todos · Implementação(setup) · Manutenção(recorrencia) · Avulso(avulso)`; A Pagar+Despesa → `Todos · Fixo · Variável · Imposto`. Ajustar o filtro de baixa conforme a aba (em Receita/Despesa some, pois já é pago).
- [ ] **B7 (anexo 25)** Imposto identifica a origem. Em `toggleChargePaid` (finance.ts): incluir na descrição do imposto o **projeto/origem** da cobrança (ex.: `Imposto (13%) — Setup CRM com Disparos · Moda em Foco`). Buscar o nome do projeto/contrato junto da charge.
- [ ] **B8 (anexo 26)** Previsão de **lucro** já líquida. `components/finance/financeiro-view.tsx > computeProfitBars` (e o modo Despesa): no **futuro/pendente**, descontar **imposto estimado** (`org_settings.tax_rate` via `calculateNetRevenue`) **+ taxa de maquininha estimada** (`card_fee_rate` sobre charges no cartão). A despesa projetada deve refletir esses valores estimados mesmo antes de materializados.

**Fechar Onda 2:** regenerar types (migration 0014) → build + test → commit `feat(ajustes): onda 2 — tarefas, datas, financeiro` → marcar `[x]` + STATUS.

---

# ONDA 3 — Reformulação (pesada; migrations; pode ser sessão dedicada)

> Onda mais cara e interligada. Implementar na ordem abaixo (cada bloco fecha com build verde antes do próximo). Migrations em sequência a partir da próxima livre.

- [ ] **C1 (anexo 5)** Múltiplos contatos por empresa. **Migration:** tabela `company_contacts (id uuid pk, company_id uuid fk→companies on delete cascade, name text not null, phone text, position int default 0, created_at)`. RLS `authenticated_all` (seguir padrão das outras tabelas). **Migrar** `companies.contact_name/contact_phone` existentes para 1 linha. UI: `new-contact-dialog.tsx` e `edit-contact-dialog.tsx` com **lista dinâmica** de contatos (nome+telefone) com botão **"+"**, **limite de 3** (anexo original). Actions (`contatos/actions.ts`, `lib/actions/contacts.ts`) gravam/atualizam a tabela. `contact-profile.ts` e `contacts.ts` (queries) passam a trazer a lista; o perfil (`contatos/[id]/page.tsx`) lista todos. `contact_email` segue em `companies`. Regenerar types.
- [ ] **C2 (anexo 16)** Proposta como área de organização. **Migration:** `projects.proposal jsonb default '{}'` com campos: `setup_estimate` (number), `maintenance_min`/`maintenance_max` (number, faixa mensal), `hourly_estimate` (number, avulso), `delivery_estimate` (text), `notes` (text). `proposal-editor.tsx`: editar esses campos (além do valor). Query `opportunity-detail.ts` traz `proposal`. Regenerar types. (Não confundir com o pagamento real, que só existe após fechar.)
- [ ] **C3 (anexos 17 + 18)** **Fechar negócio = formulário completo + sincronização.**
  - Substituir o modal simples (com/sem manutenção) em `components/opportunities/opportunity-actions.tsx` por um **dialog/wizard** que coleta: **implementação** (valor, à vista/parcelado, nº parcelas, 1º vencimento, método) e **manutenção** (nenhuma / mensal: valor·duração·dia·início / hora avulsa: preço-hora).
  - Action orquestradora nova em `lib/actions/deals.ts` (ex.: `closeDealWithSetup`) que: marca `fechado`, e reusa `setProjectPayment` + (`setMaintenanceContract`|`setAvulsoContract`). **Não** criar a charge setup automática genérica quando o wizard já define o pagamento.
  - Pós-fechamento: **pagamento já populado** (vem do wizard); **valor no topo direito sincronizado** — ajustar `getOpportunityDetail` para `headerValue` usar a **soma das cobranças de pagamento** (existe lógica `paymentSum` em `lib/queries/deals.ts`/`projects-board.ts`, reusar); **escopo já sincronizado** (é o mesmo `projects.scope_items`).
- [ ] **C4 (anexo 18-parte)** Cards na tela do projeto fechado (`projetos/[id]/page.tsx`):
  - **Implementação:** prazo de entrega no canto superior (ao lado do título do card) + **card destacado de "tempo restante"** (`deliveryCountdown`) + **botão maior** "Abrir tela de implementação".
  - **Manutenção:** mostrar só os **detalhes** do contrato + **botão** "Abrir tela de manutenção" + permitir **configurar/reconfigurar o preço** (já vem sincronizado do fechamento). Enxugar o que duplica com a tela de manutenção.
- [ ] **C5 (anexo 19)** **Implementação real.** Criar query `lib/queries/implementation-detail.ts > getImplementationDetail(projectId)` trazendo tarefas reais (`tasks` com `project_id`, status/priority/etc.), escopo, status, prazo. Criar actions de CRUD de tarefas de implementação (ex.: `lib/actions/tasks-impl.ts`: `createImplementationTask`/`update`/`move`/`delete`, `project_id` setado, `area='operacional'`). `app/(dashboard)/implementacao/[id]/page.tsx`: **remover `mockTasks`**, carregar reais e passar `handlers` ao `TasksKanban`. `implementation-detail.tsx`: **card grande de tempo restante**; escopo já é real (`getProjectScope`). Aplicar também o "Concluída máx. 5 + ver todos + line-through" (B2).
- [ ] **C6 (anexos 21 + 22-parte)** **Manutenção — relacionamento com o cliente.**
  - **Migration:** tabela `maintenance_interactions (id, contract_id fk→contracts cascade, content text, created_at, created_by uuid→profiles)`. RLS padrão. Regenerar types.
  - `maintenance-detail.tsx`: seção **"Relatos/Interações"** (form + lista, padrão das activities, com `break-words`). Action de criar interação.
  - **Contador de próximo contato** + botão **"Contato dado"**: ao clicar, registra a interação e avança `contracts.next_contact_date += contact_frequency_days` (action em `lib/actions/project.ts` ou `contracts.ts`).
  - **Fila de contatos:** no board `/manutencao` (`maintenance-list.tsx`/query `projects-board.ts`), ordenar por `next_contact_date` e destacar os **atrasados** (próximos a contatar primeiro).
  - **Layout (anexo 22):** como as parcelas recolheram (Onda 1 A11), dar **mais espaço** ao kanban de tarefas de manutenção; aplicar "Concluída máx. 5 + ver todos + line-through" (B2).

**Fechar Onda 3:** regenerar types (todas as migrations) → build + test → commit `feat(ajustes): onda 3 — projeto/fechamento/implementação/manutenção` → marcar `[x]` + STATUS.

---

## Mapa de migrations desta tarefa
| # | Onda | Conteúdo |
|---|---|---|
| 0014 | 2 | `org_settings.card_fee_rate` (taxa maquininha global) |
| 0015 | 3 | tabela `company_contacts` |
| 0016 | 3 | `projects.proposal jsonb` |
| 0017 | 3 | tabela `maintenance_interactions` |

> Confirme a próxima migration livre real antes de aplicar; numere em sequência.

## Itens fora de escopo / cortados
- Filtro de **Área** no board de Tarefas: removido junto com o campo Área (B1).
- Validação final / varredura de bugs / `get_advisors`: é a **outra sessão** (PROMPT 2), não fazer aqui.
