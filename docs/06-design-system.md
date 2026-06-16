# 06 — Design System (manual de construção do frontend)

> **LEIA ANTES de construir qualquer UI.** Este é o estilo de design **total e aprovado** do CRM — vale para todas as telas.
> Cor, medida, tipografia, badge e elemento **saem daqui — não se inventa nada**. A implementação em React/shadcn é com você (use suas skills); o visual é fixo.

---

## 0. Como usar este guia

1. **Abra a referência viva no navegador:** [`frontend-teste/style-guide.html`](../frontend-teste/style-guide.html). Ela mostra TODOS os elementos nos temas **claro e escuro** (botão no topo direito). É a verdade visual — se este `.md` e o `.html` divergirem, o `.html` vence.
2. **Siga as receitas de classes** deste documento ao montar cada elemento. As classes Tailwind aqui são as mesmas do HTML.
3. **Fonte única de cor/rótulo de dados:** [`lib/format.ts`](#7-libformatts--fonte-única-de-labels-e-cores). Nenhum label PT-BR ou cor de status fica solto na UI — sempre via `format.ts`.
4. **Skills que apoiam esta construção:** `design-system-tailwind` (tokens e consistência), `componentes-react` (composição/estado), `formularios-validacao` (form + zod), `data-fetching` (server→client), `acessibilidade-a11y` (foco, contraste, teclado).

---

## 1. Princípios (inegociáveis)

| Princípio | O que significa na prática |
|---|---|
| **Data-dense, não marketing** | Ferramenta de produtividade: denso, escaneável, informação na frente. Sem hero, sem ilustração decorativa. |
| **Base neutra (zinc)** | A interface é cinza. A ação primária é **preto** (claro) / **branco** (escuro). **Nunca azul** como cor de marca. |
| **Cor = significado** | Verde/âmbar/vermelho e os badges carregam status. Cor **nunca** é enfeite. Todo badge tem texto (nunca cor pura). |
| **Sóbrio + moderno** | Micro-interações sutis (150ms), hierarquia por **espaço e peso**, não por cor. Sem ornamento (glass, gradiente, sombra dramática). |

---

## 2. Stack visual e setup

- **Tailwind CSS v4 + shadcn/ui**, tema base **zinc**.
- **Dark mode por classe** (`darkMode: 'class'`) — alterna a classe `.dark` no `<html>`. As cores trocam só pelos **tokens semânticos** (CSS vars); componentes não usam `dark:` no chrome. Exceção: os **badges de status** têm variante `dark:` própria (ver §6.2).
- **Tokens já compatíveis com dark desde o início**; o toggle visível entra na fase de polimento (decisão travada).
- Fontes: **Inter** (texto) e **JetBrains Mono** (números/código/IDs).
- Números em colunas usam `tabular-nums`. Moeda `R$ pt-BR`, datas `dd/MM/yyyy`, atrasos em vermelho.

---

## 3. Tokens de cor (semânticos)

Defina como CSS vars em `globals.css` e mapeie no `tailwind.config`. Valores HSL (sem vírgula, `H S% L%`):

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `background` | fundo da app | `240 5% 96%` | `240 10% 4%` |
| `card` | superfícies/cards | `0 0% 100%` | `240 6% 10%` |
| `foreground` | texto principal | `240 6% 10%` | `0 0% 98%` |
| `muted` | fundo sutil/skeleton | `240 5% 94%` | `240 4% 16%` |
| `muted-foreground` | texto secundário | `240 4% 46%` | `240 5% 65%` |
| `border` | bordas e divisores | `240 6% 90%` | `240 4% 16%` |
| `ring` | anel de foco | `240 5% 65%` | `240 5% 45%` |
| `accent` | hover de superfície | `240 5% 94%` | `240 4% 16%` |
| `primary` | ação primária (fundo) | `240 6% 10%` | `0 0% 98%` |
| `primary-foreground` | texto sobre primary | `0 0% 98%` | `240 6% 10%` |

```css
/* globals.css */
:root { --background: 240 5% 96%; --card: 0 0% 100%; --foreground: 240 6% 10%;
        --muted: 240 5% 94%; --muted-foreground: 240 4% 46%; --border: 240 6% 90%;
        --ring: 240 5% 65%; --accent: 240 5% 94%; --primary: 240 6% 10%; --primary-foreground: 0 0% 98%; }
.dark { --background: 240 10% 4%; --card: 240 6% 10%; --foreground: 0 0% 98%;
        --muted: 240 4% 16%; --muted-foreground: 240 5% 65%; --border: 240 4% 16%;
        --ring: 240 5% 45%; --accent: 240 4% 16%; --primary: 0 0% 98%; --primary-foreground: 240 6% 10%; }
```

**Cores de status** (verde/âmbar/vermelho/azul/índigo) e a **escala slate** do funil saem das paletas do Tailwind — não viram token semântico. Vivem nos badges via `format.ts` (§6.2).

---

## 4. Tipografia, espaçamento, raio, sombra

**Tipografia** (escala compacta):

| Papel | Tamanho · peso | Classe |
|---|---|---|
| Display / KPI | 30px · 600 | `text-3xl font-semibold tracking-tight` |
| H1 | 24px · 600 | `text-2xl font-semibold tracking-tight` |
| H2 (título de página) | 18px · 600 | `text-lg font-semibold` |
| H3 (título de seção) | 16px · 600 | `text-base font-semibold` |
| Body | 14px · 400 | `text-sm` |
| Body-sm / auxiliar | 13px · 400 | `text-[13px]` |
| Caption | 12px · 400 | `text-xs text-muted-foreground` |
| Overline / rótulo | 11px · 500 upper | `text-[11px] font-medium uppercase tracking-wide text-muted-foreground` |

**Espaçamento** — escala 4px. Denso usa `gap-2/3/4` interno e `gap-6/8` entre seções.
**Densidade fixa:** controles e linha de tabela `h-9` (36px); padding de card `p-4` (kanban `p-3`); célula `px-3 py-2`.
**Raio:** padrão `rounded-md` (8px); pílulas/avatar `rounded-full`.
**Sombra:** `shadow-none` em repouso · `shadow-sm` em card de kanban · `shadow-md` em popover/dialog · `shadow-lg` em drag overlay.
**Foco (a11y):** sempre visível — `outline-none focus:ring-2 focus:ring-ring` (botões: `ring-offset-2 ring-offset-background`). Nunca remover.

---

## 5. Receitas — como montar cada elemento

> Copie estas classes. São as do `style-guide.html`. Mantêm claro/escuro automático pelos tokens.

### 5.1 Botões
```html
<!-- Primário -->        <button class="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">…</button>
<!-- Secundário -->      <button class="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent">…</button>
<!-- Ghost -->           <button class="h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">…</button>
<!-- Destrutivo -->      <button class="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700">…</button>
<!-- Com ícone -->       prefixe <i> lucide h-4 w-4 + gap-1.5
<!-- Tamanho pequeno --> h-7 px-2.5 text-xs   ·   <!-- Icon button --> h-8 w-8 grid place-items-center
```
Estados: **foco** `ring-2 ring-ring ring-offset-2 ring-offset-background` · **disabled** `opacity-50 cursor-not-allowed` · **loading** spinner `h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground` + label "Salvando…".

### 5.2 Inputs e formulário
- Padrão: **rótulo acima** (`text-xs font-medium`), controle `h-9`, **mensagem de erro abaixo** (`text-xs text-red-600 dark:text-red-400`).
```html
<input class="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
<select class="h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring">…</select>
<textarea class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"></textarea>
```
- **Erro:** troque a borda por `border-red-500` + `ring-2 ring-red-500/30`. **Disabled:** `bg-muted text-muted-foreground cursor-not-allowed`.
- **Select com opção vazia:** sentinel `"none"` no client → `null` no banco (nunca string vazia).
- Validação com **zod** (schema único compartilhado com a server action) + `useActionState` (ver skill `formularios-validacao`).

### 5.3 Card
```html
<!-- padrão -->  <div class="rounded-lg border border-border bg-card p-4">…</div>
<!-- métrica --> rótulo text-xs text-muted-foreground · número font-mono tabular-nums text-2xl font-semibold · variação verde/vermelho
<!-- kanban -->  <div class="rounded-lg border border-border bg-card p-3 shadow-sm transition-transform active:scale-[.98]">…</div>
```

### 5.4 Tabela densa
- Cabeçalho overline: `border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground`, célula `px-3 py-2 font-medium`.
- Linha: `h-9 border-b border-border hover:bg-accent` (clicável → `cursor-pointer`). Valores numéricos `text-right font-mono tabular-nums`. **Atraso:** data/linha em vermelho.

### 5.5 Avatar (DRI)
Iniciais sobre `bg-primary text-primary-foreground rounded-full`. Tamanhos: xs `h-5 w-5 text-[9px]` · sm `h-6 w-6 text-[10px]` · md `h-8 w-8 text-xs`. Grupo: `-space-x-2` + `border-2 border-card`.

### 5.6 Progresso
- Barra: trilho `h-2 rounded-full bg-muted`, preenchimento `bg-primary` (ou status). Mini-barra inline em tabela: `h-1.5 w-20`.

### 5.7 Estados (todos têm um padrão único)
- **Loading:** `<Skeleton>` com a forma do conteúdo (classe `skeleton`/`bg-muted`), nunca spinner de tela cheia.
- **Empty:** ícone + frase + **CTA** (`EmptyState`). Toda lista tem.
- **Erro isolado:** mini-card `border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10` + botão "Tentar de novo". No Dashboard, cada bloco degrada sozinho.
- **Toast:** `sonner` montado uma vez no layout; ícone de status + título + descrição. Toda mutação dá feedback.

### 5.8 Ícones
**Lucide**, `h-4 w-4` (16px) padrão, `h-5 w-5` em destaque. Set do sistema está no style guide. Sem emoji.

---

## 6. Badges — o coração do sistema

### 6.1 Base e regra
Todo badge: `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium` + as classes de **tom** abaixo. Renderize via um componente `EntityBadge` que recebe o enum e resolve `{ label, className }` do `format.ts`. **Cor sempre acompanha texto.**

**Tons reutilizáveis** (claro + escuro):

| Tom | Classes |
|---|---|
| `green` | `bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400` |
| `amber` | `bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400` |
| `red` | `bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400` |
| `blue` | `bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400` |
| `indigo` | `bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400` |
| `zinc` | `bg-zinc-100 text-zinc-500 dark:bg-zinc-500/15 dark:text-zinc-400` |
| `zinc-faint` | `bg-zinc-100 text-zinc-400 dark:bg-zinc-500/15 dark:text-zinc-500` |
| `outline` | `border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300` |

**Funil — escala slate (tom único, intensidade crescente):**
`prospect` `bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400` → `lead` `…/15 text-slate-700 dark:text-slate-300` → `diagnostico` `bg-slate-200 …/20` → `oportunidade` `text-slate-800 …/25 dark:text-slate-200` → `escopo` `bg-slate-300 dark:bg-slate-400/25` → `proposta` `text-slate-900 dark:bg-slate-400/30 dark:text-slate-100` → `negociacao` `bg-slate-400 dark:bg-slate-400/40`.

### 6.2 Mapeamento completo (enum → label PT-BR → tom)

| Enum | Valor → Label | Tom |
|---|---|---|
| **deal_stage (ativos)** | prospect…negociacao | escala slate (acima) |
| **deal_stage (terminais)** | fechado → "Fechado" / perdido → "Perdido" / reativar_futuramente → "Reativar" / desqualificado → "Desqualificado" | green / red / amber / zinc-faint |
| **estado derivado** | em_negociacao → "Em negociação" / cliente_ativo → "Cliente ativo" / reativar → "Reativar" / perdido → "Perdido" / inativo → "Inativo" / contato → "Contato" | blue / green / amber / red / zinc / outline |
| **project_status** | a_iniciar → "A iniciar" / briefing → "Briefing" / desenvolvimento → "Desenvolvimento" / revisao → "Revisão" / entregue → "Entregue" | zinc / `bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300` / blue / amber / green |
| **task_status** | analisar → "Analisar" / todo → "To-do" / doing → "Doing" / impedimento → "Impedimento" / done → "Concluída" | zinc / slate-soft / blue / red / green |
| **task_priority** | urgente → "Urgente" / proximo → "Próximo" / futuro → "Futuro" | red / amber / zinc |
| **commitment_type (NCT)** | think_it → "Think-It" / build_it → "Build-It" / launch_it → "Launch-It" / quantitativo → "Quantitativo" | indigo / amber / green / `bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300` |
| **confidence_level** | alta / media / baixa | **ponto** colorido (não badge): `bg-green-500` / `bg-amber-500` / `bg-red-500` |
| **charge_status** | pendente → "Pendente" / pago → "Pago" / cancelado → "Cancelado" + **vencido** (derivado: pendente && due_date<hoje) | amber / green / zinc-faint / red |

---

## 7. `lib/format.ts` — fonte única de labels e cores

Centraliza label PT-BR + tom de cada enum, e os helpers de número/data. A UI **nunca** escreve label ou cor solta.

```ts
// forma (ilustrativa) — uma entrada por valor de enum
type Tone = 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'zinc' | 'zinc-faint' | 'outline';
const TONE: Record<Tone, string> = { /* tabela §6.1 */ };

export const DEAL_STAGE: Record<DealStage, { label: string; className: string }> = { /* §6.2 */ };
export const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = { /* … */ };
// … demais enums

// helpers
export const formatCurrency = (v: number) => /* Intl pt-BR, R$ */;
export const formatDate = (d: Date | string) => /* dd/MM/yyyy via date-fns */;
export const isOverdue = (d: Date | string) => /* due_date < hoje */;
```

`EntityBadge` consome isso:
```tsx
export function EntityBadge({ meta }: { meta: { label: string; className: string } }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>;
}
```

---

## 8. Regras de ouro (o que NÃO fazer)

- ❌ Não invente cor, tamanho ou raio fora destes tokens.
- ❌ Não use azul como cor de marca/primária. Primária é `bg-primary` (preto/branco por tema).
- ❌ Não escreva label PT-BR nem classe de cor de status direto na tela — sempre via `format.ts`.
- ❌ Não use `dark:` no chrome (use tokens semânticos). `dark:` só nos badges de status e nos blocos de erro/sucesso.
- ❌ Sem glassmorphism, gradiente decorativo, sombra dramática, emoji como ícone.
- ✅ Toda lista tem empty state com CTA. Toda mutação tem feedback. Foco sempre visível. Atraso em vermelho.
- ✅ **Todo elemento clicável mostra cursor de mão (`cursor: pointer`) no hover — sempre.** Há uma regra global em `app/globals.css` cobrindo `button`/`[role="button"]` (o preflight do Tailwind v4 dá `cursor: default`, então reativamos); disabled fica `not-allowed`. Clicáveis não-nativos (linha de tabela, card clicável, etc.) levam `cursor-pointer` explícito.

> Os 12 moldes de componente (AppSidebar, PageHeader, PeriodFilter, EntityBadge, DataTable, KanbanBoard, FormDialog, MetricCard, EmptyState, ConfidenceDot, InlineCheckbox, StatusBlock) e o mapa telas→arquétipos estão descritos na proposta de frontend. Estes tokens e receitas são a base sobre a qual eles se montam.
