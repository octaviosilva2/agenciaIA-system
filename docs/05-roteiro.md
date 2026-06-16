# 05 — Roteiro de Execução

> Ordem de construção em 7 fases. Cada fase termina com: `npm run build` limpo, `npm test` verde, commit com mensagem `feat(fase-N): ...`, e `.work/STATUS.md` atualizado (fase, o que foi feito, pendências).
> **GATE = parar e esperar aprovação humana antes de continuar.**

## Visão geral

| Fase | Entrega | Gate | Status |
|---|---|---|---|
| 0 | Fundação: app, auth, layout, sidebar | — | ✅ Concluída |
| 1 | Banco completo: migrations + types + rules puras testadas | **GATE** | ✅ Concluída e aprovada |
| 2 | Comercial: contatos, perfil, funil de deals, oportunidades | **GATE** | ⬜ Próxima (começa na etapa 2.0) |
| 3 | Operacional: implementação + manutenção | — | ⬜ |
| 4 | Financeiro: contas unificada + visão geral + sincronizações | **GATE** | ⬜ |
| 5 | Gestão: estratégia + NCT + tarefas | — | ⬜ |
| 6 | Dashboard + página Funil + polimento | **GATE final** | ⬜ |

A ordem é deliberada: o Comercial é o coração e destrava Operacional; Financeiro depende dos dois; NCT/Tarefas é independente; Dashboard e Funil são agregadores e vêm por último, quando todos os dados existem.

O estado detalhado do que já foi entregue nas Fases 0 e 1 (e o que NÃO deve ser refeito) está em [`07-handover.md`](07-handover.md).

---

## Fluxo UI-first (obrigatório da Fase 2 em diante)

O estilo visual aprovado do sistema está em [`06-design-system.md`](06-design-system.md), com a referência viva em `frontend-teste/style-guide.html`. A partir da Fase 2, **cada área/tela nova segue este ciclo, nesta ordem**:

1. **UI primeiro** — montar a(s) tela(s) completas com dados mock/estáticos, seguindo os tokens, receitas e badges do design system. Cor, medida, tipografia e label **não se inventam**; labels e cores de status saem de `lib/format.ts`.
2. **Validação visual (mini-gate)** — mostrar a tela ao humano e esperar aprovação do visual/UX **antes** de qualquer persistência.
3. **Backend depois** — queries (`lib/queries/`), server actions, integração Supabase e uso das regras (`lib/rules/`) só entram após o visual aprovado. Substituir o mock pelos dados reais **sem alterar o layout aprovado**.
4. **Testes e aceite** — testes das regras/validações novas + build limpo fecham a área.

Os GATEs de fase do roteiro continuam valendo por cima desses mini-gates visuais.

---

## Fase 0 — Fundação
1. `create-next-app` (TS, Tailwind, App Router) na raiz + shadcn/ui + dnd-kit + zod + date-fns + Vitest configurado
2. Git init, `.gitignore` com `.env*`, primeiro commit
3. Clients Supabase (`@supabase/ssr`: server, client, middleware) — pedir URL/anon key ao humano
4. `/login` funcional + middleware protegendo `(dashboard)`
5. Layout do dashboard com sidebar completa (`NAV_GROUPS` conforme `01-produto.md`) — itens apontando para páginas placeholder
6. `period-filter.tsx` + `lib/format.ts` base + `ActionState`

**Aceite:** login funciona com usuário real; sidebar navega para todas as rotas (placeholders); build e testes verdes.

## Fase 1 — Dados e regras
1. Migrations 0001–0007 conforme `02-dados.md` (enums, tabelas, CHECKs, UNIQUE de recorrência, RLS, seeds de strategy_blocks e org_settings, índices)
2. Aplicar via MCP no Supabase novo; `generate_typescript_types` → `lib/supabase/types.ts`
3. Zod schemas de todas as entidades em `lib/validations/`
4. `lib/rules/` completo e TESTADO: deal-stage, contact-status, recurrence, net-revenue (testes conforme `04-arquitetura.md` §Testes)
5. Rodar `get_advisors` (security) — só os warnings `always_true` esperados

**Aceite:** banco espelha `02-dados.md`; regras puras com testes cobrindo os casos da spec.
**GATE:** humano revisa schema aplicado + resultados dos testes.

## Fase 2 — Comercial

> Cada item de tela abaixo segue o **fluxo UI-first** (UI mock → validação visual → backend → testes).

