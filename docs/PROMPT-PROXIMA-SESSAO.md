# Prompt para a próxima sessão (CRM da Agência) — BACKEND das Fases 4–6

Você vai **continuar** o CRM interno (Next.js 16 + Tailwind v4 + shadcn/base-ui + Supabase). As **Fases 2 (Comercial) e 3 (Operacional) estão COMPLETAS** (front + back), mais **arquivar/excluir** transversal. Os **FRONT-ENDS das Fases 4 (Financeiro), 5 (Gestão) e 6 (Dashboard) foram ADIANTADOS** em modo **mock/UI-first** (dados estáticos em `lib/mock/*`, interações em memória + toast — **nada persiste**). Agora a tarefa é **ligar o BACKEND dessas telas, sem mudar o layout aprovado**. **Não comece do zero. Não refaça o front.**

## Leia primeiro (fonte da verdade, nesta ordem)
1. `.work/STATUS.md` — em especial a seção **"Front-ends ADIANTADOS — Fases 4, 5 e 6"** (o que existe de UI e onde).
2. `lib/mock/*` — **o contrato implícito**: os tipos (snake_case, iguais ao schema) que cada tela já consome. O backend deve devolver exatamente esses formatos. Arquivos: `finance.ts`, `config.ts`, `nct.ts`, `tasks.ts`, `profiles.ts`, `strategy.ts`, `dashboard.ts`.
3. `docs/02-dados.md` (`charges`, `accounts_payable`, `org_settings`, `narratives`, `commitments`, `commitment_checkins`, `strategy_blocks`, `tasks`), `docs/03-telas.md`, `docs/04-arquitetura.md`.
4. `docs/06-design-system.md` + `frontend-teste/style-guide.html`. **Não altere o visual** — só troque a fonte de dados.
5. Memória do projeto: [[projetos-vs-implementacao]], [[cursor-pointer-clicaveis]], [[sem-dri-responsavel]], [[supabase-mcp-projeto-crm]].

## Regras de trabalho (obrigatórias)
- **Backend-só, layout congelado.** Substitua `lib/mock/*` por dados reais **sem tocar no layout** das views já construídas. Onde a view recebe props mock, passe os dados da query; onde "muta" em memória, ligue a server action.
- Padrão de dados: página = Server Component → `lib/queries/*` → componentes client; mutação = Server Action (`lib/actions/*`) com **zod** → regra (`lib/rules/*`) → Supabase server client → `revalidatePath`. Forms com `useActionState` ou estado local + `router.refresh()`.
- Todo clicável tem `cursor: pointer`. Toda lista tem empty state. Toda mutação tem toast. (Já está assim nos mocks — preserve.)
- Schema só muda via **migration nova versionada**. **A `0010` já existe (manutenção por hora avulsa, do trabalho avulso); a próxima livre é `0011`.** RLS `authenticated_all` (2 sócios). Após criar tabela/coluna, **regenerar `lib/supabase/types.ts`** pelo MCP **`supabase`** (projeto `czkcfhchsjtmmhtvethg` — confirme com `get_project_url`; o conector `claude.ai Supabase` aponta para OUTRO produto, NÃO use). Ver [[supabase-mcp-projeto-crm]].
- Código/variáveis em inglês, comentários e UI em PT-BR. Nunca commitar secrets.
- Ao fim de cada bloco: `npm run build` limpo + `npm test` verde + atualizar `.work/STATUS.md`.
- **Antes de qualquer ação ambígua, pergunte.** O Octavio decide navegação e regras de produto.

## Estado em uma frase
Comercial + Operacional completos. **Toda a UI restante (Financeiro, Gestão, Dashboard) já existe em mock** e compila (build limpo, 19 rotas). Falta a **camada de dados**: queries + server actions ligando essas telas ao Supabase. As tabelas das Fases 4 e 5 **já existem** no banco.

### Melhorias recentes na tela de Contas (ainda mock)
- `/financeiro/contas` abre por padrão em **"Hoje"** (`?periodo=hoje` via redirect no server component).
- Tabela: valor em **verde (A Receber) / vermelho (A Pagar)** + seta colorida "↑ A receber" / "↓ A pagar" na coluna Descrição quando a aba "Todos" ou "Vencidos" estiver ativa.
- Nova coluna **Ações** com ícones de editar (lápis) e excluir (lixeira) por linha — EditAccountDialog (`components/finance/edit-account-dialog.tsx`) em mock (estado local).
- `NewAccountDialog` suporta **Tipo de lançamento**: Único / Parcelado (N×, divide o valor) / Recorrente (semanal/mensal/anual, por X vezes ou sem parar — gera 24 cobranças). Campo **"Lançar como já recebido/pago"** (status=pago, paid_at=now).
- Callbacks de criação mudaram de singular para plural: `onCreateCharges(Charge[])` / `onCreatePayables(AccountPayable[])`.
- Todos esses ajustes são **somente front/mock** — ao ligar o backend, as server actions devem respeitar o mesmo contrato de tipos.

