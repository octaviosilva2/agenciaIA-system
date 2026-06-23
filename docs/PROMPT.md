# PROMPT — copiar e colar no chat novo

> **É ESTE o prompt que você roda.** Detalhe de cada fase e das próximas sessões: `docs/PLANO-BACKEND-FINAL.md`.
> Estamos na **Sessão 3 — NCT + Tarefas**. Ao avançar de sessão, atualize este arquivo (nome da Sessão + `lib/mock/*` + arquivo-modelo do bloco §3 do plano).

---

Continue o CRM (Next.js 16 + Supabase). Front-end 100% pronto e aprovado.
Tarefa: ligar o BACKEND das telas mock ao Supabase SEM mudar layout.

LEIA SÓ (não releia os 9 docs):
- docs/PLANO-BACKEND-FINAL.md  → execute a "Sessão 3 — NCT + Tarefas"
- lib/mock/nct.ts e lib/mock/tasks.ts → contrato dos tipos (snake_case = schema)
- lib/actions/tasks.ts (CRUD de tasks de manutenção) e lib/queries/maintenance-detail.ts
  → arquivos-modelo. lib/queries/strategy.ts + lib/actions/strategy.ts (Sessão 2) = padrão recente.

PRÉ-REQUISITO ✅ (Sessão 2 feita): os componentes de NCT e Tarefas já recebem `profiles`
por prop; as pages carregam getProfiles(). Selects de DRI/assignee listam a equipe real.
Telas nascem VAZIAS — os mocks de nct/tasks são descartados ao religar (§4.5).

REGRAS:
- Mover os types do mock para lib/queries/{nct,tasks}.ts (mesmo nome) e injetar dados
  reais nas pages (trocar import + carregar a query). NÃO tocar no JSX/layout.
- Padrão: page = Server Component → lib/queries → client; mutação = Server Action
  (zod de lib/validations/nct.ts → supabase server → revalidatePath). Banco real
  (projeto czkcfhchsjtmmhtvethg, MCP supabase). RLS já aplicada (0007) — NÃO criar policy.
- NCT: lib/queries/nct.ts (getNarrativesWithCommitments + getCommitmentDetail(id) com
  commitment_checkins; mover tipos Narrative/Commitment/Checkin). lib/actions/nct.ts
  (CRUD narrativa, CRUD compromisso, createCheckin). ⚠️ createCheckin faz DUAS escritas
  na MESMA action: insere em commitment_checkins E dá update em commitments (progress/
  confidence = valores do check-in recém-criado — o último check-in é a fonte de verdade
  do card). Revalida /nct e /nct/[commitmentId].
- TAREFAS board global: lib/queries/tasks.ts (getManagedTasks com filtros projeto/
  compromisso/área/pessoa/prioridade; mover tipo ManagedTask + PROJECT_LABELS via join
  projects.name). lib/actions/tasks-board.ts (CRUD + moveTask = muda status). ⚠️ ARQUIVO
  SEPARADO de lib/actions/tasks.ts (este é 100% manutenção: exige contractId, fixa
  area='operacional', revalida /manutencao). Nomes de função distintos. Revalida /tarefas.
- Religar (sem mexer no JSX): app/(dashboard)/{nct/page,nct/[commitmentId]/page,
  tarefas/page}.tsx e components/nct/* + components/tasks/{tasks-board,task-board-dialog}.tsx.
  Código em inglês, comentários/UI em PT-BR. Nada de subagente — execução direta.

GATE (parar e me mostrar): criar narrativa→compromisso→check-in (% e confiança do card
atualizam NA LISTA e no DETALHE); board de tarefas move/cria/filtra e persiste; tarefas
vinculadas aparecem no detalhe do compromisso. Depois: npm run build + npm test, commit, STATUS.md.

Migration: nenhuma (tabelas + FK fk_tasks_commitment existem; próxima livre = 0014).
Decisões §4.3/§4.5 já tomadas. Dúvidas só se algo no mock divergir do schema real.
