# Frontend — config-refactor

## O que foi implementado

- **`app/(dashboard)/config/page.tsx`** (Server, reescrito) — `auth.getUser()`, redirect `/login` se sem sessão (falha fechado), `Promise.all` de `getOwnProfile(user.id)`, `getOrgSettings()`, `getProfiles()`; passa tudo + `currentUserId` para `<ConfigLayout>`.
- **`components/config/config-layout.tsx`** (Client, novo) — `Tabs orientation="vertical" defaultValue="perfil"`. Nav lateral (`w-48`) com 2 grupos rotulados ("Minha Conta", "Sistema") como `<p>` não-clicáveis dentro da `TabsList`; 6 `TabsTrigger`. Painel à direita (`flex-1`) com os 6 `TabsContent`.
- **`components/config/profile-section.tsx`** (Client, novo) — form com Nome editável + E-mail `readOnly disabled`; `useActionState(updateOwnProfile)`; toast + erro inline em `errors.name`.
- **`components/config/security-section.tsx`** (Client, novo) — 3 campos `type="password"` (atual/nova/confirmar); `useActionState(updatePassword)`; `formRef.reset()` no sucesso (limpa os campos); toast; erros inline por campo.
- **`components/config/appearance-section.tsx`** (Client, novo) — 2 cards clicáveis (Sun/Moon) Claro/Escuro; `useTheme().setTheme`. Destaque do ativo resolvido por CSS (variante `dark:`), não por `resolvedTheme` no render — sem `mounted`, espelhando o `ThemeToggle` para evitar mismatch de hidratação.
- **`components/config/financial-section.tsx`** (Client, novo) — ex-`TaxCard` com dados reais; campo `tax_rate` (%) + Salvar; `useActionState(updateTaxRate)`. Sem campos `future_*`.
- **`components/config/crm-section.tsx`** (Client, novo) — ex-`StaleDealCard` com dados reais; campo `stale_deal_days` + Salvar; `useActionState(updateStaleDealDays)`.
- **`components/config/team-section.tsx`** (Client, reescrito) — tabela de profiles reais. Toggle `active` via chamada direta `toggleProfileActive(id, novoValor)` dentro de `useTransition`; checkbox `disabled` quando `p.id === currentUserId` (anti auto-inativação na UI). Edição de nome num dialog interno (`EditNameDialog`) com `useActionState(updateProfileName)`, remontado por `key` para resetar o action state por membro. Visual (tabela, badges via `TONE`, dialog) mantido.

### Removidos
- `components/config/settings-section.tsx` — conteúdo migrado para Financeiro/CRM.
- `lib/mock/config.ts` — não havia mais nenhum import após a migração (verificado: só `settings-section` e `team-section` usavam; `MOCK_PROFILES` do NCT/Tarefas vem de `lib/mock/profiles.ts`, intacto).

## Estados cobertos
- **Carregando**: dados vêm do Server Component (`Promise.all`) — página só renderiza pronta; sem skeleton (por design da spec).
- **Vazio**: seção Equipe com `profiles.length === 0` renderiza linha "Nenhum membro cadastrado." sem quebrar.
- **Erro de leitura**: queries lançam (perfil/org_settings ausentes = bug) → error boundary do Next.
- **Erro de escrita**: `toast.error(state.message)` + erro inline (`state.errors[campo]`); valor exibido não muda (sem sucesso falso). Senha atual errada chega em `message` (não `errors`) → toast.
- **Sucesso**: `toast.success`; `revalidatePath('/config')` (nas actions) atualiza o valor servido; senha reseta o form.

## Integração com backend (confere com o contrato real do `04-backend.md`)
- `page.tsx` consome `getOwnProfile(user.id)`, `getOrgSettings()`, `getProfiles()` — assinaturas batem.
- Forms `useActionState(action, INITIAL_ACTION_STATE)` com `(prevState, formData)`: `updateOwnProfile` (campo `name`), `updatePassword` (`currentPassword`/`newPassword`/`confirmPassword`), `updateTaxRate` (`tax_rate`), `updateStaleDealDays` (`stale_deal_days`), `updateProfileName` (`id` hidden + `name`). Mensagens e chaves de `errors` conforme o contrato.
- `toggleProfileActive(id, active)` chamada direta (não form action), passando o NOVO valor — conforme contrato.
- Nenhum endpoint inventado; tudo já existia em `lib/actions/config.ts` e `lib/queries/config.ts` (não tocados).

## Comandos rodados
- `npx tsc --noEmit` → sem erros.
- `npx eslint` nos 8 arquivos de config → sem warnings/erros (após ajustar `appearance-section` para o padrão CSS do `ThemeToggle`, que removeu a violação `react-hooks/set-state-in-effect`).

## Desvios da spec
- **`config-nav` inlinado no `config-layout`** (a spec autorizava: "se virar JSX trivial sem lógica, inlinar"). A `TabsList` com os 2 grupos é JSX simples; arquivo separado não agregava valor.
- **`appearance-section` sem `useTheme().resolvedTheme` no render**: a spec sugeria `mounted` guard ou CSS; o lint do projeto (`react-hooks/set-state-in-effect`) barra `setState` em efeito, então adotei a abordagem 100% CSS do `ThemeToggle` (variante `dark:`). Mesmo resultado visual, sem flash de hidratação.
- **`page.tsx` usa `redirect('/login')`** se sem user (a spec previa isso como "falha fechado"; o `layout.tsx` não redireciona, mas o middleware protege — mantido por segurança).
- Sem outros desvios. Sidebar global e layout do dashboard não tocados; URL permanece `/config`.
