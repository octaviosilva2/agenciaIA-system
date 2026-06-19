# Spec — config-refactor

## Resumo da abordagem

Refatorar `/config` numa página de 2 colunas: nav lateral de tabs verticais (estado client, URL fixa) + painel de seção à direita. Trocar o mock por queries/actions reais no Supabase, reaproveitando os padrões já estabelecidos no projeto (`createClient` server, `ActionState`, `useActionState` + toast, zod nas bordas). Sem migration nova — a linha única de `org_settings` já existe por seed (0006) e a RLS já está aberta a `authenticated` (0007). É uma refatoração isolada: `components/config/` só é consumido por `config/page.tsx`.

Por quê assim: o `components/ui/tabs.tsx` (base-ui) já suporta `orientation="vertical"`, e o padrão de aba+painel está validado em `strategy-view.tsx`. Toda a infraestrutura de mutação (server actions com `ActionState`) já existe em `lib/actions/*` — só falta o arquivo de config.

## Contratos de dados (queries + types)

Arquivo novo: `lib/queries/config.ts`. Todas usam `createClient()` de `lib/supabase/server.ts` (Server Components). Padrão: query lança/retorna conforme os modelos de `lib/queries/contacts.ts`.

### Types (definir em `lib/queries/config.ts` e reexportar onde os componentes precisarem)

```ts
export type OwnProfile = { id: string; name: string; email: string }
export type OrgSettingsRow = { tax_rate: number; stale_deal_days: number }
export type TeamProfile = { id: string; name: string; email: string; active: boolean }
```

### `getOwnProfile(userId: string): Promise<OwnProfile>`
- `supabase.from('profiles').select('id,name,email').eq('id', userId).single()`
- `userId` vem de `supabase.auth.getUser()` no page (não do cliente).
- Erro/ausência (`error` ou `data == null`) → **lançar** (é bug de integridade: todo usuário autenticado tem profile). O page não trata graciosamente; deixa o error boundary do Next pegar. (CA-05)

### `getOrgSettings(): Promise<OrgSettingsRow>`
- `supabase.from('org_settings').select('tax_rate,stale_deal_days').single()`
- A linha sempre existe (seed 0006). Ausência → **lançar** (bug). Decisão de gate: frontend não faz upsert. (PA-01 resolvido → opção c) (CA-13, CA-16)
- Uma única chamada serve Financeiro **e** CRM (mesma linha).

### `getProfiles(): Promise<TeamProfile[]>`
- `supabase.from('profiles').select('id,name,email,active').order('name')`
- Lista vazia é válida (retorna `[]`, UI renderiza tabela vazia). (CA-18, edge "Equipe vazia")

> Nota de tipagem: o client Supabase do projeto é não-tipado nessas queries (ver `lib/queries/contacts.ts`) — cast local para os types acima, sem `any`.

## Contratos de mutação (actions + zod)

Arquivo novo: `lib/actions/config.ts` (`'use server'`). Schemas em `lib/validations/config.ts`. Todas retornam `ActionState` (`{ success, message, errors? }`) de `lib/actions/action-state.ts`. Todas chamam `revalidatePath('/config')` em caso de sucesso.

Assinatura: actions consumidas por `useActionState` recebem `(prevState: ActionState, formData: FormData)`. Actions de ação direta (toggle) recebem argumentos posicionais — seguir o padrão de `lib/actions/contracts.ts` (`setContractStatus(id, status)`).

### Validações (`lib/validations/config.ts`)

```ts
export const profileNameSchema = z.object({
  name: z.string().trim().min(1, 'O nome não pode ficar vazio.'),
})

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(6, 'A nova senha precisa ter ao menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

export const taxRateSchema = z.object({
  tax_rate: z.coerce.number().min(0, 'Mínimo 0.').max(100, 'Máximo 100.'),
})

export const staleDealDaysSchema = z.object({
  stale_deal_days: z.coerce.number().int('Use um número inteiro.').min(1, 'Mínimo 1 dia.'),
})

// reaproveita profileNameSchema; id valida que é o alvo
export const updateProfileNameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'O nome não pode ficar vazio.'),
})
```

