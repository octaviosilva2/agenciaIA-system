# PROMPT MESTRE — copiar e colar no chat novo

> Abra esta pasta (`CRM-V4/`) no Claude Code e cole o texto abaixo.

---

Você vai construir do ZERO o CRM interno da minha agência de IA (2 sócios). Tudo o que você precisa saber está especificado nos documentos desta pasta — eles são a fonte da verdade, não invente escopo além deles.

**Leia nesta ordem antes de escrever qualquer código:**

1. `docs/01-produto.md` — o que é o sistema, módulos e navegação
2. `docs/02-dados.md` — schema completo do banco (enums, tabelas, regras derivadas, automações)
3. `docs/03-telas.md` — especificação funcional de cada tela
4. `docs/04-arquitetura.md` — stack, estrutura de pastas e convenções obrigatórias
5. `docs/05-roteiro.md` — ordem de execução em fases, com gates de aprovação

**Regras de trabalho:**

- Siga o roteiro de `docs/05-roteiro.md` fase a fase. Ao fim de cada fase: build limpo, testes verdes, commit, e atualizar `.work/STATUS.md` antes de seguir.
- PARE nos gates marcados no roteiro e espere minha aprovação explícita.
- O banco é um projeto Supabase NOVO. Antes da Fase 1, me peça: project ref, URL e anon key (vou criar o projeto e te passar). Use o MCP do Supabase para aplicar migrations.
- Onde os documentos forem ambíguos, pergunte — nunca assuma.
- Código e variáveis em inglês, comentários em português, UI em português.
- Nunca commitar secrets. `.env.local` no `.gitignore` desde o primeiro commit.

Comece agora: leia os 5 documentos, monte seu plano interno da Fase 0 e me apresente um resumo de 10 linhas do que entendeu + o que vai fazer na Fase 0. Não crie nada antes desse resumo.
