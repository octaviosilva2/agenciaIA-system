# CRM — AI Agency Operations

Internal CRM built to run the full operating cycle of a 2-partner AI implementation agency: strategy, sales pipeline, project delivery, and finance — in one tool, reflecting how the business actually works instead of a generic off-the-shelf CRM.

**🇺🇸 [English](#english)** · **🇧🇷 [Português](#português)**

---

## English

### What it is

A CRM built for internal use by a 2-partner agency that implements AI solutions for clients. It manages the full cycle: strategic planning (a lightweight OKR-like layer), sales pipeline (contact → deal → project), delivery (implementation + ongoing maintenance retainers), and finance (receivables/payables) — all in one system, modeled around this specific agency's actual revenue structure (one-time implementation fee + optional monthly retainer), not a generic SaaS CRM's assumptions (no multi-tenant, no billing engine, no built-in AI features).

The question the dashboard is built to answer in under 30 seconds: **"what needs my attention right now?"**

### The problem

Off-the-shelf CRMs assume a sales-only pipeline and bolt-on project management as an afterthought. This agency's actual workflow is closer to: prospect → qualify → scope/propose → close → *hand off to delivery* → deliver → *hand off to a recurring maintenance retainer* → keep the client relationship warm. Modeling that whole loop — with the exact stage rules the partners actually use (e.g., moving a deal to "Opportunity" *forces* project creation; closing a deal *requires* an explicit maintenance decision) — isn't something a generic tool does out of the box.

### Stack

- **Framework:** Next.js 15+ (App Router), React 19, Server Components by default
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database/Auth:** Supabase (Postgres + Auth) via `@supabase/ssr`
- **Validation:** Zod (a single schema per entity, shared between form and server action)
- **Drag & drop:** dnd-kit
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library

### Getting started

```bash
npm install
```

Create `.env.local` in the project root with your own Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Apply the migrations in `supabase/migrations/` (0001–0019, in order) to a fresh Supabase project — they contain schema and enum definitions only, no seed data from real usage.

Run the dev server:

```bash
npm run dev -- --webpack
```

> `--webpack` is required — Turbopack currently crashes the static-paths worker on Windows for this Next.js version.

Login uses Supabase Auth email/password — there is no public signup; users are created directly in the Supabase dashboard (by design, for a closed 2-person org).

### Testing & build

```bash
npm test          # unit tests for pure business rules and validation schemas
npm run build      # production build
```

### Project structure

```
app/(dashboard)/          # authenticated routes
components/               # React components by domain
lib/
  actions/                # Server Actions (mutations)
  queries/                # server-side reads per domain
  rules/                  # pure business logic (unit tested)
  validations/             # Zod schemas per entity
  supabase/               # SSR clients (server, client, middleware)
supabase/migrations/       # versioned schema migrations
__tests__/                 # tests for the pure business rules
docs/                       # project documentation
```

Full documentation lives in [`docs/`](docs/) — start with [`docs/00-indice.md`](docs/00-indice.md). It includes the complete data model, architecture decisions, design system tokens, and a handover doc describing the current state and how to make changes safely.

### CASE — how this was built with Claude Code

**Context.** The agency was running its pipeline across scattered notes, spreadsheets and memory. Off-the-shelf CRMs (HubSpot-style tools) model a sales funnel, not the sell → deliver → retain loop this specific business runs, and none of them derive a client's status automatically from their deal/project/contract history the way this system does. Building a small, opinionated internal tool was faster and more accurate than bending a generic product to fit.

**AI-Workflow.** Built end-to-end with Claude Code, using a custom multi-agent pipeline (`dev-agents`) built for this kind of structured feature work: a **researcher** agent maps the relevant code and risks before anything is touched, a **story-writer** turns the request into a reviewable user story with acceptance criteria, a **spec** agent designs the technical approach (schema, contracts, files to touch) as a second human-approved gate, then **backend** and **frontend** agents implement within that approved scope, a **tester** agent writes and runs tests against the acceptance criteria, and a **validator** agent independently audits the delivery against the original story before it's considered done. Every stage that changes direction (schema, business rules, UI approach) stops at a human gate rather than proceeding on inference. In practice this meant, for example, building the Finance, Strategy/NCT and Task-board modules' UI first against mock data to validate the layout, then wiring the real backend afterward without touching the approved layout — and a dedicated final validation pass that caught and fixed two real bugs (a form that didn't reset after save, and a wizard that could mark a deal closed without a valid maintenance contract) before sign-off.

**Architecture.** Next.js App Router with Server Components as the default data-fetching path (`page → lib/queries → client component`) and Server Actions for all mutations (`Zod validation → pure lib/rules functions → Supabase → revalidatePath`), keeping business logic (funnel stage transitions, recurring billing generation, derived client status) as pure, unit-tested functions with no I/O. Schema changes only happen through numbered migrations, applied and type-generated through the Supabase MCP server. Row-level security is enabled on every table under a deliberately simple policy for this closed 2-person org.

**Evidence.** The system covers the full operating cycle (strategy, sales, delivery, maintenance, finance, dashboard) across 19 schema migrations and a green test suite (business rules and validation schemas). It went through three rounds of partner-driven refinement after the initial build and a dedicated final validation pass (build + tests + Supabase advisor checks + a manual smoke test against a real, non-production database) before being handed over for daily use by both partners.

---

## Português

### O que é

CRM interno construído para o uso de uma agência de 2 sócios que implementa soluções de IA para clientes. Gerencia o ciclo completo: planejamento estratégico (uma camada leve inspirada em OKRs), pipeline comercial (contato → negócio → projeto), operação (implementação + manutenção recorrente) e financeiro (contas a receber/pagar) — tudo num único sistema, modelado em cima da estrutura de receita real desta agência (valor único de implementação + manutenção mensal opcional), e não nas suposições de um CRM SaaS genérico (sem multi-tenant, sem motor de cobrança, sem IA embutida).

A pergunta que o Dashboard é construído para responder em até 30 segundos: **"o que precisa da minha atenção agora?"**

### Que problema resolve

CRMs prontos assumem um funil só de vendas e tratam gestão de projeto como um apêndice. O fluxo real desta agência é mais parecido com: prospecção → qualificação → escopo/proposta → fechamento → *passagem de bastão para a entrega* → entrega → *passagem de bastão para um contrato de manutenção recorrente* → manter o relacionamento aquecido. Modelar esse ciclo inteiro — com as regras de estágio que os sócios de fato usam (ex.: mover um negócio para "Oportunidade" *exige* criar o projeto; fechar um negócio *exige* uma decisão explícita sobre manutenção) — não é algo que uma ferramenta genérica faz de fábrica.

### Stack

- **Framework:** Next.js 15+ (App Router), React 19, Server Components por padrão
- **Linguagem:** TypeScript (modo strict, sem `any`)
- **Estilo:** Tailwind CSS v4 + shadcn/ui
- **Banco/Auth:** Supabase (Postgres + Auth) via `@supabase/ssr`
- **Validação:** Zod (um schema único por entidade, compartilhado entre formulário e server action)
- **Drag & drop:** dnd-kit
- **Gráficos:** Recharts
- **Testes:** Vitest + Testing Library

### Como rodar

```bash
npm install
```

Crie `.env.local` na raiz com as credenciais do seu próprio projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=<url-do-seu-projeto-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
```

Aplique as migrations de `supabase/migrations/` (0001–0019, em ordem) num projeto Supabase novo — elas contêm apenas definição de schema e enums, sem dado de seed de uso real.

Rode o servidor de desenvolvimento:

```bash
npm run dev -- --webpack
```

> `--webpack` é obrigatório — o Turbopack hoje crasha o worker de static paths no Windows nesta versão do Next.js.

O login usa e-mail/senha via Supabase Auth — não há cadastro público; usuários são criados diretamente no painel do Supabase (decisão deliberada, por ser uma organização fechada de 2 pessoas).

### Testes e build

```bash
npm test          # testes unitários das regras de negócio puras e dos schemas de validação
npm run build      # build de produção
```

### Estrutura de pastas

```
app/(dashboard)/          # rotas autenticadas
components/               # componentes React por domínio
lib/
  actions/                # Server Actions (mutações)
  queries/                # leituras do banco por domínio
  rules/                  # lógica de negócio pura (testada)
  validations/            # schemas Zod por entidade
  supabase/               # clients SSR (server, client, middleware)
supabase/migrations/      # migrations de schema versionadas
__tests__/                # testes das regras puras
docs/                     # documentação do projeto
```

Documentação completa em [`docs/`](docs/) — comece por [`docs/00-indice.md`](docs/00-indice.md). Inclui o modelo de dados completo, decisões de arquitetura, tokens do design system e um documento de handover com o estado atual e como fazer mudanças com segurança.

### CASE — como isso foi construído com Claude Code

**Context (Contexto).** A agência rodava o pipeline em anotações soltas, planilhas e memória. CRMs prontos (estilo HubSpot) modelam um funil de vendas, não o ciclo vender → entregar → reter que este negócio de fato roda, e nenhum deles deriva o estado de um contato automaticamente a partir do histórico de negócios/projetos/contratos como este sistema faz. Construir uma ferramenta interna pequena e opinativa foi mais rápido e mais preciso do que forçar um produto genérico a se encaixar.

**AI-Workflow.** Construído de ponta a ponta com Claude Code, usando uma esteira multi-agente própria (`dev-agents`) montada para esse tipo de trabalho estruturado: um agente **researcher** mapeia o código e os riscos relevantes antes de qualquer mudança, um agente **story-writer** transforma o pedido numa user story revisável com critérios de aceite, um agente de **spec** desenha a abordagem técnica (schema, contratos, arquivos a tocar) como um segundo gate aprovado por humano, agentes de **backend** e **frontend** implementam dentro desse escopo aprovado, um agente **tester** escreve e roda testes contra os critérios de aceite, e um agente **validator** audita de forma independente a entrega contra a story original antes de considerá-la pronta. Toda etapa que muda direção (schema, regra de negócio, abordagem de UI) para num gate humano em vez de seguir por inferência. Na prática, isso significou, por exemplo, construir o front-end dos módulos de Financeiro, Estratégia/NCT e board de Tarefas primeiro contra dados mock para validar o layout, e só depois ligar o backend real sem tocar no layout já aprovado — além de uma rodada dedicada de validação final que encontrou e corrigiu dois bugs reais (um formulário que não resetava após salvar, e um wizard que podia marcar um negócio como fechado sem um contrato de manutenção válido) antes da entrega.

**Architecture (Arquitetura).** Next.js App Router com Server Components como caminho padrão de leitura de dados (`page → lib/queries → client component`) e Server Actions para toda mutação (`validação Zod → funções puras em lib/rules → Supabase → revalidatePath`), mantendo a lógica de negócio (transições de estágio do funil, geração de cobranças recorrentes, estado derivado do contato) como funções puras e testadas, sem I/O. Mudança de schema só acontece via migration numerada, aplicada e com types regenerados através do servidor MCP do Supabase. Row-level security habilitada em todas as tabelas, sob uma política deliberadamente simples para esta organização fechada de 2 pessoas.

**Evidence (Evidência).** O sistema cobre o ciclo operacional completo (estratégia, comercial, entrega, manutenção, financeiro, dashboard) ao longo de 19 migrations de schema e uma suíte de testes verde (regras de negócio e schemas de validação). Passou por três rodadas de refinamento conduzidas pelos sócios após a construção inicial, e por uma rodada dedicada de validação final (build + testes + checagens do advisor do Supabase + um smoke test manual contra um banco real, fora de produção) antes de ser entregue para uso diário pelos dois sócios.