### `updateOwnProfile(prev, formData): Promise<ActionState>`  (CA-06, CA-07)
- Lê `name` do formData; valida com `profileNameSchema`. Falha → `{ success:false, message:'O nome não pode ficar vazio.', errors }` sem escrever.
- Pega `userId` do servidor (`supabase.auth.getUser()`) — **nunca** do formData. Falha de auth → `{ success:false, message:'Sessão expirada.' }`.
- `supabase.from('profiles').update({ name }).eq('id', userId)`.
- Erro Supabase → `{ success:false, message:'Não foi possível salvar o nome.' }` (mensagem genérica; detalhe não vaza).
- Sucesso → `revalidatePath('/config')`, `{ success:true, message:'Nome atualizado.' }`.

### `updatePassword(prev, formData): Promise<ActionState>`  (CA-08, CA-09)
- Lê `currentPassword`, `newPassword`, `confirmPassword`; valida com `passwordSchema`. Falha → retorna `errors`, **não chama a API**.
- Reautenticação: confirma `currentPassword` via `supabase.auth.signInWithPassword({ email, password: currentPassword })` usando o email do usuário logado. Falha → `{ success:false, message:'Senha atual incorreta.' }`. (impede troca por terceiro com sessão aberta)
- Troca: `supabase.auth.updateUser({ password: newPassword })`. **Usar `updateUser`, não `admin.updateUserById`** — o server client usa anon key (`lib/supabase/server.ts`), não service_role; o método admin não está disponível e não deve ser introduzido no cliente.
- Erro → `{ success:false, message:'Não foi possível alterar a senha.' }`.
- Sucesso → `{ success:true, message:'Senha alterada.' }` (sem revalidate — não há dado de banco na tela).

### `updateTaxRate(prev, formData): Promise<ActionState>`  (CA-14)
- Valida `tax_rate` com `taxRateSchema` (0–100). Falha → `errors`, sem escrever.
- `supabase.from('org_settings').update({ tax_rate }).eq('id', <id da linha única>)` — como há linha única, pode usar `.neq('id', '00000000-0000-0000-0000-000000000000')` evitar filtro frágil; **preferir** buscar a linha e atualizar por id, ou usar update sem necessidade de id já que é singleton. Decisão: `update({ tax_rate })` aplicado com `.not('id','is',null)` (atinge a única linha). Erro → genérica. Sucesso → `revalidatePath('/config')` + outras telas que dependem do imposto se necessário (ver Riscos), `{ success:true, message:'Alíquota salva.' }`.

### `updateStaleDealDays(prev, formData): Promise<ActionState>`  (CA-17)
- Valida `stale_deal_days` (inteiro ≥ 1). Mesma estratégia de update singleton.
- Sucesso → `revalidatePath('/config')`, `{ success:true, message:'Parâmetro salvo.' }`.

### `toggleProfileActive(id: string, active: boolean): Promise<ActionState>`  (CA-19)
- Argumentos posicionais (padrão `setContractStatus`). `active` é o **novo** valor desejado.
- `supabase.from('profiles').update({ active }).eq('id', id)`.
- **Auto-inativação não é bloqueada no servidor nesta versão** (RLS já permite tudo); o bloqueio é só na UI (decisão de gate, PA-02). Documentar como limitação conhecida.
- Sucesso → `revalidatePath('/config')`, mensagem `'Membro ativado.'`/`'Membro desativado.'`.

### `updateProfileName(prev, formData): Promise<ActionState>`  (CA-20)
- Lê `id` + `name`; valida `updateProfileNameSchema`. Nome vazio → `errors`, sem escrever.
- `supabase.from('profiles').update({ name }).eq('id', id)`.
- Sucesso → `revalidatePath('/config')`, `{ success:true, message:'Nome atualizado.' }`.

### Segurança (baseline + RLS)
- RLS já habilitada em `profiles` e `org_settings` com `authenticated_all` (USING + WITH CHECK `true`). Sem mudança — toda escrita exige sessão autenticada; anon não acessa. (research 🟢)
- `userId` para perfil/senha sempre derivado do servidor, nunca do cliente.
- Senha nunca logada; mensagens de erro genéricas ao usuário.
- Toda action valida na borda (zod) e falha fechado.

## Componentes — árvore e responsabilidades

