import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testes das server actions de config-refactor.
 * Provam o COMPORTAMENTO observável (não a implementação):
 *  - validação falha => nenhuma escrita no Supabase (CA-07, CA-09, CA-14, CA-17, CA-20)
 *  - userId sempre do servidor, nunca do formData (segurança)
 *  - reautenticação na senha (CA-08, CA-09)
 *  - toggle persiste o novo valor com o id certo (CA-19)
 *  - erro do Supabase => success:false com mensagem genérica (edge falha de escrita)
 *
 * Fronteiras externas mockadas: o client Supabase (rede/banco) e next/cache.
 * O resto (zod, lógica da action) roda de verdade. Determinístico.
 */

// --- next/cache: revalidatePath é no-op observável ---
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))

// --- Supabase client mockado, controlável por teste ---
// Builder de query encadeável: .update(...).eq(...) resolve para { error }
function makeFrom(updateError: unknown) {
  const eq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq }))
  // .select('id').single() usado por getOrgSettingsId
  const single = vi.fn().mockResolvedValue({ data: { id: ORG_ID }, error: null })
  const select = vi.fn(() => ({ single }))
  return { update, eq, select, single, _api: { update, select } }
}

// UUIDs v4 válidos — zod v4 valida version/variant bits (all-same-digit é rejeitado).
const ORG_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8'
const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const TARGET_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

// Estado mutável que cada teste configura antes de chamar a action
let fromBuilders: Record<string, ReturnType<typeof makeFrom>>
let getUserResult: { data: { user: unknown } }
let signInError: unknown
let updateUserError: unknown
const signInWithPassword = vi.fn()
const updateUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => fromBuilders[table],
    auth: {
      getUser: vi.fn(async () => getUserResult),
      signInWithPassword: (...a: unknown[]) => {
        signInWithPassword(...a)
        return Promise.resolve({ error: signInError })
      },
      updateUser: (...a: unknown[]) => {
        updateUser(...a)
        return Promise.resolve({ error: updateUserError })
      },
    },
  })),
}))

import {
  updateOwnProfile,
  updatePassword,
  updateTaxRate,
  updateStaleDealDays,
  updateProfileName,
  toggleProfileActive,
} from '../../lib/actions/config'
import { INITIAL_ACTION_STATE } from '../../lib/actions/action-state'

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  fromBuilders = {
    profiles: makeFrom(null),
    org_settings: makeFrom(null),
  }
  getUserResult = { data: { user: { id: USER_ID, email: 'user@test.com' } } }
  signInError = null
  updateUserError = null
})

