# CRM — DA Agência de IA

CRM interno da agência. Gerencia o ciclo completo: estratégia (NCT), comercial (contatos → projetos → fechamento), operacional (implementação + manutenção) e financeiro (contas a receber/pagar).

**Stack:** Next.js 15+ (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth)

---

## Pré-requisitos

- Node.js 18+
- Acesso ao projeto Supabase `czkcfhchsjtmmhtvethg` (peça as credenciais ao Octavio)

## Setup

```bash
npm install
```

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://czkcfhchsjtmmhtvethg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

O banco já está aplicado com todas as migrations (0001–0019). **Não reaplicar migrations, não criar projeto novo.**

## Rodar

```bash
npm run dev -- --webpack
```

> Usar `--webpack` é obrigatório. Turbopack crasha o worker de static paths no Windows.

Acesse `http://localhost:3000`. O login usa e-mail/senha via Supabase Auth (sem cadastro público — usuário criado no painel).

## Testes e build

```bash
npm test          # 59 testes (lib/rules/* + lib/validations/*)
npm run build     # deve sair limpo (18 rotas)
```

---

## Documentação

| Arquivo | O que é |
|---|---|
| `docs/01-produto.md` | Visão geral, conceitos, funil, fora de escopo |
| `docs/02-dados.md` | Schema completo do banco (tabelas, enums, RLS) |
| `docs/03-telas.md` | Especificação funcional de cada tela |
| `docs/04-arquitetura.md` | Stack, estrutura de pastas, padrões obrigatórios |
| `docs/05-roteiro.md` | Roteiro de fases (histórico de execução) |
| `docs/06-design-system.md` | Tokens, receitas de classes, badges — **leia antes de construir qualquer UI** |
| `docs/07-handover.md` | **Estado atual do projeto + como fazer mudanças** |
| `.work/STATUS.md` | Log detalhado de tudo que foi entregue |
| `frontend-teste/style-guide.html` | Referência visual viva do design system (abrir no navegador) |

---

## Estrutura de pastas (resumo)

```
app/(dashboard)/          # rotas autenticadas
components/               # componentes React por domínio
lib/
  actions/                # Server Actions (mutações)
  queries/                # leituras do banco por domínio
  rules/                  # lógica de negócio pura (testada)
  validations/            # schemas Zod por entidade
  supabase/               # clients SSR (server.ts, client.ts, middleware.ts)
  format.ts               # labels PT-BR e cores de status
  date-range.ts           # utilitários de período (fuso Brasília)
supabase/migrations/      # migrations versionadas 0001–0019
__tests__/                # testes das regras puras
docs/                     # documentação do projeto
.work/                    # status e planos de execução
```

---

## Regras rápidas para contribuir

- **Padrão de dados:** `page = Server Component → lib/queries/* → client component`; mutação = Server Action com zod → `lib/rules/*` → Supabase → `revalidatePath`.
- **Nunca** criar RLS policy (já aplicada via `authenticated_all` em todas as tabelas).
- **Nunca** alterar schema sem migration nova em `supabase/migrations/` + regenerar `lib/supabase/types.ts`.
- **Labels e cores** saem SEMPRE de `lib/format.ts` — nunca string solta na UI.
- Código e variáveis em inglês; comentários e UI em PT-BR.
- Após qualquer mudança de schema: `generate_typescript_types` via MCP `supabase`.
- Build e testes verdes antes de commitar.

Detalhes completos em `docs/07-handover.md` e `docs/04-arquitetura.md`.
