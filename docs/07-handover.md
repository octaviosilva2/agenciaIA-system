# 07 — Handover (estado atual e continuidade)

> **Leia este documento antes de qualquer coisa.** Ele registra o que existe, como tudo funciona e como fazer mudanças com segurança.

---

## 1. Estado do projeto

**O sistema está completo.** Todas as fases do roteiro (0–6) foram concluídas, incluindo 3 ondas de ajustes e validação final.

| Fase | Entrega | Status |
|---|---|---|
| 0 | Fundação: app, auth, layout, sidebar | ✅ |
| 1 | Banco: migrations 0001–0007 + regras puras testadas | ✅ |
| 2 | Comercial: contatos, projetos, funil | ✅ |
| 3 | Operacional: implementação + manutenção + arquivar/excluir | ✅ |
| 4 | Financeiro: contas + visão geral + config | ✅ |
| 5 | Gestão: estratégia + NCT + tarefas board | ✅ |
| 6 | Dashboard + funil + polimento | ✅ |
| Ajustes Onda 1 | Quick wins (A1–A11) | ✅ |
| Ajustes Onda 2 | Tarefas, datas, financeiro (B1–B8) | ✅ |
| Ajustes Onda 3 | Projeto/fechamento/implementação/manutenção (C1–C6) | ✅ |
| Validação final | Build + testes + advisors + smoke E2E | ✅ |

**Migrations aplicadas:** 0001–0019 (próxima livre = **0020**).
**Build:** 18 rotas dinâmicas, limpo.
**Testes:** 59 verdes (`npm test`).
**Banco:** projeto Supabase `czkcfhchsjtmmhtvethg`. RLS `authenticated_all` em todas as tabelas.

---

## 2. O que existe e funciona — não refazer

### Comercial
- **`/contatos`**: lista + kanban (dnd-kit). Colunas pré-venda: Prospect → Lead → Diagnóstico → Oportunidade + terminais Desqualificado/Reativar. Criar contato já abre deal em Prospect. Busca e toggle Ativos/Arquivados só na lista. Múltiplos contatos por empresa (tabela `company_contacts`).
- **`/contatos/[id]`**: perfil com Dados · Projetos · Diagnósticos · Interações. Header mostra estágio do deal mais recente.
- **`/projetos`**: funil comercial completo (kanban/lista), Oportunidade → Negociação + terminais. Fechados continuam visíveis. "Fechar negócio" é um wizard (implementação: valor/parcelas/método; manutenção: mensal/avulsa/nenhuma).
- **`/projetos/[id]`**: tela do projeto com PropEditor, EscopoEditor, blocos de Implementação (prazo + DeliveryControls) e Manutenção (MaintenanceEditor com parcelas).
- **`/funil`**: relatórios sobre `deal_stage_events` com filtro temporal (KPIs, barras de conversão, win rate).

### Operacional
- **`/implementacao`**: board dos projetos fechados por `project_status`. Link → `/implementacao/[id]`.
- **`/implementacao/[id]`**: kanban de tarefas reais (`project_id`), escopo, etapas, prazo, marcar entregue/reabrir. Backend real (`lib/queries/implementation-detail.ts`, `lib/actions/tasks-impl.ts`).
- **`/manutencao`**: board de contratos ativos, ordenado por `next_contact_date`. Link → `/manutencao/[contractId]`.
- **`/manutencao/[contractId]`**: cobrança editável, kanban de tarefas de manutenção (com recorrência mensal), seção de relacionamento ("Contato dado" avança `next_contact_date`).

### Financeiro
- **`/financeiro/contas`**: abas A Receber · A Pagar · Receita · Despesa. Sub-filtros por tipo/categoria. Checkbox de pago inline. "+ Nova conta" (avulso/pagar).
- **`/financeiro`**: 6 cards (bruta, impostos, líquida, a receber, a pagar, saldo) + barras de previsão com imposto+taxa estimados.
- **`/config`**: Perfil, Equipe, Financeiro (alíquota + taxa maquininha), CRM (dias stale), Aparência, Segurança.

### Gestão
- **`/estrategia`**: 5 blocos fixos (SWOT 2×2, AS IS→TO BE, Blueprint, Missão, Propósito). Só edição.
- **`/nct`**: narrativas expansíveis + compromissos com badge tipo + ponto de confiança. CRUD por dialog.
- **`/nct/[commitmentId]`**: detalhe com % editável inline, check-ins, tarefas vinculadas.
- **`/tarefas`**: board 5 colunas com drag, filtros (projeto/compromisso/área/pessoa/prioridade), coluna Concluída com line-through + máx. 5 + "Ver todos".

### Dashboard
- **`/`**: 5 blocos (Financeiro, Comercial, Operacional, Tarefas de hoje, NCT). Cada bloco tem `try/catch` independente — falha degrada sozinho sem derrubar os outros.

---

## 3. Arquitetura e padrões obrigatórios

### Fluxo de dados
```
page.tsx (Server Component)
  → lib/queries/dominio.ts       ← lê do Supabase
  → ClientComponent.tsx          ← recebe dados via props
      → lib/actions/dominio.ts   ← mutação (Server Action)
          → zod validate
          → lib/rules/*.ts       ← lógica pura (sem I/O)
          → supabase server client
          → revalidatePath(...)
```

### Padrões que não devem ser quebrados

- **`ActionState`** para todos os forms com `useActionState` — tipo em `lib/actions/action-state.ts`.
- **Labels e cores** de status sempre de `lib/format.ts` (nunca string solta ou cor inline).
- **Datas** sempre com `lib/date-range.ts` — fuso Brasília, semana segunda→domingo, `parseDateOnly` sem deslocar.
- **Enums** do banco espelham os schemas Zod em `lib/validations/` — fonte da verdade.
- **Idempotência de parcelas**: UNIQUE `(contract_id, due_date)` em `charges` (contratos mensais usam `upsert`; avulsos/setup têm `contract_id = null` e não são idempotentes).
- **Nunca RLS manual** — policy `authenticated_all` já está em todas as tabelas; não criar, não duplicar.
- **Schema só via migration** em `supabase/migrations/` + regenerar `lib/supabase/types.ts` depois.