```
app/(dashboard)/config/page.tsx          [Server] busca user + 3 queries em Promise.all, monta <ConfigLayout>
└─ components/config/config-layout.tsx    [Client] estado da aba ativa; Tabs vertical; recebe todos os dados via props
   ├─ config-nav.tsx                      [Client] TabsList vertical com 2 grupos rotulados (renderizado dentro do layout)
   ├─ profile-section.tsx                 [Client] useActionState(updateOwnProfile); nome editável + email read-only + Salvar
   ├─ security-section.tsx               [Client] useActionState(updatePassword); 3 campos senha + Salvar
   ├─ appearance-section.tsx             [Client] useTheme(); 2 botões/cards (Claro/Escuro), ativo destacado
   ├─ financial-section.tsx              [Client] useActionState(updateTaxRate); campo % + Salvar (ex-TaxCard, dados reais)
   ├─ crm-section.tsx                    [Client] useActionState(updateStaleDealDays); campo dias + Salvar (ex-StaleDealCard)
   └─ team-section.tsx                   [Client] tabela profiles; toggle active + editar nome; recebe currentUserId
```

Decisão sobre `config-nav` vs `config-layout`: o estado de aba ativa (`Tabs value`) e os painéis vivem juntos no mesmo `Tabs` (base-ui exige `TabsList` e `TabsContent` no mesmo `Tabs` root). Portanto:
- `config-layout.tsx` é o `Tabs` root com `orientation="vertical"`, contém o `config-nav` (a `TabsList`) à esquerda e os `TabsContent` (as seções) à direita.
- `config-nav.tsx` pode ser apenas a `TabsList` com os 2 grupos + labels — ou inlinado no layout. Recomendado: manter `config-nav` como a `TabsList` para isolar a navegação. Se inlinar for mais simples, o gate aceita (não cria valor extra ter arquivo separado). **Simplicidade:** se `config-nav` virar só ~20 linhas de JSX sem lógica, inlinar no `config-layout`.

### Padrão de cada seção-form (Client)
Seguir `components/contacts/activity-form.tsx`: `useActionState(action, INITIAL_ACTION_STATE)`, `useEffect` → `toast.success/error` por `state`, `formRef.reset()` no sucesso quando faz sentido (perfil/equipe não reseta; senha reseta). Erros de campo de `state.errors` exibidos inline abaixo do input (CA-07, CA-09).

### Responsabilidades por seção

- **profile-section**: `<form action={formAction}>`; input `name` `defaultValue={profile.name}`; input email `value={profile.email}` `readOnly disabled`; botão Salvar (`disabled={pending}`). Consome: `profile` (prop). (CA-05, CA-06, CA-07)
- **security-section**: 3 inputs `type="password"` (`currentPassword`, `newPassword`, `confirmPassword`); validação client opcional, mas servidor é a verdade; reseta no sucesso. Sem query. (CA-08, CA-09)
- **appearance-section**: `useTheme()`; 2 opções (Claro/Escuro, ícones Sun/Moon de `lucide-react`); ativo por `resolvedTheme`; `onClick={() => setTheme('light'|'dark')}`. Sem "Sistema" (CA-10). Coexiste com `ThemeToggle` do header — ambos usam o mesmo hook, refletem o mesmo estado (CA-12). Sem query/mutação.
- **financial-section**: ex-`TaxCard`; `defaultValue={orgSettings.tax_rate}`; form → `updateTaxRate`. Campos fantasma removidos (CA-15). Consome: `orgSettings.tax_rate`.
- **crm-section**: ex-`StaleDealCard`; `defaultValue={orgSettings.stale_deal_days}`; form → `updateStaleDealDays`. Consome: `orgSettings.stale_deal_days`.
- **team-section**: atualizar o existente. Trocar estado-local+toast-mock por chamadas às actions reais. Recebe `currentUserId`; checkbox `disabled={p.id === currentUserId}` (decisão de gate PA-02); edição de nome via dialog chama `updateProfileName`. Consome: `profiles` + `currentUserId`.

