# Story — config-refactor

## Contexto

Hoje `/config` é uma página única: um header "Sistema" e dois blocos client (`team-section`, `settings-section`) alimentados por mock — sem nada ligado ao Supabase. O mock ainda carrega campos fantasma (`future_tax_rate`, `future_tax_from`) que não existem no schema. Conforme o CRM cresce, configurações distintas (perfil pessoal, senha, tema, parâmetros financeiros e de CRM, equipe) precisam de lugares próprios e navegáveis, não empilhadas numa tela só.

A mudança reorganiza `/config` em **6 seções agrupadas em 2 grupos**, com navegação lateral interna por tabs verticais (sem trocar de URL), e troca o mock por leitura/escrita real no Supabase. É uma refatoração isolada: `components/config/` não é importado por mais ninguém.

## Personas

- **Membro da equipe (logado)** — qualquer pessoa autenticada. Por RLS permissivo (`authenticated_all`), todos editam tudo; não há distinção de admin nesta versão. Quer ajustar seus próprios dados (nome, senha, tema) e os parâmetros do sistema (impostos, prazo de deal parado, status da equipe) sem caçar onde cada coisa fica.

## User Stories

- Como membro logado, quero navegar entre seções de configuração por uma barra lateral interna, para encontrar cada ajuste sem sair da página `/config`.
- Como membro logado, quero editar meu nome de exibição, para que o sistema me identifique corretamente.
- Como membro logado, quero trocar minha senha, para manter minha conta segura.
- Como membro logado, quero escolher tema claro ou escuro, para usar o CRM confortavelmente.
- Como membro logado, quero ajustar a alíquota de imposto (`tax_rate`), para que os cálculos financeiros usem o valor correto.
- Como membro logado, quero definir após quantos dias um deal é considerado parado (`stale_deal_days`), para que o funil sinalize oportunidades estagnadas.
- Como membro logado, quero ativar/inativar membros e editar o nome deles, para manter a lista da equipe atualizada.

## Critérios de Aceite

**Navegação**
- [ ] CA-01: `/config` exibe uma nav lateral interna com tabs verticais (base-ui `orientation="vertical"`), agrupadas em **Minha Conta** (Perfil, Segurança, Aparência) e **Sistema** (Financeiro, CRM, Equipe).
- [ ] CA-02: Trocar de seção atualiza o painel à direita **sem mudar a URL** — permanece `/config` o tempo todo (estado client, sem sub-rotas).
- [ ] CA-03: Há uma seção ativa por padrão ao entrar em `/config` (Perfil).
- [ ] CA-04: O item "Config" na sidebar global segue marcado como ativo em `/config`.

**Perfil**
- [ ] CA-05: A seção Perfil mostra o nome atual do usuário logado (lido de `profiles` no Supabase) e o email em campo **read-only**.
- [ ] CA-06: Ao salvar um novo nome, o registro do usuário em `profiles` é atualizado no Supabase via server action real, e a UI reflete o valor salvo.
- [ ] CA-07: Tentar salvar nome vazio é bloqueado com mensagem de validação; nenhuma escrita ocorre.

**Segurança**
- [ ] CA-08: A seção Segurança tem formulário de troca de senha que chama `supabase.auth.updateUser({ password })`.
- [ ] CA-09: Senha válida → sucesso com feedback ao usuário; senha inválida (curta/vazia/confirmação divergente) → erro claro, sem chamar a API.

**Aparência**
- [ ] CA-10: A seção Aparência oferece seletor entre **claro e escuro** (apenas dois — sem opção "Sistema", coerente com `enableSystem={false}`) via `useTheme().setTheme`.
- [ ] CA-11: Selecionar um tema aplica a mudança imediatamente e o seletor reflete o tema atual.
- [ ] CA-12: O `<ThemeToggle/>` do header global **continua presente e funcional**, coexistindo com a seção Aparência (ambos refletem o mesmo estado de tema).

**Financeiro**
- [ ] CA-13: A seção Financeiro contém apenas o card de `tax_rate` (TaxCard), carregando o valor atual de `org_settings` do Supabase.
- [ ] CA-14: Salvar `tax_rate` persiste em `org_settings` via server action real; a UI reflete o valor salvo.
- [ ] CA-15: Os campos fantasma `future_tax_rate` e `future_tax_from` **não aparecem** em lugar nenhum da UI.

**CRM**
- [ ] CA-16: A seção CRM contém apenas o card de `stale_deal_days` (StaleDealCard), carregando o valor atual de `org_settings` do Supabase.
- [ ] CA-17: Salvar `stale_deal_days` persiste em `org_settings` via server action real; a UI reflete o valor salvo.

**Equipe**
- [ ] CA-18: A seção Equipe lista os profiles do Supabase (nome, email, status ativo/inativo).
- [ ] CA-19: Alternar ativo/inativo de um membro persiste o campo `active` em `profiles` via server action real.
- [ ] CA-20: Editar o nome de um membro persiste em `profiles` via server action real; nome vazio é bloqueado com validação.

**Geral**
- [ ] CA-21: Toda escrita usa server action real (não mock) e exibe feedback de sucesso/erro ao usuário. `lib/mock/config.ts` deixa de ser usado por `/config`.
- [ ] CA-22: A UI segue os tokens e receitas de `docs/06-design-system.md` (cor, medida, tipografia, raio); labels e cores de status saem de `lib/format.ts` quando aplicável.

## Edge Cases

- **Perfil/Equipe — nome vazio ou só espaços** → bloqueio com validação, nenhuma escrita.
- **Segurança — senha vazia, curta ou confirmação divergente** → erro de validação antes de chamar a API.
- **Falha de escrita no Supabase** (rede/RLS/erro do servidor) → mensagem de erro ao usuário; o valor exibido não muda de forma enganosa (não mostra sucesso falso).
- **`org_settings` sem linha** (tabela vazia) → ver Pergunta Aberta PA-01.
- **Equipe vazia** (nenhum profile além do próprio, ou nenhum) → a tabela renderiza vazia sem quebrar.
- **Membro inativando/editando a si mesmo** → ver Pergunta Aberta PA-02.
- **Salvar sem alterar valor** → operação idempotente, sem erro (pode-se considerar no-op).

## Fora de Escopo

- Sub-rotas reais `/config/perfil`, `/config/seguranca` etc. — decidido: estado client, URL fixa em `/config`.
- Opção de tema "Sistema"/automático — `enableSystem={false}`, só claro/escuro.
- Avatar, foto de perfil, cargo/role/permissões — não existem no schema `profiles`.
- Distinção de admin / controle de acesso por papel — RLS permissivo, todos editam tudo nesta versão.
- Campos `future_tax_rate` / `future_tax_from` — fictícios, removidos.
- Convidar/criar/excluir membros da equipe — só toggle ativo e editar nome.
- Trocar email do usuário — email é read-only.
- Qualquer parâmetro de `org_settings` além de `tax_rate` e `stale_deal_days`.
- Mudanças na sidebar global ou no layout do dashboard além de manter o "Config" ativo.

## Perguntas Abertas

- [PRECISA CLARIFICAR: PA-01] `org_settings` é linha única. Se a tabela estiver vazia ao abrir Financeiro/CRM, o comportamento esperado é (a) criar a linha no primeiro save (upsert), (b) exibir valores default editáveis, ou (c) garantir via seed/migration que a linha sempre existe? Definir antes do backend.
- [PRECISA CLARIFICAR: PA-02] Na seção Equipe, o próprio usuário logado pode se inativar? Se sim, há risco de se trancar para fora. Bloquear auto-inativação, permitir, ou ignorar por ora (RLS já permite tudo)?
