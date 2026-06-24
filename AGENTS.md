<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Contexto do projeto

CRM interno de uma agência de IA (2 sócios). Sistema **completo** — fases 0–6 entregues, 3 ondas de ajustes e validação final concluídas. O trabalho atual é manutenção e melhorias pontuais.

**Leia antes de qualquer coisa:** `docs/07-handover.md` (estado atual + como fazer mudanças).

---

# Stack (decidida — não trocar)

- **Framework:** Next.js 15+ (App Router), React 19, Server Components por padrão
- **Linguagem:** TypeScript strict (`strict: true`, sem `any`)
- **Estilo:** Tailwind CSS v4 + shadcn/ui (base-ui internamente — `render={<Component />}` em vez de `asChild`)
- **Banco/Auth:** Supabase (Postgres + Auth) via `@supabase/ssr`
- **Validação:** zod (schema único por entidade, compartilhado entre form e server action)
- **Drag & drop:** dnd-kit
- **Datas:** date-fns (locale pt-BR) + `lib/date-range.ts` (fuso Brasília)
- **Gráficos:** Recharts
- **Testes:** Vitest + Testing Library

Dev server: `npm run dev -- --webpack` (**--webpack obrigatório** — Turbopack crasha static paths no Windows).

---

# Frontend — Design System (LEIA ANTES de construir qualquer UI)

O estilo aprovado do CRM está em [`docs/06-design-system.md`](docs/06-design-system.md), com a referência visual viva em [`frontend-teste/style-guide.html`](frontend-teste/style-guide.html) (abra no navegador — tema claro e escuro).

Antes de criar qualquer botão, badge, input, tabela, card ou estado: siga os **tokens** e as **receitas de classes** de lá. Cor, medida, tipografia e raio **não se inventam**. Labels PT-BR e cores de status saem **sempre** de `lib/format.ts`. Se `.md` e `.html` divergirem, o `.html` vence.

---

# Padrões obrigatórios

## Fluxo de dados

```
page.tsx (Server Component)
  → lib/queries/dominio.ts        ← lê do Supabase (supabase server client)
  → ClientComponent.tsx           ← recebe dados via props
      → lib/actions/dominio.ts    ← Server Action
          → zod validate
          → lib/rules/*.ts        ← lógica pura (sem I/O)
          → supabase server client
          → revalidatePath(...)
```

- Página = Server Component. **Nunca** buscar dados em `useEffect` no client.
- Mutação = Server Action com `useActionState` usando `ActionState` (`lib/actions/action-state.ts`).
- Regras de negócio = funções puras em `lib/rules/` — **sem I/O, sem Supabase**.

## Enums e labels

- Fonte da verdade: schema Zod em `lib/validations/`.
- Labels PT-BR e cores: **somente** `lib/format.ts`. Nunca string solta ou cor inline na UI.
- Badges: `components/entity-badge.tsx` com o retorno de `lib/format.ts`.

## Datas

- Sempre `lib/date-range.ts` para períodos, hoje, semana (segunda→domingo), mês.
- `parseDateOnly` para datas sem hora (evita deslocamento de fuso).
- `formatDate` / `formatDateTime` / `isOverdue` / `daysUntil` já estão em `lib/format.ts` com fuso Brasília.

## Schema e migrations

- Schema muda **só** via migration nova em `supabase/migrations/` (próxima livre: **0020**).
- Aplicar via MCP `supabase` (`apply_migration`) → regenerar `lib/supabase/types.ts` (`generate_typescript_types`).
- **Nunca** criar policy RLS — `authenticated_all` já cobre todas as tabelas.
- Migrations destrutivas (recreate de enum, drop): expand-then-contract em múltiplas migrations.

## Idempotência

- Parcelas de manutenção: UNIQUE `(contract_id, due_date)` em `charges` — usar `upsert` (preserva pagas).
- Avulsos e setup têm `contract_id = null` — **não** são idempotentes, sempre INSERT.

## Outros

- `select` com opção vazia: sentinel `"none"` no client → `null` no banco (nunca string vazia).
- Sidebar: constante `NAV_GROUPS` em `components/app-sidebar.tsx`. `isActive` exato para raiz e `/financeiro`; prefixo para o resto.
- Comentários em português; código, variáveis e nomes de arquivo em inglês; UI em PT-BR.

---

# Arquivos-chave

| Responsabilidade | Arquivo |
|---|---|
| Labels PT-BR e cores de status | `lib/format.ts` |
| Helpers de data e período (Brasília) | `lib/date-range.ts` |
| Transições válidas do funil | `lib/rules/deal-stage.ts` |
| Estado derivado do contato (6 estados) | `lib/rules/contact-status.ts` |
| Geração de parcelas mensais | `lib/rules/recurrence.ts` |
| Próxima data de tarefa recorrente | `lib/rules/task-recurrence.ts` |
| Métricas do funil | `lib/rules/funnel-metrics.ts` |
| Receita líquida (alíquota) | `lib/rules/net-revenue.ts` |
| Clients Supabase | `lib/supabase/server.ts`, `client.ts`, `middleware.ts` |
| Types do banco (gerados) | `lib/supabase/types.ts` |
| Sidebar com navegação | `components/app-sidebar.tsx` |
| Filtro temporal reutilizável | `components/period-filter.tsx` |
| Badge universal de entidade | `components/entity-badge.tsx` |
| Menu kebab entidade (arquivar/excluir) | `components/entity-actions-menu.tsx` |
| Avatar de iniciais | `components/ui-shared/initials-avatar.tsx` |
| Overflow da coluna Concluída | `components/tasks/done-column-overflow.tsx` |
| Kanban de tarefas (impl + manutenção) | `components/tasks/tasks-kanban.tsx` |

---

# Segurança

- `.env.local` gitignored — não commitar.
- Service role key nunca no client, nunca commitada.
- Middleware protege todo `(dashboard)`; `/login` é a única rota pública.
- Sem signup público — usuários criados no painel Supabase Auth.
