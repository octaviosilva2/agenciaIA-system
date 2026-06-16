import { createClient } from '@/lib/supabase/server'

/** Opção de contato/empresa para selects. */
export type CompanyOption = { id: string; name: string }

type RawCompany = { id: string; name: string }

/** Lista as empresas/contatos (para selects de "novo negócio" / "nova oportunidade"). */
export async function getCompanyOptions(): Promise<CompanyOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar contatos: ${error.message}`)
  }

  return (data ?? []) as RawCompany[]
}
