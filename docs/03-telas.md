# 03 — Telas

> Especificação funcional de cada tela. Rotas curtas, sem prefixo de grupo.
> **Filtro temporal padrão** (componente único reusado): `Todos · Hoje · Semanal · Mensal · Personalizado` via query params `?de=&ate=`. "Todos" é o default sempre.

## `/login`
E-mail + senha (Supabase Auth). Sem cadastro público, sem "esqueci a senha" por ora. Logado → redirect `/`.

## `/` — Dashboard

5 blocos fixos, cada um com link direto para o módulo. Cada bloco degrada de forma independente (erro em um não derruba os outros).

1. **Financeiro** — receita líquida do mês (bruta − alíquota) · total a receber · contas próximas de vencer
2. **Comercial** — negócios ativos por estágio · negócios parados há mais de `stale_deal_days` dias (sem mudança de estágio nem atividade)
3. **Operacional** — projetos em execução · projetos atrasados (due_date vencida) ou sem movimentação recente
4. **Tarefas de hoje** — tarefas vencendo hoje ou atrasadas, com ação direta (concluir na própria lista)
5. **NCT** — compromissos em risco (confiança baixa) · % geral de progresso das narrativas ativas

---

## GESTÃO

### `/estrategia`
5 blocos fixos em seções verticais. Cada bloco: título, **descrição fixa explicando o que é e pra que serve**, conteúdo, botão **editar** (único botão — sem criar, sem excluir).

| Bloco | Render |
|---|---|
| Missão | texto livre |
| Propósito | texto livre |
| SWOT | **matriz 2×2 visual** (Forças / Fraquezas / Oportunidades / Ameaças), não lista de campos |
| AS IS → TO BE | par lado a lado com seta, estado atual → desejado |
| Blueprint | 4 campos estruturados: Canais · Receita · Proposta de Valor · Segmentos |

### `/nct`
Tela única hierárquica (substitui ciclo/abas):

- **Topo:** filtro temporal (afeta métricas e check-ins exibidos)
- **3 cards de métrica** reagindo ao filtro: compromissos cumpridos · narrativas ativas · em risco (confiança baixa)
- **Narrativas** como faixas expansíveis (clique abre/fecha inline), com título, DRI, status e % médio dos compromissos
- **Compromissos** dentro da narrativa expandida. Cada linha: badge do tipo · nome · DRI · % progresso · ponto colorido de confiança · botão **Abrir**

Badges por tipo (cores fixas): `Think-It` índigo · `Build-It` âmbar · `Launch-It` verde · `Quantitativo` azul-cinza.
Confiança: alta = verde · média = âmbar · baixa = vermelho.
CRUD de narrativa e compromisso por dialog na própria tela.

### `/nct/[commitmentId]` — tela do Compromisso
- **Topo:** nome · badge do tipo · narrativa pai (link) · DRI · **% progresso editável inline** · confiança · descrição
- **Check-ins:** form (progress + confidence + comentário) + histórico em lista cronológica reversa
- **Tarefas vinculadas:** lista das tasks com `commitment_id` deste compromisso + botão criar tarefa já vinculada (são as MESMAS tarefas do módulo Tarefas, não duplicadas)

### `/tarefas`
Board por status (5 colunas: Analisar · To-do · Doing · Impedimento · Done) com drag & drop.

- Filtros: projeto · **compromisso NCT** (visão "por compromisso") · área · pessoa · prioridade
- Card: título · prioridade · responsável · vencimento · vínculos (projeto/compromisso) · impacto×esforço
- Criar/editar via dialog; campo opcional "vincular a compromisso"

---

## COMERCIAL

### `/contatos`
Tela única com toggle **`[≡ Lista] [⬛ Kanban]`** (preferência persiste na URL). Filtros valem nas duas visões:

- Busca por nome/empresa · filtro por estágio do funil · filtro temporal
- **Lista:** empresa · **estado derivado** (badge) · estágio do deal ativo · projeto ativo · última atividade
- **Kanban (pré-venda):** colunas = **Prospect → Lead → Diagnóstico → Oportunidade** (só esta fatia do funil). Cards dos deals ativos com drag entre estágios. Ao mover para **Oportunidade**, abre o modal que **cria o projeto** (nome + descrição) — sem projeto, a transição não acontece. O avanço a partir de Oportunidade (escopo → proposta → negociação → desfecho) acontece na tela **Oportunidades**, não aqui. Ações do card: **Perdido** (pede motivo) · **Reativar futuramente** · **Desqualificar** (só em Prospect/Lead).
- "+ Novo contato": form com origem em TEXTO LIVRE

### `/contatos/[id]` — perfil do contato
Header enxuto: nome · badge do estado derivado · origem. **Sem** "Novo negócio" aqui (o negócio nasce com o contato em Prospect; novos projetos vêm da tela Projetos).

Seções (blocos, layout organizado — evitar "monte de modal"):
1. **Dados do contato** — segmento/cidade, contato, telefone, e-mail, DRI, notas
2. **Projetos** — lista dos projetos do contato (cada um com estágio + valor + link para a tela do projeto). Manutenção, escopo, preço etc. ficam **dentro do projeto**, não aqui.
3. **Diagnósticos** — diagnósticos do contato (criar aqui)
4. **Interações** — timeline de `activities` + form rápido de nota

