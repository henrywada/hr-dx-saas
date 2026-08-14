import {
  applyPresetToInstitutionCore,
  commitCsvImportCore,
} from '@/features/health-check/csv-import-core'
import type { FileKind, MergedCsvPerson } from '@/features/health-check/types'
import { japaneseFiscalYear } from './dates'
import { KYOKAI_PRESET_CODE, MIGRATION_INSTITUTION_NAME } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

async function ensureInstitution(
  supabase: AnyClient,
  tenantId: string,
  headersByKind: Partial<Record<FileKind, string[]>>
): Promise<{ id: string; error?: string }> {
  const { data: named } = await supabase
    .from('health_check_institutions')
    .select('id, is_standard, preset_code')
    .eq('tenant_id', tenantId)
    .eq('name', MIGRATION_INSTITUTION_NAME)
    .maybeSingle()
  if (named?.id) {
    const applied = await applyPresetToInstitutionCore({
      supabase,
      tenantId,
      institutionId: named.id,
      presetCode: KYOKAI_PRESET_CODE,
      headersByKind,
    })
    if (!applied.ok) return { id: named.id, error: applied.error }
    return { id: named.id }
  }

  const { data: kyokai } = await supabase
    .from('health_check_institutions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('preset_code', KYOKAI_PRESET_CODE)
    .limit(1)
    .maybeSingle()
  if (kyokai?.id) {
    const applied = await applyPresetToInstitutionCore({
      supabase,
      tenantId,
      institutionId: kyokai.id,
      presetCode: KYOKAI_PRESET_CODE,
      headersByKind,
    })
    if (!applied.ok) return { id: kyokai.id, error: applied.error }
    return { id: kyokai.id }
  }

  const { data: standard } = await supabase
    .from('health_check_institutions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_standard', true)
    .maybeSingle()

  const { data: created, error } = await supabase
    .from('health_check_institutions')
    .insert({
      tenant_id: tenantId,
      name: MIGRATION_INSTITUTION_NAME,
      is_standard: !standard,
      preset_code: KYOKAI_PRESET_CODE,
    })
    .select('id')
    .single()
  if (error || !created) return { id: '', error: error?.message ?? '健診機関の作成に失敗しました' }

  const applied = await applyPresetToInstitutionCore({
    supabase,
    tenantId,
    institutionId: created.id,
    presetCode: KYOKAI_PRESET_CODE,
    headersByKind,
  })
  if (!applied.ok) return { id: created.id, error: applied.error }
  return { id: created.id }
}

async function ensureCampaign(
  supabase: AnyClient,
  tenantId: string,
  fiscalYear: number,
  people: MergedCsvPerson[]
): Promise<{ id: string; error?: string }> {
  const dates = people
    .map(p => p.examDateYmd)
    .filter(Boolean)
    .sort()
  const { data: existing } = await supabase
    .from('health_check_campaigns')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('fiscal_year', fiscalYear)
    .eq('round', 1)
    .maybeSingle()
  if (existing?.id) return { id: existing.id }

  const { data: created, error } = await supabase
    .from('health_check_campaigns')
    .insert({
      tenant_id: tenantId,
      fiscal_year: fiscalYear,
      round: 1,
      title: `移行 ${fiscalYear}年度`,
      start_date: dates[0] || null,
      end_date: dates[dates.length - 1] || null,
      status: 'closed',
    })
    .select('id')
    .single()
  if (error || !created) {
    return { id: '', error: error?.message ?? '実施回の作成に失敗しました' }
  }
  return { id: created.id }
}

export async function importHealthCheckMigration(input: {
  supabase: AnyClient
  tenantId: string
  people: MergedCsvPerson[]
  headersByKind: Partial<Record<FileKind, string[]>>
  skipErrors: boolean
}): Promise<{ imported: number; errors: string[]; error?: string }> {
  const people = input.skipErrors ? input.people.filter(p => p.examDateYmd) : input.people
  if (people.length === 0) return { imported: 0, errors: [] }

  const institution = await ensureInstitution(input.supabase, input.tenantId, input.headersByKind)
  if (!institution.id) return { imported: 0, errors: [], error: institution.error }

  const byYear = new Map<number, MergedCsvPerson[]>()
  for (const p of people) {
    if (!p.examDateYmd) continue
    const fy = japaneseFiscalYear(p.examDateYmd)
    const list = byYear.get(fy) ?? []
    list.push(p)
    byYear.set(fy, list)
  }

  let imported = 0
  const errors: string[] = []
  for (const [fy, group] of byYear) {
    const campaign = await ensureCampaign(input.supabase, input.tenantId, fy, group)
    if (!campaign.id) {
      errors.push(campaign.error ?? `${fy}年度の実施回を作成できません`)
      continue
    }
    const result = await commitCsvImportCore({
      supabase: input.supabase,
      tenantId: input.tenantId,
      campaignId: campaign.id,
      institutionId: institution.id,
      people: group,
    })
    if (!result.ok && result.error) errors.push(result.error)
    imported += result.imported
    errors.push(...result.errors)
  }
  return { imported, errors, error: institution.error }
}