### Estados de UI por seção
- **Carregando**: dados vêm do Server Component (Promise.all) — sem skeleton; a página só renderiza com dados prontos.
- **Vazio**: só Equipe pode estar vazia → tabela renderiza sem linhas, sem quebrar.
- **Erro de leitura**: query lança → error boundary do Next (org_settings/profile ausentes = bug).
- **Erro de escrita**: `toast.error(state.message)` + erros de campo inline; valor exibido não muda (sem sucesso falso).
- **Sucesso**: `toast.success`; revalidate atualiza o valor servido.

## Layout e navegação

- `page.tsx` (Server):
```tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login') // segurança: rota já é protegida por middleware, mas falha fechado
const [profile, orgSettings, profiles] = await Promise.all([
  getOwnProfile(user.id),
  getOrgSettings(),
  getProfiles(),
])
return <ConfigLayout currentUserId={user.id} profile={profile} orgSettings={orgSettings} profiles={profiles} />
```
- `ConfigLayout` (Client): `<div className="flex gap-6">` com nav `~w-48` fixa à esquerda + conteúdo `flex-1`. `Tabs orientation="vertical" defaultValue="perfil"`.
- `TabsList` vertical com **2 grupos**:
  - Label não-clicável "Minha Conta" → `TabsTrigger` Perfil (`value="perfil"`), Segurança (`value="seguranca"`), Aparência (`value="aparencia"`).
  - Label não-clicável "Sistema" → Financeiro (`value="financeiro"`), CRM (`value="crm"`), Equipe (`value="equipe"`).
  - Labels de grupo: `<p>` com classe de header (ex.: `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5`), **fora** de `TabsTrigger` (não navegáveis). (CA-01)
- Aba default: `perfil` (CA-03).
- URL permanece `/config` — sem `router.push`, sem searchParams (CA-02).
- Sidebar global (`app-sidebar.tsx`) e `layout.tsx` do dashboard **não mudam**; "Config" segue ativo por prefixo de rota (CA-04). (research)
- Seguir tokens de `docs/06-design-system.md`; labels/cores de status (Ativo/Inativo) de `lib/format.ts` (`TONE`) — já usado em `team-section` (CA-22).

## Migration

**Sem migration nova.** Verificado:
- `org_settings` tem seed de linha única em `0006_strategy_settings_seeds.sql:33` (`INSERT INTO org_settings (tax_rate, stale_deal_days) VALUES (0, 7)`).
- RLS habilitada e policy `authenticated_all` (USING+WITH CHECK) em `profiles` e `org_settings` em `0007_indexes_rls.sql:86,102`; GRANTs presentes (`:105,121`).
- Schema de `profiles` (`id,name,email,active,created_at,updated_at`) e `org_settings` (`id,tax_rate,stale_deal_days,…`) já batem com o que a spec usa (`lib/supabase/types.ts:655-705`).

Nada destrutivo. Nenhuma alteração de schema.

## Plano de testes

Nível: unit/integração nas actions (validação + caminho de erro) e componente para navegação. E2E opcional para o fluxo crítico de senha.

- **Navegação (CA-01,02,03)**: renderiza 6 abas nos 2 grupos; default = Perfil; trocar aba muda o painel sem alterar a URL.
- **Perfil — nome vazio (CA-07)**: `updateOwnProfile` com `name=''`/só espaços → `success:false`, `errors.name` presente, **nenhum** `update` chamado (assert no mock do supabase).
- **Perfil — nome válido (CA-06)**: nome ok → `update({name})` chamado com o `userId` do servidor; `success:true`.
- **Perfil — userId do servidor**: action ignora qualquer `id` vindo do formData; usa `auth.getUser()`.
- **Segurança — senhas divergentes (CA-09)**: `newPassword != confirmPassword` → `errors.confirmPassword`, `auth.updateUser` **não** chamado.
- **Segurança — senha curta (CA-09)**: `< 6` → erro, sem chamada.
- **Segurança — senha atual errada**: `signInWithPassword` falha → `success:false`, sem `updateUser`.
- **Financeiro (CA-13,14,15)**: fora de faixa (>100, <0) → erro; valor válido → update; campos fantasma ausentes no componente.
- **CRM (CA-16,17)**: não-inteiro/<1 → erro; válido → update.
- **Equipe — auto-inativação (PA-02)**: na UI, checkbox do `currentUserId` vem `disabled`; render assertion.
- **Equipe — nome vazio (CA-20)**: `updateProfileName` com nome vazio → erro, sem update.
- **Equipe — toggle (CA-19)**: `toggleProfileActive(id, false)` → `update({active:false}).eq('id',id)`.
- **Aparência (CA-10,11)**: clicar "Escuro" chama `setTheme('dark')`; seletor reflete `resolvedTheme`. (E2E: classe `.dark` aplicada no `<html>`.)
- **Erro de escrita (edge)**: supabase retorna `error` → action `success:false` com mensagem genérica; UI não mostra sucesso.

