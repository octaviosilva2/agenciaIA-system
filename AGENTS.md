<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend — Design System (LEIA ANTES de construir qualquer UI)

O estilo de design total e aprovado do CRM está em [`docs/06-design-system.md`](docs/06-design-system.md), com a referência visual viva em [`frontend-teste/style-guide.html`](frontend-teste/style-guide.html) (abra no navegador — tem tema claro e escuro).

Antes de criar qualquer botão, badge, input, tabela, card ou estado: siga os **tokens** e as **receitas de classes** de lá. Cor, medida, tipografia e raio **não se inventam**. Label PT-BR e cor de status de dados saem **sempre** de `lib/format.ts`.