## Tarefas (ligar backend, na ordem das fases)

### Fase 4 — Financeiro (provavelmente SEM migration; tabelas já existem)
- `lib/queries/finance.ts`: `getAccounts({ tipo, from, to })` (une `charges` não-canceladas + `accounts_payable`, com rótulo de origem do join `projects.name`/`contracts.name`) e `getFinanceOverview({ from, to })` (agregados dos 6 cards usando `org_settings.tax_rate` + regra `lib/rules/net-revenue`).
- `lib/actions/finance.ts`: `toggleChargePaid`/`togglePayablePaid` (grava `status`/`paid_at`), `createCharge` (kind `avulso`), `createPayable`, editar/excluir conta **manual** (avulso/payable). Zod já em `lib/validations/finance.ts`.
- `lib/actions/settings.ts`: `updateOrgSettings` (tax_rate, stale_deal_days), `updateProfile` (nome/ativo).
- Trocar os mocks em `components/finance/accounts-view.tsx`, `app/(dashboard)/financeiro/page.tsx`, `components/config/*`.
- **Aceite (GATE):** charge `setup` do fechamento + recorrências do contrato aparecem em Contas com **origem correta + link**; **receita líquida reflete a alíquota** do `/config`; marcar pago/recebido atualiza cards e listas. Cenário: fechar 1 negócio com manutenção e conferir Contas + Visão Geral.

### Fase 5 — Gestão
- **Strategy:** seed das 5 linhas `strategy_blocks` (se não houver); `lib/queries/strategy.ts` + `lib/actions/strategy.ts` (**só UPDATE** do `content` jsonb por kind).
- **NCT:** `lib/queries/nct.ts` (lista + detalhe do compromisso); `lib/actions/nct.ts` (CRUD narrativa/compromisso, registrar check-in → **atualiza `progress`/`confidence` do commitment**). Zod em `lib/validations/nct.ts`.
- **Tarefas (board global):** `lib/queries/tasks.ts` + `lib/actions/tasks.ts` (CRUD + mover status). A view é `components/tasks/tasks-board.tsx` (board próprio, separado do `tasks-kanban` da Implementação/Manutenção). Filtros por projeto/compromisso/área/pessoa/prioridade.

### Fase 6 — Dashboard
- `lib/queries/dashboard.ts` com um resumo por bloco. Cada bloco = Server Component com **degradação independente** (error boundary próprio). Trocar `lib/mock/dashboard.ts` e as derivações em `app/(dashboard)/page.tsx`.

## Decisões de produto já tomadas (não reabrir sem motivo)
- **Sem DRI/responsável** em projeto nem contato (memória [[sem-dri-responsavel]]) — mas **tarefas e compromissos NCT têm responsável** (assignee/DRI), já refletido nos mocks.
- **Valor exibido nos boards** = `total_value` → `estimated_value` → soma das cobranças de pagamento.
- **Arquivar/Excluir** tem padrão pronto: `components/entity-actions-menu.tsx`. Soft delete `archived_at` existe em companies/deals/contracts/tasks — **não** em `charges`/`accounts_payable`. Para contas, "excluir manual" = DELETE; cancelar = status `cancelado` (já no enum). Confirmar com o Octavio se quiser soft delete.
- **`/implementacao/[id]` é mock (front)** — backend a cargo do sócio dev; **não mexer** sem pedido.
- **Front-ends das Fases 4–6 são MOCK aprovável** — o layout não muda ao ligar o backend; respeite o contrato dos tipos em `lib/mock/*`.

## Banco
Projeto Supabase **`czkcfhchsjtmmhtvethg`** (MCP `supabase`). Migrations **0001–0010 presentes** (0010 = manutenção por hora avulsa, do trabalho avulso, **não commitada**); a próxima livre é **0011**. As Fases 4 e 5 **não devem precisar de migration** (tabelas já existem) — confirme em `02-dados.md`. Após qualquer mudança de schema, regenerar `lib/supabase/types.ts`.

## Git
Repositório no GitHub: `octaviosilva2/agenciaIA-system` (público), branch `main`. **Commit/push só quando o Octavio pedir.** O trabalho atual (fronts mock das Fases 4–6 + avulso pré-existente) está **todo no working tree, NÃO commitado** — para revisão.
