# Backend — config-refactor

## O que foi implementado

**`lib/validations/config.ts`** (novo) — schemas zod nas bordas:
- `profileNameSchema` — `{ name }` trim + min(1).
- `passwordSchema` — `{ currentPassword, newPassword(min 6), confirmPassword }` + `.refine` (newPassword === confirmPassword, erro em `confirmPassword`).
- `taxRateSchema` — `{ tax_rate }` coerce number 0–100.
- `staleDealDaysSchema` — `{ stale_deal_days }` coerce inteiro ≥ 1.
- `updateProfileNameSchema` — `{ id: uuid, name: min(1) }`.
- Types derivados via `z.infer` (uma fonte de verdade).

**`lib/queries/config.ts`** (novo) — leitura (Server Components), `createClient()` server:
- `getOwnProfile(userId)` — `profiles.select('id,name,email').eq('id',userId).single()`; lança em erro/ausência (bug de integridade).
- `getOrgSettings()` — `org_settings.select('tax_rate,stale_deal_days').single()`; lança em ausência (seed garante a linha). Serve Financeiro e CRM com 1 round-trip.
- `getProfiles()` — `profiles.select('id,name,email,active').order('name')`; lista vazia válida (`[]`).
- Types `OwnProfile`, `OrgSettingsRow`, `TeamProfile` exportados (cast local, sem `any`).

**`lib/actions/config.ts`** (novo) — `'use server'`, todas retornam `ActionState`:
- `updateOwnProfile(prev, formData)` — valida nome; `userId` do servidor (`auth.getUser()`), nunca do formData; `update({name}).eq('id',userId)`; `revalidatePath('/config')`.
- `updatePassword(prev, formData)` — valida; reautentica com `signInWithPassword({email do user logado, currentPassword})`; depois `auth.updateUser({password})`. Sem revalidate.
- `updateTaxRate(prev, formData)` — valida 0–100; busca `id` do singleton (`getOrgSettingsId`); `update({tax_rate}).eq('id',id)`; revalidate.
- `updateStaleDealDays(prev, formData)` — igual, com `stale_deal_days` inteiro ≥ 1.
- `toggleProfileActive(id, active)` — args posicionais (padrão `setContractStatus`); `update({active}).eq('id',id)`; revalidate.
- `updateProfileName(prev, formData)` — valida `id`+`name`; `update({name}).eq('id',id)`; revalidate.

## Contrato real entregue (o Frontend consome isto)

Queries (Server Component em `page.tsx`):
```ts
getOwnProfile(userId: string): Promise<{ id: string; name: string; email: string }>
getOrgSettings(): Promise<{ tax_rate: number; stale_deal_days: number }>
getProfiles(): Promise<{ id: string; name: string; email: string; active: boolean }[]>
```

Actions para `useActionState(action, INITIAL_ACTION_STATE)` — assinatura `(prevState, formData) => Promise<ActionState>`:
- `updateOwnProfile` — campo: `name`. Sucesso: "Nome atualizado.". Erro de campo em `errors.name`.
- `updatePassword` — campos: `currentPassword`, `newPassword`, `confirmPassword`. Sucesso: "Senha alterada.". Erros em `errors.currentPassword|newPassword|confirmPassword`. Senha atual errada → `{success:false, message:'Senha atual incorreta.'}` (sem `errors`).
- `updateTaxRate` — campo: `tax_rate`. Sucesso: "Alíquota salva.". Erro de campo em `errors.tax_rate`.
- `updateStaleDealDays` — campo: `stale_deal_days`. Sucesso: "Parâmetro salvo.". Erro de campo em `errors.stale_deal_days`.
- `updateProfileName` — campos: `id` (hidden) + `name`. Sucesso: "Nome atualizado.". Erro de campo em `errors.name`.

Action de ação direta (NÃO `useActionState`):
- `toggleProfileActive(id: string, active: boolean): Promise<ActionState>` — `active` é o NOVO valor. Sucesso: "Membro ativado." / "Membro desativado.".

`ActionState = { success: boolean; message: string; errors?: Record<string, string[]> }`

## Migrations / dados

Nenhuma. Schema não muda. `org_settings` já tem linha por seed (0006); RLS `authenticated_all` (USING+WITH CHECK) em `profiles` e `org_settings` (0007). Nada destrutivo. `lib/supabase/types.ts` não regenerado.

## Comandos rodados

- `npx tsc --noEmit` → sem saída (passou, zero erros).
- `npx eslint lib/validations/config.ts lib/queries/config.ts lib/actions/config.ts` → sem saída (passou, zero warnings).

## Desvios da spec

- **Assinatura das actions:** o brief inicial pedia todas como `(formData)`. Segui o **contrato da spec** (que é a autoridade) e o padrão real do projeto: actions de form recebem `(prevState, formData)` para casar com `useActionState`; `toggleProfileActive` usa args posicionais `(id, active)` como `setContractStatus`. Isso atende CA-19.
- **Nenhum outro desvio.** Reautenticação na troca de senha, busca do `id` do singleton e demais pontos seguem as decisões do gate.

## O que o Frontend precisa saber

- `page.tsx` deve obter `user` via `supabase.auth.getUser()` e passar `user.id` para `getOwnProfile(user.id)` e `currentUserId` ao `ConfigLayout`. As demais queries não recebem args. Usar `Promise.all`.
- Email é read-only — não há action para trocá-lo.
- `updatePassword` reseta a senha pedindo a **senha atual** (3 campos). Erro de senha atual vem em `message` (não em `errors`), exibir via `toast.error`. Resetar o form no sucesso.
- Validação client é opcional; o servidor é a verdade. Erros de campo chegam em `state.errors[campo]` para exibir inline.
- `toggleProfileActive` é chamada direta (não form action). Passar o NOVO valor de `active`. Bloqueio de auto-inativação é só na UI (`disabled={p.id === currentUserId}`) — o servidor permite (limitação conhecida documentada na spec).
- `getOrgSettings()` serve Financeiro (`tax_rate`) e CRM (`stale_deal_days`) — uma só chamada.
- Limitação conhecida (anotada na spec, fora do escopo desta story): se outras telas lerem `tax_rate` em cache, mudar a alíquota pode exigir `revalidatePath` adicional além de `/config`. Hoje só `/config` é revalidado.
