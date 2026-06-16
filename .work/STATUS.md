# Status do Projeto

## Fase atual: Fase 2 (Comercial) — COMPLETA. Próximo: Fase 3 (Operacional) — tela `/implementacao/[id]`.

Stack: Next.js 16 (App Router, Turbopack) + Tailwind v4 + shadcn/base-ui + Supabase. UI-first com mini-gates. Banco real, limpo (só "Moda em Foco (TESTE)").

---

## O que existe e funciona

### Fundação (Fases 0–1) — NÃO refazer
- Auth Supabase completa (`lib/supabase/`, middleware), `/login`, layout do dashboard com sidebar (`components/app-sidebar.tsx`, `NAV_GROUPS`).
- Banco: migrations 0001–0007 (17 tabelas, enums, CHECKs, RLS `authenticated_all`, seeds, índices). Types em `lib/supabase/types.ts`.
- Regras puras testadas em `lib/rules/` (`deal-stage`, `contact-status`, `recurrence`, `net-revenue`) — 13 testes verdes.
- Design system aprovado: `docs/06-design-system.md` + `frontend-teste/style-guide.html` (verdade visual). Labels/cores só de `lib/format.ts`. Cursor-pointer global em clicáveis.

### Comercial (Fase 2)
- **Contatos** (`/contatos`): lista + kanban (dnd-kit). Pré-venda: Prospect → Lead → Diagnóstico → Oportunidade + Desqualificado. Criar contato abre deal em Prospect. Filtro de estágio = só pré-venda (prospect, lead, diagnostico, oportunidade, desqualificado). **Sem coluna "Estado"** (removida); a lista mostra só o **Estágio**.
- **Perfil do contato** (`/contatos/[id]`): Dados · Projetos · Diagnósticos · Interações. Header mostra o **estágio do deal mais recente** (não mais o estado derivado). `lib/rules/contact-status` segue existindo, só não aparece na UI.
- **Projetos** (`/projetos`): funil comercial COMPLETO — kanban/lista com Oportunidade → Negociação + terminais (Fechado/Perdido/Reativar). Os fechados continuam aparecendo aqui (continuidade comercial); cards terminais são clicáveis → tela do projeto. Filtro de estágio = funil comercial. "+ Novo projeto" cria deal(oportunidade)+projeto. Ver memória [[projetos-vs-implementacao]].
- **Tela do projeto** (`/projetos/[id]`): detalhe comercial.
  - Header: projeto, badge de estágio, cliente (link), valor, DRI, e `OpportunityActions` (controle de estágio + desfechos Fechar/Perder/Reativar).
  - **Em venda:** Proposta (editável: valor/link/notas via `updateProposal`) + Escopo (`ScopeEditor`).
  - **Fechado:** Pagamento + Escopo (principal) · Implementação + Manutenção (lateral).
  - **Pagamento** (`PaymentEditor` + `setProjectPayment`): à vista ou parcelado; parcelas com valor (divisão igual, editável) + data + método → vira cobrança (`charges` kind `setup`). Reconfigurável.
  - **Implementação:** resumo (% das `custom_stages`) + **prazo de entrega** editável + **marcar como entregue / reabrir** (`DeliveryControls` → `updateProjectDueDate`/`updateProjectStatus`, grava `project_stage_events`). Atraso em vermelho. Entregue mostra "Projeto entregue".
  - **Manutenção** (`MaintenanceEditor` + `setMaintenanceContract`): cria/reconfigura o contrato mensal (valor mensal, duração `min_months`, dia `billing_day` 1–28, início) e **gera as parcelas recorrentes** (`charges` kind `recorrencia`) — idempotente por `(contract_id, due_date)` via upsert; substitui pendentes e preserva pagas. Espelha o `PaymentEditor`: resumo + parcelas listadas + prévia ao vivo na edição. Usa a regra pura `lib/rules/recurrence`.
  - **Removidos** desta tela: Prazos (vão na Implementação) e Negociação (interações ficam no perfil do contato).