### Arquivos-chave por responsabilidade

| Responsabilidade | Arquivo |
|---|---|
| Labels PT-BR e cores de status | `lib/format.ts` |
| Helpers de data e período | `lib/date-range.ts` |
| Transições válidas do funil | `lib/rules/deal-stage.ts` |
| Estado derivado do contato | `lib/rules/contact-status.ts` |
| Geração de parcelas mensais | `lib/rules/recurrence.ts` |
| Próxima data de tarefa recorrente | `lib/rules/task-recurrence.ts` |
| Métricas do funil | `lib/rules/funnel-metrics.ts` |
| Receita líquida | `lib/rules/net-revenue.ts` |
| Clients Supabase (server/client/middleware) | `lib/supabase/` |
| Types gerados do banco | `lib/supabase/types.ts` |
| Sidebar (NAV_GROUPS) | `components/app-sidebar.tsx` |
| Filtro temporal global | `components/period-filter.tsx` |
| Badge de qualquer entidade | `components/entity-badge.tsx` |
| Avatar de iniciais | `components/ui-shared/initials-avatar.tsx` |
| Overflow da coluna Concluída | `components/tasks/done-column-overflow.tsx` |
| Kanban compartilhado (impl + manutenção) | `components/tasks/tasks-kanban.tsx` |

---

## 4. Design system

**Fonte da verdade visual:** `frontend-teste/style-guide.html` (abrir no navegador — tem tema claro e escuro).

Manual completo: `docs/06-design-system.md`.

Regra absoluta: **nenhum botão, badge, input, cor ou medida é inventado**. Tudo sai dos tokens e receitas do design system. Se o `.md` e o `.html` divergirem, o `.html` vence.

---

## 5. Automações do banco (todas em server actions — sem triggers, sem cron)

| Gatilho | Efeito |
|---|---|
| Mudança de `deal.stage` | Grava `deal_stage_events` |
| Deal → `oportunidade` | Exige criar projeto (nome obrigatório no modal) |
| Deal → `perdido` | Exige `lost_reason` |
| Deal → `desqualificado` | Só de `prospect` ou `lead` |
| Deal → `fechado` | Wizard completo: cria parcelas de pagamento (`charges` kind `setup`) + contrato de manutenção opcional; sincroniza `total_value` com a soma das parcelas |
| Contrato `mensal` ativado/reconfigurado | Gera `min_months` parcelas `recorrencia` em `charges`; idempotente por `(contract_id, due_date)` via upsert; preserva parcelas pagas |
| Mudança de `project.status` | Grava `project_stage_events` |
| Check-in NCT registrado | Atualiza `progress`/`confidence` no `commitment` |
| `charges` com método=Cartão marcada como paga | Materializa taxa de maquininha como conta a pagar (`variavel`) linkada por `source_charge_id` |
| `charges` paga com alíquota > 0 | Materializa imposto como conta a pagar (`imposto`) linkada por `source_charge_id` |
| Tarefa mensal de manutenção concluída | Gera automaticamente a próxima ocorrência (status `todo`, vencimento no próximo `recurrence_day`) |
| "Contato dado" em manutenção | Registra interação + avança `next_contact_date` pela `contact_frequency_days` |

---

## 6. Como fazer mudanças

### Mudança de UI (sem schema)
1. Ler `docs/06-design-system.md` e abrir `frontend-teste/style-guide.html`.
2. Labels/cores: sempre via `lib/format.ts`.
3. Padrão: Server Component → query → client component.
4. `npm run build` + `npm test` verdes antes de commitar.

### Mudança de lógica de negócio
1. A lógica pura vai em `lib/rules/` (sem I/O).
2. Cobrir com teste em `__tests__/rules/`.
3. Action chama a regra; page não chama regra diretamente.

### Mudança de schema (nova coluna, tabela ou enum)
1. Criar migration em `supabase/migrations/` com o próximo número em sequência (atualmente **0020**).
2. Aplicar via MCP `supabase` (tool `apply_migration`).
3. Regenerar types: MCP `supabase` → `generate_typescript_types` → salvar em `lib/supabase/types.ts`.
4. **Nunca** criar ou duplicar policy RLS — `authenticated_all` já cobre tudo.
5. Migrations destrutivas (recreate de enum, drop column): seguir o padrão expand-then-contract em múltiplas migrations.

### Adicionar nova rota
1. Criar pasta em `app/(dashboard)/nova-rota/`.
2. `page.tsx` = Server Component que chama query → passa para client component.
3. Adicionar à constante `NAV_GROUPS` em `components/app-sidebar.tsx` se for item de menu.

---

## 7. Segurança e ambiente

- `.env.local` é gitignored — nunca commitar.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são as únicas vars de ambiente necessárias.
- Service role key **nunca** no client, **nunca** commitada.
- Middleware (`/middleware.ts`) protege todo o grupo `(dashboard)`; `/login` é a única rota pública.
- Sem signup público — usuários criados no painel Supabase Auth.
- Pendência de configuração (fora do código): habilitar *Leaked Password Protection* no painel Supabase Auth.

---

## 8. Backlog / pendências conhecidas

- Aviso de build `middleware→proxy` (deprecação Next 16) — fora de escopo, não crítico.
- `dev.log` no `.gitignore` (ignorado localmente).

Detalhes de cada entrega: `.work/STATUS.md`.
