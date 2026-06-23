/**
 * IDs fixos de perfis MOCK — referenciados pelos mocks de NCT e Tarefas
 * (`lib/mock/nct.ts`, `lib/mock/tasks.ts`) como DRI/responsável.
 *
 * A equipe real vem de `getProfiles()` (lib/queries/config). Os helpers de
 * exibição (`initialsOf`, `findProfile`) vivem em `lib/format.ts`. Estes UUIDs
 * são descartados quando NCT/Tarefas forem religados ao banco (Sessão 3).
 */

export const PROFILE_OCTAVIO = 'p0000000-0000-0000-0000-000000000001'
export const PROFILE_KAUAN = 'p0000000-0000-0000-0000-000000000002'
export const PROFILE_CAIO = 'p0000000-0000-0000-0000-000000000003'
export const PROFILE_MARINA = 'p0000000-0000-0000-0000-000000000004'