0. **Etapa 2.0 — Alinhamento visual da fundação** (uma vez, antes de qualquer tela nova):
   - Aplicar em `app/globals.css` os tokens HSL do design system (§3 de `06-design-system.md`) — hoje estão os defaults do shadcn (oklch, fundo branco)
   - Trocar fontes para **Inter** (texto) + **JetBrains Mono** (números/código) em `app/layout.tsx` — hoje são Geist/Geist Mono
   - Refatorar `lib/format.ts` para o formato `{ label, className }` por enum, com os tons claro+escuro do §6.2 (funil em escala slate; "Done" → "Concluída"; "Reativar Futuramente" → "Reativar") — **sem tocar nas regras de `lib/rules/` nem nos zod schemas**
   - Criar o componente `EntityBadge` (§7) e alinhar sidebar/header/login ao `style-guide.html`
   - Aceite: app existente renderiza idêntico ao style guide (tema claro); build e testes verdes
1. `/contatos` lista + filtros + "+ Novo contato" (origem texto livre)
2. Estado derivado integrado na lista (badge)
3. `/contatos` kanban (dnd-kit) com transições validadas: modal de projeto ao mover p/ oportunidade, motivo ao perder, dialog manutenção ao fechar, eventos de estágio gravados
4. `/contatos/[id]` perfil completo (6 seções de `03-telas.md`, incluindo Diagnóstico e Interações)
5. `/oportunidades` tabela + "+ Nova oportunidade" (cria deal+projeto juntos)
6. `/oportunidades/[id]` tela comercial do projeto (escopo, proposta, negociação, ações de desfecho)

**Aceite:** ciclo comercial completo manualmente testável: criar contato → deal → avançar até oportunidade (cria projeto) → escopo/proposta/negociação → fechar com/sem manutenção, perder ou reativar. Estado derivado muda corretamente em cada passo.
**GATE:** humano valida o fluxo na tela.

## Fase 3 — Operacional
1. `/implementacao` kanban (só deals fechados) + eventos de fase
2. `/implementacao/[id]`: barra de etapas customizáveis, escopo contratado×entregue, tarefas vinculadas, histórico de fases, link manutenção
3. `/manutencao`: 3 estados (com/avulso/sem) + form de contrato com min_months
4. Geração automática de parcelas ao ativar contrato mensal (usa `lib/rules/recurrence`)

**Aceite:** fechar negócio → projeto aparece em Implementação; criar contrato → N parcelas aparecem em charges; projeto entregue sem contrato aparece em "Sem manutenção".

## Fase 4 — Financeiro
1. `/financeiro/contas`: tela unificada (Todos/A Receber/A Pagar + temporal), checkbox pago/recebido inline, origem com link, "+ Nova conta" (receber avulso / pagar)
2. `/financeiro` Visão Geral: 6 cards com alíquota aplicada + próximas a vencer
3. `/config`: equipe + alíquota + stale_deal_days

**Aceite:** charge setup do fechamento e recorrências do contrato aparecem com origem correta; receita líquida reflete a alíquota; marcar pago atualiza tudo.
**GATE:** humano valida números com um cenário completo (fechar 1 negócio com manutenção e conferir Contas + Visão Geral).

## Fase 5 — Gestão
1. `/estrategia`: 5 blocos fixos (SWOT como matriz 2×2), só edição
2. `/nct`: tela hierárquica (cards de métrica + filtro temporal + narrativas expansíveis + compromissos com badges)
3. `/nct/[commitmentId]`: header editável, check-ins, tarefas vinculadas
4. `/tarefas`: board 5 colunas com drag + filtros (projeto/compromisso/área/pessoa)

**Aceite:** criar narrativa → compromissos dos 4 tipos → check-in atualiza progress/confidence → tarefas vinculadas aparecem no compromisso e no board com filtro "por compromisso".

## Fase 6 — Agregadores e polimento
1. `/` Dashboard: 5 blocos com degradação independente e links
2. `/funil`: 4 relatórios sobre `deal_stage_events` + temporal
3. Passada de consistência: badges/labels uniformes, empty states, atrasos em vermelho, revisar `isActive` da sidebar
4. Suíte completa + build final; `get_advisors` security e performance

**Aceite:** Dashboard responde "o que precisa da minha atenção" com dados reais dos módulos; funil mostra conversão e tempo médio.
**GATE final:** humano aprova o sistema inteiro.

---

## Regras permanentes do executor

- Toda UI nasce de `docs/06-design-system.md` + `frontend-teste/style-guide.html`, seguindo o fluxo UI-first (UI mock → validação visual → backend). Nunca inventar cor, medida ou label.
- Nunca refazer o que as Fases 0–1 já entregaram (ver `07-handover.md`) — banco, rules, validations e auth estão prontos e testados.
- Nunca avançar de fase com build/teste quebrado ou gate pendente.
- Nunca mudar schema fora de migration versionada.
- Escopo é o dos documentos `01–04`. Ideia nova → anotar em `.work/STATUS.md` seção "Backlog", não implementar.
- Ambiguidade real → perguntar ao humano antes de codar.
- Commits pequenos por fase; mensagens `feat(fase-N): descrição`.
