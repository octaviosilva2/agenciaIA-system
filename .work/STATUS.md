# Status do Projeto

## Fase Atual: Concluída Fase 1 - Dados e regras (Aguardando GATE)

### O que foi feito recentemente:
- **Fase 0** (Fundação):
  - Setup do Next.js 15, Tailwind, shadcn/ui.
  - Sidebar navegável e placeholders de rotas criados.
  - Configuração do Supabase (client, server, middleware).
  - Vitest configurado e rodando.
- **Fase 1** (Dados e regras):
  - Migrations de 0001 a 0007 criadas (Enums, Tabelas, Índices, Seeds e RLS).
  - Migrations aplicadas ao Supabase com sucesso.
  - Types gerados (`lib/supabase/types.ts`).
  - Schemas do Zod criados em `lib/validations/` (`company.ts`, `deal.ts`, `project.ts`, `finance.ts`, `nct.ts`).
  - Regras de negócio puras implementadas em `lib/rules/` (`deal-stage.ts`, `contact-status.ts`, `recurrence.ts`, `net-revenue.ts`).
  - Testes cobrindo 100% das regras (via Vitest).
  - Executado o `get_advisors` (Supabase security) para verificar o RLS; os alertas de policy fully open para authenticated foram validados como esperados.

### Pendências (Backlog / Próximos Passos):
- **Aguardando aprovação do humano (GATE)** para seguir para a Fase 2.
- **Fase 2 - Comercial**:
  - `app/(dashboard)/contatos`: Lista com estado derivado, filtros, botão "Novo contato".
  - `app/(dashboard)/contatos`: Kanban de deals.
  - `app/(dashboard)/contatos/[id]`: Perfil completo.
  - `app/(dashboard)/oportunidades`: Oportunidades avançadas, propostas, etc.
