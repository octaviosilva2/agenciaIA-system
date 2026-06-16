# 07 — Handover (estado atual e continuidade)

> **Leia este documento ANTES de executar qualquer coisa.** Ele registra exatamente onde o projeto parou, o que já existe e funciona (não refazer), e como começar a Fase 2.

## 1. Onde estamos

- **Fases 0 e 1 estão concluídas e aprovadas** (GATE da Fase 1 passou). Commit de referência: `db14367`.
- Depois da Fase 1, foi criado e **aprovado o design system do frontend** (`06-design-system.md` + `frontend-teste/`).
- **Próximo passo:** Fase 2 — Comercial, começando pela **etapa 2.0** (alinhamento visual da fundação), conforme `05-roteiro.md`.
- O banco Supabase **já existe e está aplicado** — não criar projeto novo, não reaplicar migrations. Credenciais em `.env.local` (gitignored).

## 2. O que já existe e FUNCIONA — não refazer

### Stack e fundação (Fase 0)
- **Next.js 15+ (App Router)** na raiz do repo, TypeScript strict, Tailwind CSS v4, shadcn/ui.
  - ⚠️ Esta versão do shadcn usa componentes `@base-ui` internamente: o padrão `asChild` foi substituído por `render={<Component />}`.
- **Auth completa:** clients `@supabase/ssr` em `lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`); `/middleware.ts` protege tudo exceto `/login`; página `/login` funcional com Server Action.
- **Layout do dashboard:** `app/layout.tsx` (PT-BR, TooltipProvider, Toaster/sonner) e `app/(dashboard)/layout.tsx` (SidebarProvider + header com e-mail do usuário e logout).
- **Sidebar:** `components/app-sidebar.tsx` com a constante `NAV_GROUPS` (5 grupos). Todas as rotas do menu existem como **páginas placeholder** — substituí-las é exatamente o trabalho das Fases 2–6.
- **Componentes base:** `components/period-filter.tsx` (filtro temporal global) + biblioteca shadcn em `components/ui/`.
- **Vitest** configurado (`vitest.config.ts`); testes em `__tests__/`.
- Utilitários instalados: `zod`, `date-fns`, `lucide-react`, `dnd-kit`.

### Banco e domínio (Fase 1)
- **7 migrations** aplicadas (`supabase/migrations/0001`–`0007`): enums, tabelas (`deals`, `companies`, `projects`, `tasks`, `contracts`, `charges`, `accounts_payable`, tabelas do NCT…), CHECK constraints, UNIQUE de idempotência em `charges (contract_id, due_date)`, seeds, índices.
- **RLS habilitado em 100% das 17 tabelas**, policy `authenticated_all` (2 sócios, sem roles segmentadas). `get_advisors` rodado — só os warnings `always_true` esperados.
- **Types espelhados do banco** em `lib/supabase/types.ts` (gerados via MCP).
- **Zod schemas** em `lib/validations/` (`company.ts`, `deal.ts`, `project.ts`, `finance.ts`, `nct.ts`) — schema único por entidade, compartilhado entre form e server action.
- **Regras puras** em `lib/rules/` — lógica de negócio sem I/O, **100% testada** (`__tests__/rules/`, suíte verde):
  - `deal-stage.ts` — transições válidas do funil (desqualificado só de prospect/lead; perdido exige motivo; fechado exige has_maintenance; oportunidade exige projeto)
  - `contact-status.ts` — estado derivado do contato (6 estados, nunca editado à mão)
  - `recurrence.ts` — geração matemática das N parcelas de um contrato
  - `net-revenue.ts` — receita líquida contra a alíquota
- `lib/actions/action-state.ts` — tipo `ActionState` para `useActionState`.

## 3. Design system (chegou DEPOIS da Fase 1)