describe('updateOwnProfile — CA-06, CA-07', () => {
  it('bloqueia nome vazio e NÃO escreve no Supabase', async () => {
    const res = await updateOwnProfile(INITIAL_ACTION_STATE, fd({ name: '' }))
    expect(res.success).toBe(false)
    expect(res.errors?.name).toBeTruthy()
    expect(fromBuilders.profiles._api.update).not.toHaveBeenCalled()
  })

  it('salva nome válido usando o userId do SERVIDOR (ignora id do formData)', async () => {
    const res = await updateOwnProfile(
      INITIAL_ACTION_STATE,
      fd({ name: 'Novo Nome', id: 'id-falso-do-cliente' }),
    )
    expect(res.success).toBe(true)
    expect(res.message).toBe('Nome atualizado.')
    expect(fromBuilders.profiles._api.update).toHaveBeenCalledWith({ name: 'Novo Nome' })
    // o filtro usa o userId do servidor, não o id falso do formData
    expect(fromBuilders.profiles.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(revalidatePath).toHaveBeenCalledWith('/config')
  })

  it('sem sessão => Sessão expirada, sem escrita', async () => {
    getUserResult = { data: { user: null } }
    const res = await updateOwnProfile(INITIAL_ACTION_STATE, fd({ name: 'Nome' }))
    expect(res.success).toBe(false)
    expect(res.message).toBe('Sessão expirada.')
    expect(fromBuilders.profiles._api.update).not.toHaveBeenCalled()
  })

  it('erro do Supabase => mensagem genérica, sem sucesso falso (edge falha de escrita)', async () => {
    fromBuilders.profiles = makeFrom({ message: 'boom' })
    const res = await updateOwnProfile(INITIAL_ACTION_STATE, fd({ name: 'Nome' }))
    expect(res.success).toBe(false)
    expect(res.message).toBe('Não foi possível salvar o nome.')
  })
})

describe('updatePassword — CA-08, CA-09', () => {
  it('senhas divergentes => erro e NÃO chama updateUser nem reautentica', async () => {
    const res = await updatePassword(
      INITIAL_ACTION_STATE,
      fd({ currentPassword: 'atual1', newPassword: 'novaSenha1', confirmPassword: 'diferente' }),
    )
    expect(res.success).toBe(false)
    expect(res.errors?.confirmPassword).toBeTruthy()
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('nova senha curta => erro, sem chamar API', async () => {
    const res = await updatePassword(
      INITIAL_ACTION_STATE,
      fd({ currentPassword: 'atual1', newPassword: '123', confirmPassword: '123' }),
    )
    expect(res.success).toBe(false)
    expect(res.errors?.newPassword).toBeTruthy()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('senha atual incorreta => erro, sem trocar a senha', async () => {
    signInError = { message: 'invalid credentials' }
    const res = await updatePassword(
      INITIAL_ACTION_STATE,
      fd({ currentPassword: 'errada', newPassword: 'novaSenha1', confirmPassword: 'novaSenha1' }),
    )
    expect(res.success).toBe(false)
    expect(res.message).toBe('Senha atual incorreta.')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('tudo válido => reautentica e troca a senha', async () => {
    const res = await updatePassword(
      INITIAL_ACTION_STATE,
      fd({ currentPassword: 'atual1', newPassword: 'novaSenha1', confirmPassword: 'novaSenha1' }),
    )
    expect(res.success).toBe(true)
    expect(res.message).toBe('Senha alterada.')
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'atual1',
    })
    expect(updateUser).toHaveBeenCalledWith({ password: 'novaSenha1' })
  })

  it('updateUser falha => mensagem genérica', async () => {
    updateUserError = { message: 'boom' }
    const res = await updatePassword(
      INITIAL_ACTION_STATE,
      fd({ currentPassword: 'atual1', newPassword: 'novaSenha1', confirmPassword: 'novaSenha1' }),
    )
    expect(res.success).toBe(false)
    expect(res.message).toBe('Não foi possível alterar a senha.')
  })
})

describe('updateTaxRate — CA-14 / edge limites', () => {
  it('valor fora de faixa (>100) => erro, sem escrita', async () => {
    const res = await updateTaxRate(INITIAL_ACTION_STATE, fd({ tax_rate: '101' }))
    expect(res.success).toBe(false)
    expect(res.errors?.tax_rate).toBeTruthy()
    expect(fromBuilders.org_settings._api.update).not.toHaveBeenCalled()
  })

  it('valor válido => persiste na linha singleton e revalida', async () => {
    const res = await updateTaxRate(INITIAL_ACTION_STATE, fd({ tax_rate: '12' }))
    expect(res.success).toBe(true)
    expect(res.message).toBe('Alíquota salva.')
    expect(fromBuilders.org_settings._api.update).toHaveBeenCalledWith({ tax_rate: 12 })
    expect(fromBuilders.org_settings.eq).toHaveBeenCalledWith('id', ORG_ID)
    expect(revalidatePath).toHaveBeenCalledWith('/config')
  })

  it('erro do Supabase no update => mensagem genérica', async () => {
    fromBuilders.org_settings = makeFrom({ message: 'boom' })
    const res = await updateTaxRate(INITIAL_ACTION_STATE, fd({ tax_rate: '12' }))
    expect(res.success).toBe(false)
    expect(res.message).toBe('Não foi possível salvar a alíquota.')
  })
})

describe('updateStaleDealDays — CA-17 / edge inteiro', () => {
  it('não-inteiro => erro, sem escrita', async () => {
    const res = await updateStaleDealDays(INITIAL_ACTION_STATE, fd({ stale_deal_days: '3.5' }))
    expect(res.success).toBe(false)
    expect(res.errors?.stale_deal_days).toBeTruthy()
    expect(fromBuilders.org_settings._api.update).not.toHaveBeenCalled()
  })

  it('inteiro >= 1 => persiste e revalida', async () => {
    const res = await updateStaleDealDays(INITIAL_ACTION_STATE, fd({ stale_deal_days: '15' }))
    expect(res.success).toBe(true)
    expect(res.message).toBe('Parâmetro salvo.')
    expect(fromBuilders.org_settings._api.update).toHaveBeenCalledWith({ stale_deal_days: 15 })
  })
})

describe('updateProfileName — CA-20', () => {
  it('nome vazio => erro, sem escrita', async () => {
    const res = await updateProfileName(INITIAL_ACTION_STATE, fd({ id: TARGET_ID, name: '' }))
    expect(res.success).toBe(false)
    expect(res.errors?.name).toBeTruthy()
    expect(fromBuilders.profiles._api.update).not.toHaveBeenCalled()
  })

  it('id + nome válidos => persiste no id alvo', async () => {
    const res = await updateProfileName(INITIAL_ACTION_STATE, fd({ id: TARGET_ID, name: 'Beltrano' }))
    expect(res.success).toBe(true)
    expect(fromBuilders.profiles._api.update).toHaveBeenCalledWith({ name: 'Beltrano' })
    expect(fromBuilders.profiles.eq).toHaveBeenCalledWith('id', TARGET_ID)
  })
})

describe('toggleProfileActive — CA-19', () => {
  it('persiste o NOVO valor de active no id e retorna mensagem coerente (desativar)', async () => {
    const target = '33333333-3333-3333-3333-333333333333'
    const res = await toggleProfileActive(target, false)
    expect(res.success).toBe(true)
    expect(res.message).toBe('Membro desativado.')
    expect(fromBuilders.profiles._api.update).toHaveBeenCalledWith({ active: false })
    expect(fromBuilders.profiles.eq).toHaveBeenCalledWith('id', target)
  })

  it('ativar => mensagem coerente', async () => {
    const res = await toggleProfileActive('33333333-3333-3333-3333-333333333333', true)
    expect(res.success).toBe(true)
    expect(res.message).toBe('Membro ativado.')
    expect(fromBuilders.profiles._api.update).toHaveBeenCalledWith({ active: true })
  })

  it('erro do Supabase => mensagem genérica, sem sucesso falso', async () => {
    fromBuilders.profiles = makeFrom({ message: 'boom' })
    const res = await toggleProfileActive('33333333-3333-3333-3333-333333333333', false)
    expect(res.success).toBe(false)
    expect(res.message).toBe('Não foi possível atualizar o membro.')
  })
})
