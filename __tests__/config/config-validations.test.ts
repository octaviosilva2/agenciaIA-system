import { describe, it, expect } from 'vitest'
import {
  profileNameSchema,
  passwordSchema,
  taxRateSchema,
  staleDealDaysSchema,
  updateProfileNameSchema,
} from '../../lib/validations/config'

/**
 * Testes das validações zod da feature config-refactor.
 * Cobrem CA-07, CA-09, CA-14, CA-17, CA-20 e os edge cases de nome/senha/limites.
 * São puros e determinísticos — não tocam Supabase nem rede.
 */

describe('profileNameSchema (perfil próprio + equipe) — CA-07 / edge nome vazio', () => {
  it('recusa nome vazio', () => {
    const r = profileNameSchema.safeParse({ name: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.name).toContain('O nome não pode ficar vazio.')
    }
  })

  it('recusa nome só com espaços (trim antes do min)', () => {
    const r = profileNameSchema.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
  })

  it('aceita nome válido e aplica trim', () => {
    const r = profileNameSchema.safeParse({ name: '  Octavio  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Octavio')
  })
})

describe('passwordSchema (troca de senha) — CA-09 / edge senha', () => {
  it('recusa quando a confirmação diverge da nova senha (erro em confirmPassword)', () => {
    const r = passwordSchema.safeParse({
      currentPassword: 'atual123',
      newPassword: 'novaSenha1',
      confirmPassword: 'outraCoisa',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.confirmPassword).toContain('As senhas não coincidem.')
    }
  })

  it('recusa nova senha com menos de 6 caracteres', () => {
    const r = passwordSchema.safeParse({
      currentPassword: 'atual123',
      newPassword: '123',
      confirmPassword: '123',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.newPassword).toContain(
        'A nova senha precisa ter ao menos 6 caracteres.',
      )
    }
  })

  it('recusa senha atual vazia', () => {
    const r = passwordSchema.safeParse({
      currentPassword: '',
      newPassword: 'novaSenha1',
      confirmPassword: 'novaSenha1',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.currentPassword).toContain('Informe a senha atual.')
    }
  })

  it('aceita quando tudo é válido e as senhas coincidem', () => {
    const r = passwordSchema.safeParse({
      currentPassword: 'atual123',
      newPassword: 'novaSenha1',
      confirmPassword: 'novaSenha1',
    })
    expect(r.success).toBe(true)
  })
})

describe('taxRateSchema (alíquota) — CA-14 / edge limites', () => {
  it('recusa valor abaixo de 0', () => {
    const r = taxRateSchema.safeParse({ tax_rate: -1 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.tax_rate).toContain('Mínimo 0.')
  })

  it('recusa valor acima de 100', () => {
    const r = taxRateSchema.safeParse({ tax_rate: 101 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.tax_rate).toContain('Máximo 100.')
  })

  it('aceita o limite inferior 0', () => {
    const r = taxRateSchema.safeParse({ tax_rate: 0 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.tax_rate).toBe(0)
  })

  it('aceita o limite superior 100', () => {
    const r = taxRateSchema.safeParse({ tax_rate: 100 })
    expect(r.success).toBe(true)
  })

  it('faz coerce de string vinda de FormData ("15" -> 15)', () => {
    const r = taxRateSchema.safeParse({ tax_rate: '15' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.tax_rate).toBe(15)
  })
})

describe('staleDealDaysSchema (dias de deal parado) — CA-17 / edge inteiro/min', () => {
  it('recusa valor abaixo de 1', () => {
    const r = staleDealDaysSchema.safeParse({ stale_deal_days: 0 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.stale_deal_days).toContain('Mínimo 1 dia.')
  })

  it('recusa valor não inteiro', () => {
    const r = staleDealDaysSchema.safeParse({ stale_deal_days: 3.5 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.stale_deal_days).toContain('Use um número inteiro.')
    }
  })

  it('aceita inteiro >= 1', () => {
    const r = staleDealDaysSchema.safeParse({ stale_deal_days: 7 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.stale_deal_days).toBe(7)
  })

  it('faz coerce de string inteira de FormData ("10" -> 10)', () => {
    const r = staleDealDaysSchema.safeParse({ stale_deal_days: '10' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.stale_deal_days).toBe(10)
  })
})

describe('updateProfileNameSchema (editar membro) — CA-20 / edge id+nome', () => {
  // UUID v4 válido (zod v4 valida version/variant bits — all-same-digit é rejeitado)
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

  it('recusa id que não é uuid', () => {
    const r = updateProfileNameSchema.safeParse({ id: 'nao-uuid', name: 'Fulano' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.id).toBeTruthy()
  })

  it('recusa nome vazio mesmo com id válido', () => {
    const r = updateProfileNameSchema.safeParse({ id: VALID_UUID, name: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.name).toContain('O nome não pode ficar vazio.')
  })

  it('aceita id uuid + nome válido', () => {
    const r = updateProfileNameSchema.safeParse({ id: VALID_UUID, name: 'Fulano' })
    expect(r.success).toBe(true)
  })
})