- **`06-design-system.md`** é o manual completo: tokens de cor, tipografia, receitas de classes, badges (§6.2 = mapeamento enum → label → tom) e regras de ouro.
- **`frontend-teste/style-guide.html`** é a **verdade visual** (abrir no navegador; tem tema claro e escuro). Se o `.md` e o `.html` divergirem, o `.html` vence.
- **`frontend-teste/index.html`** é um preview navegável de telas do CRM — serve de **inspiração de layout**, não de código a copiar (usa Tailwind CDN, só para visualização).
- Regra registrada em `AGENTS.md` e no roteiro: **nenhuma UI nasce fora do design system**.

## 4. Desalinhamentos conhecidos (corrigir na etapa 2.0)

O frontend da Fase 0 foi feito **antes** do design system. Estes pontos divergem e são a primeira tarefa da Fase 2 — é **alinhamento visual**, não retrabalho funcional:

| Item | Estado atual | Estado esperado (design system) |
|---|---|---|
| `app/globals.css` | Tokens default do shadcn (oklch, fundo branco) | Tokens HSL zinc do §3 (ex.: background claro `240 5% 96%`) |
| Fontes (`app/layout.tsx`) | Geist + Geist Mono | **Inter** + **JetBrains Mono** |
| `lib/format.ts` | Labels prontos, mas: cores do funil coloridas (blue/cyan/violet…), sem variantes `dark:`, constantes separadas `_LABELS`/`_COLORS` | Funil em **escala slate**; tons claro+escuro do §6.1/§6.2; formato `{ label, className }` por enum consumido por `EntityBadge`; "Done" → "Concluída", "Reativar Futuramente" → "Reativar" |
| `EntityBadge` | Não existe | Componente único que renderiza qualquer badge a partir do meta de `format.ts` (§7) |
| Sidebar/header/login | Funcionais, estilo shadcn default | Alinhados ao `style-guide.html` |

**O que NÃO muda nesse alinhamento:** migrations, `lib/rules/`, `lib/validations/`, `lib/supabase/`, middleware, testes. São camadas de dados/domínio — o alinhamento é só visual (`format.ts` muda de forma, não de conteúdo semântico).

## 5. Fluxo de trabalho da Fase 2 em diante — UI-first

Para **cada área/tela nova**:

1. **UI primeiro** — tela completa com dados mock, seguindo o design system.
2. **Validação visual (mini-gate)** — humano aprova o visual antes de qualquer persistência.
3. **Backend depois** — `lib/queries/`, server actions, Supabase e `lib/rules/` entram só após aprovação; o mock vira dado real sem mudar o layout.
4. **Testes e aceite** — regras/validações novas testadas, build limpo.

Os GATEs de fase (`05-roteiro.md`) continuam por cima desses mini-gates.

## 6. Como começar a Fase 2 (checklist da próxima sessão)

1. Ler `01-produto.md` → `02-dados.md` → `03-telas.md` → `04-arquitetura.md` → `06-design-system.md` (e abrir o `style-guide.html`) → `05-roteiro.md`.
2. Executar a **etapa 2.0** (alinhamento visual da fundação) e validar com o humano.
3. Seguir os itens 1–6 da Fase 2 no roteiro, cada um no fluxo UI-first, consumindo `lib/validations/` e `lib/rules/` já prontos.
4. Padrão de dados obrigatório (`04-arquitetura.md`): página = Server Component → `lib/queries/*` → componentes client; mutação = Server Action colocalizada (zod → rules → Supabase server client → `revalidatePath`).
5. Ao fim da fase: build + testes verdes, commit `feat(fase-2): …`, `.work/STATUS.md` atualizado, **parar no GATE**.

## 7. Regras permanentes (resumo)

- Escopo é o dos documentos `01–04`; ideia nova vai para o Backlog em `.work/STATUS.md`, não se implementa.
- Schema só muda via migration nova versionada em `supabase/migrations/` (aplicada via MCP).
- Ambiguidade real → perguntar ao humano antes de codar.
- Código/variáveis em inglês, comentários em português, UI em PT-BR.
- Nunca commitar secrets; `.env.local` permanece gitignored.
- Idempotência das automações: consultar-antes-de-criar (charge setup por deal, parcela por `contract_id+due_date`).
