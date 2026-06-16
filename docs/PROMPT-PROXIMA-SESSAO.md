# Prompt para a próxima sessão (CRM da Agência) — Fase 3 (Operacional)

Você vai **continuar** o CRM interno (Next.js 16 + Tailwind v4 + shadcn/base-ui + Supabase). A **Fase 2 (Comercial) está COMPLETA**. Agora é a **Fase 3 (Operacional)**. **Não comece do zero. Não refaça o que já funciona.**

## Leia primeiro (fonte da verdade, nesta ordem)
1. `.work/STATUS.md` — estado atual e débito técnico (comece por ele).
2. `docs/07-handover.md`, `docs/01-produto.md`, `docs/02-dados.md`, `docs/03-telas.md`, `docs/04-arquitetura.md`, `docs/05-roteiro.md`.
3. `docs/06-design-system.md` + `frontend-teste/style-guide.html` (verdade visual). **Nenhuma UI nasce fora do design system.** Cor/medida/label saem de `lib/format.ts`.
4. Memória do projeto (auto-carregada): [[projetos-vs-implementacao]], [[cursor-pointer-clicaveis]], [[sem-dri-responsavel]].

## Regras de trabalho (obrigatórias)
- **UI-first**: monte a UI seguindo o design system, valide com o Octavio em mini-gate, só então ligue o backend. **Pare nos gates.**
- Padrão de dados: página = Server Component → `lib/queries/*` → componentes client; mutação = Server Action (`lib/actions/*`) com zod → regra (`lib/rules/*`) → Supabase server client → `revalidatePath`. Forms com `useActionState` ou estado local + `router.refresh()`.
- Todo clicável tem `cursor: pointer`. Toda lista tem empty state. Toda mutação tem toast.
- Schema só muda via **migration nova versionada** (próxima é `0008`). RLS `authenticated_all` (2 sócios). Após criar tabela/coluna, **regenerar `lib/supabase/types.ts`** (MCP Supabase).
- Código/variáveis em inglês, comentários e UI em PT-BR. Nunca commitar secrets.
- Ao fim de cada bloco: `npm run build` limpo + `npm test` verde + atualizar `.work/STATUS.md`.
- **Antes de qualquer ação ambígua, pergunte.** O Octavio decide navegação e regras de produto.

## Estado em uma frase
Funil comercial completo + `/funil` (relatórios). Tela do projeto rica (Proposta→Pagamento ao fechar, Escopo, Implementação com prazo/entrega + contador de dias, Manutenção com contrato e parcelas recorrentes linkadas). Operacional (`/implementacao`, `/manutencao`) é recorte read-only; **as telas de detalhe operacional ainda não existem de verdade** — é o foco da Fase 3.

## Tarefas (seguir a ordem das fases — `docs/05-roteiro.md`)

### 1. `/implementacao/[id]` — tela operacional do projeto (hoje placeholder)
Organização por **tarefas** (`tasks`) num **kanban por `task_status`** (`analisar` · `todo` · `doing` · `impedimento` · `done` — labels/cores já em `lib/format.ts` `TASK_STATUS`). Mostrar **% concluído** do projeto (tarefas done / total, ou as `custom_stages`), prazo de entrega (com o `deliveryCountdown` já existente) e as etapas internas (`custom_stages`). O card da lista de Implementação já aponta para `/implementacao/[projectId]`. Marcar o projeto como concluído aqui deve refletir como na tela do projeto (`updateProjectStatus` já existe e grava `project_stage_events`). CRUD de tarefas (criar/editar/mover de coluna/excluir) via Server Actions.

### 2. Tela de Manutenção com tarefas (pedido explícito do Octavio)
"Uma tela só para manutenção onde colocamos as tarefas que vamos fazer — tipo *dar uma olhada*, *entrar em contato*, *pedir ok* — e dá pra ver clicando na manutenção **ou** por dentro do projeto."
- **Decisões já tomadas:** usar a tabela **`tasks`** (mesma do item 1, com kanban por `task_status`). Tarefas **avulsas, com opção de configurar recorrentes** (começar avulso; recorrência é um a-mais).
- **Navegação:** tela própria por contrato (sugestão de rota `/manutencao/[contractId]`), acessível pelo **card do board `/manutencao`** e por um **link/atalho no bloco Manutenção da tela do projeto** (`MaintenanceEditor`). Validar a rota com o Octavio no começo.
- **Migration `0008` (provável):** `tasks` hoje **não** tem `contract_id` nem recorrência. Adicionar `contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL` (tarefa de manutenção = vinculada ao contrato; tarefa de implementação = só `project_id`). Para recorrência configurável, modelar com cuidado (ex.: `recurrence_days int` simples, ou tabela de template) — **propor a modelagem antes de aplicar** (story/spec + gate). `task_area` da manutenção = `operacional`.
- Reaproveitar o kanban de tarefas do item 1 (mesmo componente), filtrando por `contract_id`.

### 3. Revisar os boards `/implementacao` e `/manutencao` (recortes) conforme a Fase 3
Garantir que os cards levam às telas de detalhe certas e que os dados batem.

### Depois
Fases 4 (Financeiro: contas a receber/pagar — as `charges` de pagamento/manutenção já alimentam), 5 (NCT + Estratégia), 6 (Dashboard + Config) — ver `docs/05-roteiro.md`.

## Decisões de produto já tomadas (não reabrir sem motivo)
- **Sem DRI/responsável** em projeto nem contato — "todos somos responsáveis". Removido de toda a UI; `owner_id` fica no banco sem uso. **Não recriar.** (memória [[sem-dri-responsavel]])
- A aba **Projetos** mostra o funil comercial completo, **incluindo fechados**. **Implementação é tela separada** (operacional); seu card abre `/implementacao/[projectId]`. (memória [[projetos-vs-implementacao]])
- Tela do projeto: **Proposta** até fechar; ao fechar vira **Pagamento** (à vista/parcelado → cobranças). **Manutenção**: contrato mensal gera parcelas recorrentes linkadas (`MaintenanceEditor`). Sem Prazos/Negociação ali.
- **Valor exibido nos boards** = `total_value` (proposta) → `estimated_value` → **soma das cobranças de pagamento**. Não inventar outra fonte de valor.
- **Prazo de entrega** mostra contador de dias (`deliveryCountdown`).
- Filtros de estágio: Contatos = pré-venda; Projetos = funil comercial.

## Banco
Projeto Supabase aplicado (use o MCP). Migrations 0001–0007 aplicadas; a próxima é **0008**. Dados de teste criados pela UI ("Moda em Foco (TESTE)", "Sistema Comercial IA" etc.). Crie/edite pela UI para popular os boards.