> Removido do perfil: "Negócio ativo", "Projeto vinculado", "Histórico de negócios" e "Manutenção" — tudo isso é responsabilidade da **tela do projeto**.

### `/oportunidades` → **Projetos** (rota mantida `/oportunidades` por ora; renomear para `/projetos` é tarefa do handoff)
Tela única **Projetos** do Comercial: todos os projetos por estágio. **Toggle `[≡ Lista] [⬛ Kanban]`** + filtros (busca, estágio, temporal).

- **Lista:** projeto · cliente (link p/ contato) · estágio comercial (badge) · valor · DRI.
- **Kanban (venda):** colunas ativas = **Oportunidade → Escopo → Proposta → Negociação** + colunas terminais **Fechado · Perdido · Reativar**. Card = **projeto** (nome do projeto + nome do contato) · valor · DRI. Drag avança o estágio. **Aqui o desfecho é permitido**: arrastar para uma terminal (ou usar o menu) → **Fechado** abre dialog **com/sem manutenção** (cria charge setup; projeto migra para Implementação) · **Perdido** (pede motivo) · **Reativar**. (Em Contatos as terminais são read-only; aqui não.)

Botão **"+ Novo projeto"**: seleciona contato existente + nome do projeto (+ valor + descrição) → cria deal já em `oportunidade` + projeto, de uma vez.

> **Visão futura (handoff):** "Projetos" deve ser a aba única que reúne projetos comerciais E de implementação; a **tela do projeto `/oportunidades/[id]`** é o detalhe canônico (preço, escopo, manutenção, implementação, prazos), compartilhado com o Operacional.

### `/oportunidades/[id]` — tela do projeto (foco comercial)
- Header: nome do projeto · contato (link) · estágio badge · valor · DRI · botão avançar estágio (escopo → proposta → negociação)
- **Escopo** — editor do `scope_items` (itens contratados) + texto livre
- **Proposta** — valor, condições, link de arquivo
- **Negociação** — notas e histórico (activities do deal)
- Rodapé: `Marcar como Perdido` (pede motivo) · `Reativar futuramente` · **`Fechar negócio`** → dialog "com ou sem manutenção?" → cria charge setup, projeto migra para Implementação; se com manutenção, leva ao form de contrato

### `/funil`
Relatórios puros (sem ações), baseados em `deal_stage_events`:
- Quantidade de contatos/deals por estágio (funil visual)
- Taxa de conversão entre estágios consecutivos
- Tempo médio em cada estágio
- Receita em pipeline (soma de estimated_value por estágio ativo)
- Filtro temporal no topo

---

## OPERACIONAL

### `/implementacao`
Kanban de projetos com deal **fechado**. Colunas fixas: `A iniciar · Briefing · Desenvolvimento · Revisão · Entregue`. Card: nome do projeto · cliente · DRI · prazo (vencido em vermelho). Drag muda `status` (grava evento). Clique abre a tela do projeto.

### `/implementacao/[id]` — tela do projeto (execução)
- Header: nome · cliente (link p/ contato) · DRI · badge do status
- **Barra de progresso** com etapas customizáveis (`custom_stages`): default = 5 padrão; usuário pode renomear/adicionar etapas específicas do projeto e marcar concluídas
- **Escopo contratado × entregue** — checklist `scope_items`: cada item com ✓ contratado e ✓ entregue
- **Tarefas vinculadas** — tasks com `project_id` deste projeto (espelho de Gestão > Tarefas filtrado) + criar tarefa já vinculada
- **Manutenção** — link para o contrato, se houver ativo
- **Histórico de fases** — `project_stage_events` (quando entrou em cada fase)

### `/manutencao`
Visão por contato/projeto com 3 estados:
- **Com manutenção** — contratos `mensal` ativos: cliente · projeto · valor mensal · contrato mínimo · início · próximo contato
- **Avulso** — contratos `avulso` (suporte pontual)
- **Sem manutenção** — projetos entregues sem contrato ativo (oportunidade de venda)

"+ Novo contrato": form com kind, valor mensal, **contrato mínimo (meses)**, dia de cobrança, data de início → ao salvar `mensal` ativo, **gera automaticamente as parcelas mensais em A Receber** pelo período do contrato mínimo.

---

## FINANCEIRO

### `/financeiro` — Visão Geral
- Filtro temporal no topo (varia o período dos cards)
- Cards: **Receita bruta · Impostos (alíquota aplicada) · Receita líquida · Total a receber · Total a pagar · Saldo estimado** (a receber − a pagar)
- Lista das próximas contas a vencer (receber + pagar juntas), **atrasadas em destaque**

### `/financeiro/contas` — Contas (tela unificada)
- Filtro `Todos · A Receber · A Pagar` + filtro temporal
- Linha: descrição · valor · vencimento · **origem** (projeto/contrato/manual — com link) · **checkbox recebido/pago** (marca direto na linha)
- Origens automáticas: projeto fechado → setup; manutenção ativa → recorrências
- "+ Nova conta": escolhe receber (kind `avulso`) ou pagar; entradas manuais

---

## SISTEMA

### `/config`
- **Equipe** — perfis (nome, e-mail, ativo)
- **Imposto** — campo único `Alíquota (%)` (org_settings.tax_rate), aplicado em toda a tela de Contas e Visão Geral
- **Parâmetros** — `stale_deal_days` (dias para negócio parado no Dashboard)