## Fora de escopo

- Sub-rotas reais `/config/*` — URL fixa, estado client.
- Tema "Sistema"/automático — só claro/escuro (`enableSystem={false}`).
- Avatar, foto, cargo/role/permissões — não existem no schema.
- Distinção admin / authz por papel — RLS permissivo; bloqueio de auto-inativação só na UI.
- Bloqueio de auto-inativação no servidor — não nesta versão (limitação conhecida).
- Convidar/criar/excluir membros — só toggle e editar nome.
- Trocar email — read-only.
- Qualquer parâmetro de `org_settings` além de `tax_rate` e `stale_deal_days`.
- Mudanças na sidebar global / layout do dashboard.
- Migration — nenhuma.

## Decisões e trade-offs

- **`updateUser` em vez de `admin.updateUserById`**: o server client usa anon key. Introduzir service_role no app só para trocar senha violaria o baseline ("service_role nunca no cliente"). `updateUser` opera sobre a própria sessão — exatamente o caso. Adicionado passo de reautenticação com a senha atual para não permitir troca por sessão sequestrada.
- **org_settings sem upsert (PA-01 → c)**: a linha existe por seed; ausência é bug, não estado normal. Tratar como erro evita lógica de upsert especulativa (gate de simplicidade).
- **Auto-inativação só bloqueada na UI (PA-02)**: RLS já permite tudo; replicar a checagem no servidor exigiria comparar `auth.getUser()` na action. Trade-off aceito: bloqueio de UX agora, servidor permissivo (consistente com o resto do CRM). Documentado como limitação.
- **`config-nav` separado vs inlinado**: começar separado para isolar navegação; se virar JSX trivial sem lógica, inlinar no `config-layout` (evitar arquivo só por arquivo).
- **Uma query `getOrgSettings` para 2 seções**: mesma linha serve Financeiro e CRM; evita 2 round-trips.

## Riscos para implementação

- **Update em singleton sem id estável**: `org_settings` é linha única mas a action não recebe o id. Resolver buscando o id na própria action (`select('id').single()` antes do update) **ou** update com filtro que atinge a única linha. Buscar o id é mais explícito e seguro — recomendado.
- **Revalidação de telas que consomem `tax_rate`**: se outras telas (financeiro) leem `tax_rate` em cache, mudar a alíquota pode exigir `revalidatePath` adicional além de `/config`. Verificar na implementação do backend quais rotas dependem e revalidar conforme necessário (fora do escopo da story, mas anotar).
- **Hidratação do tema em appearance-section**: `useTheme()` pode retornar `undefined` no primeiro render (SSR). Espelhar a abordagem do `theme-toggle` (resolver visual por CSS ou `mounted` guard) para evitar mismatch / destaque errado do botão ativo.
- **`team-section` em transição**: ele importa o type `Profile` de `lib/mock/config`. Ao migrar, trocar para `TeamProfile` de `lib/queries/config`. `lib/mock/config.ts` deve ser simplificado (remover `future_*`), mas só removido de vez quando nenhum import restar.

---

## GATE — aprovação humana necessária

Abordagem pronta para implementar. Pontos que merecem seu OK antes de codar:

1. **Reautenticação na troca de senha** (pedir a senha atual e validar via `signInWithPassword` antes de `updateUser`) — adiciona segurança mas não estava explícito no gate. Mantenho?
2. **Update de `org_settings`**: buscar o `id` da linha única dentro da action antes do update (mais explícito). OK?
3. **`config-nav`**: criar arquivo separado ou inlinar a `TabsList` no `config-layout` se ficar trivial — deixo a decisão final na implementação. OK?

Sem objeções → backend e frontend podem seguir.
