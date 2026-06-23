# PROMPT — copiar e colar no chat novo

> **É ESTE o prompt que você roda.** Detalhe de cada fase e das próximas sessões: `docs/PLANO-BACKEND-FINAL.md`.
> Estamos na **Sessão 4 — Dashboard**. Ao avançar de sessão, atualize este arquivo (nome da Sessão + `lib/mock/*` + arquivo-modelo do bloco §3 do plano).

---

Continue o CRM (Next.js 16 + Supabase). Front-end 100% pronto e aprovado.
Tarefa: ligar o BACKEND das telas mock ao Supabase SEM mudar layout.

LEIA SÓ (não releia os 9 docs):
- docs/PLANO-BACKEND-FINAL.md  → execute a "Sessão 4 — Dashboard"
- lib/mock/dashboard.ts → contrato dos tipos (snake_case = schema) + components/dashboard/{dashboard-view,growth-chart}.tsx
- queries-modelo a REUSAR (Dashboard agrega, não reimplementa somas): lib/queries/finance.ts
  (getFinanceOverview), lib/queries/projects-board.ts (getImplementationBoard + deals/projects),
  lib/queries/nct.ts (commitments) e lib/queries/tasks.ts (getManagedTasks). Padrão recente =
  lib/queries/strategy.ts + lib/queries/nct.ts (Sessões 2 e 3).

PRÉ-REQUISITO ✅ (Sessões 1–3 feitas): Financeiro, Estratégia, NCT e Tarefas já têm backend real.
O Dashboard é o ÚLTIMO porque AGREGA as queries das fases anteriores (§2.6 do plano).

REGRAS:
- Mover os types do mock para lib/queries/dashboard.ts (mesmo nome) e injetar dados reais na page
  (trocar import + carregar a query). NÃO tocar no JSX/layout.
- Padrão: page = Server Component → lib/queries → client. SEM mutação nesta sessão (dashboard é
  read-only). Banco real (projeto czkcfhchsjtmmhtvethg, MCP supabase). RLS já aplicada — NÃO criar policy.
- Criar lib/queries/dashboard.ts — um resumo por bloco. ⚠️ ARQUITETURA DE DEGRADAÇÃO (concreta):
  cada bloco é um Server Component async próprio dentro de <Suspense fallback={skeleton}>; a query
  do bloco usa try/catch e retorna um ESTADO DE ERRO LOCAL (card "não foi possível carregar") em vez
  de lançar. Bloco que falha NÃO derruba os outros.
  - Financeiro: reusa getFinanceOverview.
  - Comercial (CommercialSummary) + Implementação (ImplementationSummary): agrega deals/projects.
  - NCT: resumo de commitments. Tarefas de hoje: tasks com due_date = hoje.
  - getGrowthData() — série mensal (Jan–mês atual) §4.4: receita = charges PAGAS no mês;
    clientes ativos = companies com contrato ativo no mês.
- Religar (sem mexer no JSX): app/(dashboard)/page.tsx, components/dashboard/{dashboard-view,growth-chart}.tsx.
  Código em inglês, comentários/UI em PT-BR. Nada de subagente — execução direta.

GATE (parar e me mostrar): dashboard mostra números reais coerentes com as outras telas
(financeiro, funil, nct, tarefas); um bloco que falha degrada sozinho (os outros seguem).
Depois: npm run build + npm test, commit, STATUS.md. E LIMPAR os lib/mock/* órfãos (Sessão 5 §3):
após religar o dashboard, lib/mock/{nct,tasks,dashboard,finance,strategy,profiles}.ts ficam órfãos — remover.

Migration: nenhuma (próxima livre = 0014).
Decisões §4.4/§4.5 já tomadas. Dúvidas só se algo no mock divergir do schema real.
