# PROMPT MESTRE — copiar e colar no chat novo

> Abra esta pasta (`CRM-V4/`) no Claude Code e cole o texto abaixo.

---

Você vai **CONTINUAR** a construção do CRM interno da minha agência de IA (2 sócios). As **Fases 0 e 1 já estão concluídas e aprovadas** — o projeto NÃO começa do zero. Os documentos desta pasta são a fonte da verdade; não invente escopo além deles.

**Leia nesta ordem antes de escrever qualquer código:**

1. `docs/07-handover.md` — **comece por ele**: onde o projeto parou, o que já existe e o que NÃO refazer
2. `docs/01-produto.md` — o que é o sistema, módulos e navegação
3. `docs/02-dados.md` — schema completo do banco (já aplicado no Supabase)
4. `docs/03-telas.md` — especificação funcional de cada tela
5. `docs/04-arquitetura.md` — stack, estrutura de pastas e convenções obrigatórias
6. `docs/06-design-system.md` — estilo visual aprovado (abra também `frontend-teste/style-guide.html` no navegador)
7. `docs/05-roteiro.md` — fases e gates; **você começa na Fase 2, etapa 2.0**

**Regras de trabalho:**

- **UI-first em toda tela nova** (regra do roteiro): montar a UI com dados mock seguindo o design system → me mostrar para validação visual → só depois ligar backend (queries, server actions, Supabase) → testes. Nunca inventar cor, medida ou label — tudo sai de `docs/06-design-system.md` e `lib/format.ts`.
- **Não refazer o que as Fases 0–1 entregaram**: auth, layout, migrations, types, zod schemas e regras de `lib/rules/` estão prontos e testados. O banco Supabase já existe e está aplicado — não criar projeto novo nem reaplicar migrations; mudança de schema só via migration NOVA versionada (via MCP).
- Siga `docs/05-roteiro.md` fase a fase. Ao fim de cada fase: build limpo, testes verdes, commit `feat(fase-N): ...`, atualizar `.work/STATUS.md`.
- **PARE nos gates** marcados no roteiro (e nos mini-gates visuais) e espere minha aprovação explícita.
- Onde os documentos forem ambíguos, pergunte — nunca assuma.
- Código e variáveis em inglês, comentários em português, UI em português.
- Nunca commitar secrets. `.env.local` permanece no `.gitignore`.

Comece agora: leia os documentos na ordem acima e me apresente um resumo de 10 linhas do que entendeu + seu plano para a **etapa 2.0** (alinhamento visual da fundação) e para a primeira tela da Fase 2. Não crie nada antes desse resumo.