- **Valor nos boards:** Projetos e Implementação exibem `total_value` (proposta) → `estimated_value` → **soma das cobranças de pagamento** (`charges` setup/avulso não canceladas). Cobre projeto pago via parcelas sem proposta preenchida. Lógica `paymentSum` em `lib/queries/deals.ts` e `projects-board.ts`.
- **Contador de prazo:** `deliveryCountdown`/`daysUntil` em `lib/format.ts` ("Faltam X dias" / "Vence hoje" / "Atrasado há X dias") no `DeliveryControls` e nos boards/tabela de Implementação.
- **Operacional como recorte:** `/implementacao` e `/manutencao` renderizam a `ProjectsView` por fase (read-only). Implementação = deals fechados por `project_status`; o card abre `/implementacao/[projectId]` (tela operacional — ainda placeholder). Manutenção = contratos ativos.
- **Funil** (`/funil`): relatórios sobre `deal_stage_events` com filtro temporal (`PeriodFilter`). KPIs (pipeline atual, receita ganha, conversão, tempo médio de ciclo), funil por estágio (barras + conversão entre etapas), win rate. Regra pura `lib/rules/funnel-metrics` (4 testes) + query `lib/queries/funnel.ts`. Server Component lê o período via `searchParams`.
- **Sem DRI/responsável:** decisão do Octavio — "todos somos responsáveis". Removido de TODA a UI (header do projeto, perfil do contato, colunas/cards dos boards, select de Responsável no cadastro). Colunas `owner_id` seguem no banco (sem migration); query `lib/queries/profiles.ts` removida.
- **Backend comercial:** `lib/queries/deals.ts` (board), `lib/queries/projects-board.ts` (implementação + manutenção), `lib/queries/opportunity-detail.ts` (tela do projeto, com charges), `lib/queries/contacts.ts`, `lib/queries/contact-profile.ts`, `lib/queries/companies.ts`, `lib/queries/funnel.ts`. Actions: `lib/actions/deals.ts`, `lib/actions/project.ts` (proposta, pagamento, prazo, status, **manutenção**), `lib/actions/contact-profile.ts`. Reflexo entre telas via `revalidatePath('/contatos' + '/projetos' + '/implementacao')`.

---

## Pendências / débito técnico
- ~~Órfãos a remover~~ ✅ removidos: `opportunities-view.tsx`, `new-deal-dialog.tsx`, action `createDeal`, `maintenance-block.tsx` e `lib/queries/profiles.ts`.
- ~~Manutenção (entradas/parcelas)~~ ✅ feito: `MaintenanceEditor` cria o contrato e gera as recorrências linkadas.
- ~~DRI/responsável~~ ✅ removido da UI por decisão do Octavio (todos são responsáveis). Colunas `owner_id` ficam no banco (sem uso pela UI).
- ~~/funil~~ ✅ construído.
- **Tela de Implementação** (`/implementacao/[id]`): ✅ **UI front entregue (MOCK, sem backend)** — kanban de tarefas (`task_status`) com CRUD + drag, escopo contratado×entregue, etapas internas (editor), histórico de fases, marcar entregue/reabrir. Tudo em estado local com toast; **nada persiste**. Componentes: `components/tasks/tasks-kanban.tsx`, `components/tasks/task-dialog.tsx`, `components/projects/implementation-detail.tsx`; página injeta mock em `app/(dashboard)/implementacao/[id]/page.tsx`. **Decisão do Octavio:** o backend (query `getImplementationDetail` + server actions de CRUD de tarefas) fica a cargo do sócio dev — o `TasksKanban` já aceita `handlers` opcionais (`onCreate/onUpdate/onMove/onDelete`) prontos para ligar.
- **Tela de Manutenção com tarefas (Fase 3, pedido do Octavio):** tela própria por contrato com **tarefas em kanban** (`tasks`, ex.: "dar uma olhada", "entrar em contato", "pedir ok"), acessível pelo card do board `/manutencao` **e** por dentro do projeto (bloco Manutenção). Decisão: usar a tabela `tasks`; tarefas **avulsas com opção de configurar recorrentes**. `tasks` hoje NÃO tem `contract_id` nem recorrência → exige migration nova (ver prompt da Fase 3).
- `closeDeal` cria 1 cobrança `setup` automática ao fechar; o `PaymentEditor` reconfigura (apaga pendentes e recria).
- Aviso de build `middleware`→`proxy` (deprecação Next 16) — fora de escopo.

---

## Próximos passos (seguir a ordem das fases — `docs/05-roteiro.md`)
1. ~~Fase 2 (Comercial)~~ ✅ COMPLETA (órfãos, contrato de manutenção, DRI removido, /funil).
2. **Fase 3 (Operacional):** tela `/implementacao/[id]` ✅ entregue **só no front (mock)** — backend a cargo do sócio dev. Pendente: tela de Manutenção com tarefas (migration 0008) + revisar boards de Implementação/Manutenção.
3. Fases 4–6 conforme o roteiro (Financeiro, NCT/Estratégia, Dashboard/Config).

Detalhe operacional da continuidade em `docs/PROMPT-PROXIMA-SESSAO.md`.
Build limpo + 17 testes verdes nesta sessão (órfãos + contrato de manutenção + DRI removido + /funil).
