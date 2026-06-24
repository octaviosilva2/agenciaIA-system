# Índice da documentação — CRM DA Agência de IA

> Leia nesta ordem para entender o sistema antes de tocar no código.

---

## Leitura obrigatória antes de qualquer mudança

1. **[07-handover.md](07-handover.md)** — estado atual do projeto, o que funciona, padrões obrigatórios, como fazer mudanças com segurança e backlog. **Comece aqui.**
2. **[04-arquitetura.md](04-arquitetura.md)** — stack, estrutura de pastas, fluxo de dados, padrões de código.
3. **[06-design-system.md](06-design-system.md)** — tokens, receitas de classes, badges. **Leia antes de construir qualquer UI.** A referência visual viva está em [`frontend-teste/style-guide.html`](../frontend-teste/style-guide.html) (abrir no navegador).

---

## Documentação de domínio

| Arquivo | O que é | Quando ler |
|---|---|---|
| [01-produto.md](01-produto.md) | Visão geral, conceitos (Deal, Projeto, NCT), funil comercial, sidebar e fora de escopo | Antes de entender qualquer regra de negócio |
| [02-dados.md](02-dados.md) | Schema completo: todas as tabelas, colunas, enums, RLS e migrations 0001–0019 | Antes de qualquer mudança de banco ou query |
| [03-telas.md](03-telas.md) | Especificação funcional de cada rota/tela | Ao implementar ou alterar uma tela específica |
| [04-arquitetura.md](04-arquitetura.md) | Stack, estrutura de pastas, padrões obrigatórios, regras de teste | Antes de criar qualquer arquivo novo |
| [05-roteiro.md](05-roteiro.md) | Histórico das fases de execução (0–6 + ondas de ajuste) | Para entender a ordem em que as coisas foram construídas |
| [06-design-system.md](06-design-system.md) | Tokens HSL, tipografia, receitas Tailwind, badges de status | Antes de criar qualquer elemento visual |
| [07-handover.md](07-handover.md) | Estado atual real + como fazer mudanças (UI, lógica, schema) | **Ponto de entrada** para qualquer tarefa |

---

## Referência rápida

### Banco de dados
- **Projeto Supabase:** `czkcfhchsjtmmhtvethg`
- **Credenciais:** `.env.local` (pedir ao Octavio — não está no repositório)
- **Types gerados:** `lib/supabase/types.ts`
- **Próxima migration livre:** `0020`
- **Como aplicar migration:** MCP `supabase` → tool `apply_migration` → regenerar types (`generate_typescript_types`)
- **RLS:** `authenticated_all` em todas as tabelas — **não criar novas policies**

### Variáveis de ambiente necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=https://czkcfhchsjtmmhtvethg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do painel Supabase>
```

### Rodar o projeto
```bash
npm install
npm run dev -- --webpack   # --webpack é obrigatório (Turbopack crasha no Windows)
```

### Verificar saúde
```bash
npm test          # 59 testes (lib/rules/* + lib/validations/*)
npm run build     # 18 rotas dinâmicas, deve sair limpo
```

### Arquivos mais consultados

| Preciso de… | Arquivo |
|---|---|
| Label/cor de qualquer status | `lib/format.ts` |
| Calcular período ou data em Brasília | `lib/date-range.ts` |
| Transições válidas do funil | `lib/rules/deal-stage.ts` |
| Estado derivado de um contato | `lib/rules/contact-status.ts` |
| Gerar parcelas mensais | `lib/rules/recurrence.ts` |
| Types do banco | `lib/supabase/types.ts` |
| Navegar pelo menu | `components/app-sidebar.tsx` (constante `NAV_GROUPS`) |
| Badge de entidade | `components/entity-badge.tsx` |

---

## O que NÃO construir (fora de escopo — ver [01-produto.md](01-produto.md))

- Módulo de Marketing / CAC / lead sources estruturadas
- Metas e ciclos trimestrais
- Catálogo de serviços pré-cadastrados
- DRE, fluxo de caixa e aba de impostos (só alíquota em Config)
- Integração com gateway de pagamento, e-mail ou WhatsApp
- Multi-tenant, permissões por papel, auditoria avançada

Se surgir uma ideia nova, anotar no `.work/STATUS.md` (seção Backlog) — não implementar sem alinhamento com o Octavio.
