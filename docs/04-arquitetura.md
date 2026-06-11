# 04 — Arquitetura e Convenções

## Stack (decidida — não trocar)

| Camada | Escolha |
|---|---|
| Framework | **Next.js 15+ (App Router)**, React 19, Server Components por padrão |
| Linguagem | **TypeScript strict** (`strict: true`, sem `any`) |
| Estilo | **Tailwind CSS v4** + **shadcn/ui** (tema neutro, dark mode opcional depois) |
| Banco/Auth | **Supabase** (Postgres + Auth) via `@supabase/ssr` |
| Validação | **zod** — schema único por entidade, compartilhado entre form e server action |
| Drag & drop | **dnd-kit** (kanbans de contatos, implementação e tarefas) |
| Datas | **date-fns** (locale pt-BR) |
| Gráficos | **Recharts** (página Funil); preferir HTML/CSS quando bastar |
| Testes | **Vitest** + Testing Library |

O app vive na **raiz do repositório** (sem subpasta `web/` — evita lockfiles órfãos que travam o dev server).

## Estrutura de pastas

```
app/
  login/                      # página + action de auth
  (dashboard)/                # grupo autenticado: layout com sidebar + guard
    page.tsx                  # Dashboard
    estrategia/
    nct/  nct/[commitmentId]/
    tarefas/
    contatos/  contatos/[id]/
    oportunidades/  oportunidades/[id]/
    funil/
    implementacao/  implementacao/[id]/
    manutencao/
    financeiro/  financeiro/contas/
    config/
components/
  ui/                         # shadcn (gerado)
  app-sidebar.tsx             # NAV_GROUPS = constante única da navegação
  period-filter.tsx           # filtro temporal reusado (Todos/Hoje/Semanal/Mensal/Personalizado)
  *-form.tsx, *-board.tsx     # um componente por responsabilidade
lib/
  supabase/                   # server.ts, client.ts, middleware.ts (@supabase/ssr)
  validations/                # zod schemas por entidade (deal.ts, company.ts, ...)
  queries/                    # leitura por domínio (contacts.ts, finance.ts, nct.ts, ...)
  rules/                      # LÓGICA PURA TESTÁVEL (sem I/O):
                              #   deal-stage.ts (transições válidas do funil)
                              #   contact-status.ts (estado derivado)
                              #   recurrence.ts (geração de parcelas)
                              #   net-revenue.ts (alíquota), funnel-metrics.ts
  actions/action-state.ts     # tipo ActionState + INITIAL_ACTION_STATE
  format.ts                   # labels/badges PT-BR por enum + moeda/data
supabase/migrations/          # 0001_*.sql ...
docs/                         # estes documentos
.work/STATUS.md               # log de progresso por fase
```

## Padrões obrigatórios

**Fluxo de dados:** página = Server Component que chama `lib/queries/*` → passa dados para componentes client. Mutação = Server Action colocalizada (`actions.ts` na pasta da rota) que: valida com zod → executa regra de `lib/rules/*` → escreve via Supabase server client → `revalidatePath`. Forms client usam `useActionState` com `ActionState`.

**Regras de negócio são funções puras** em `lib/rules/`, separadas do I/O — é onde mora o valor do sistema (transições do funil, estado derivado, parcelas, líquida) e é o que os testes cobrem primeiro.

**Enums:** fonte da verdade é o zod schema em `lib/validations/`; labels PT-BR e cores só em `lib/format.ts`. Nunca string solta na UI.

**Selects com opção vazia:** sentinel `"none"` no client → `null` no banco (nunca string vazia).

**Sidebar:** uma constante `NAV_GROUPS` em `app-sidebar.tsx`. Atenção ao `isActive`: rotas-raiz com sub-rotas (`/`, `/financeiro`, `/nct`) casam exato; o resto por prefixo.

**Idempotência das automações:** consultar-antes-de-criar (charge setup por deal, parcelas por contract_id+due_date). Nunca confiar só na UI.

**Comentários em português; código, variáveis e nomes de arquivo em inglês; UI em PT-BR.**

## Design

- Base shadcn/ui neutra (zinc), densidade compacta — é ferramenta interna de produtividade.
- Badges coloridos consistentes via `lib/format.ts`: estágios do funil, status de projeto/tarefa/conta, tipos NCT (Think-It índigo · Build-It âmbar · Launch-It verde · Quantitativo azul-cinza), confiança (verde/âmbar/vermelho), estado derivado do contato.
- Valores monetários sempre `R$ pt-BR`; datas `dd/MM/yyyy`; atrasos em vermelho.
- Toda lista tem empty state com CTA. Toda mutação tem feedback (toast/inline).

## Testes (o que cobrir, nesta ordem)

1. `lib/rules/deal-stage.ts` — todas as transições válidas/inválidas (desqualificado só de prospect/lead; perdido exige motivo; fechado exige has_maintenance; oportunidade exige projeto)
2. `lib/rules/contact-status.ts` — os 6 estados derivados + precedência (tabela de casos)
3. `lib/rules/recurrence.ts` — geração de parcelas (min_months, billing_day, meses curtos, idempotência)
4. `lib/rules/net-revenue.ts` e `funnel-metrics.ts` — cálculos
5. Validações zod das entidades
6. Smoke de componentes críticos (kanban, period-filter) — sem perseguir cobertura de UI

`npm run build` + `npm test` verdes são pré-condição de fim de fase.

## Ambiente e segurança

- `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Service role NUNCA no client e NUNCA commitada.
- Middleware de auth protege todo o grupo `(dashboard)`; `/login` é a única rota pública.
- RLS conforme `02-dados.md`. Sem signup público.
- Migrations só via arquivos versionados em `supabase/migrations/` aplicados pelo MCP — nunca SQL ad-hoc no banco.
