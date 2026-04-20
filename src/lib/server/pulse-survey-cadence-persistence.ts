import postgres from 'postgres'
import { createClient } from '@/lib/supabase/server'
import type { PulseSurveyCadence } from '@/lib/datetime'
import { normalizePulseSurveyCadence } from '@/lib/datetime'

/**
 * ローカル Supabase 等で PostgREST の schema cache が DDL 後も古いままになると、
 * `pulse_survey_cadence` 参照でエラーになる。同一 DB へだけ直 SQL を使う。
 *
 * - NEXT_PUBLIC_SUPABASE_URL が localhost / 127.0.0.1 のとき、DATABASE_URL があれば使用
 * - リモート API にローカル DATABASE_URL が混ざる誤設定を避けるため、上記以外では直 SQL しない
 * - ホスト先で schema cache が直らないときは DATABASE_URL を正しく置いたうえで
 *   PULSE_SURVEY_CADENCE_DIRECT_SQL=1 を追加
 */
let directSql: ReturnType<typeof postgres> | null | undefined

function allowDirectPostgres(): boolean {
  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!dbUrl) return false
  if (process.env.PULSE_SURVEY_CADENCE_DIRECT_SQL === '1') return true
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return /https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(api)
}

function getDirectPostgres(): ReturnType<typeof postgres> | null {
  if (directSql !== undefined) return directSql
  if (!allowDirectPostgres()) {
    directSql = null
    return null
  }
  const url = process.env.DATABASE_URL!.trim()
  directSql = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 15 })
  return directSql
}

function isPulseCadenceSchemaError(message: string): boolean {
  return message.includes('pulse_survey_cadence') || message.includes('schema cache')
}

export async function getTenantPulseSurveyCadence(tenantId: string): Promise<PulseSurveyCadence> {
  const sql = getDirectPostgres()
  if (sql) {
    try {
      const rows = await sql<{ pulse_survey_cadence: string }[]>`
        select pulse_survey_cadence::text as pulse_survey_cadence
        from public.tenant_portal_settings
        where tenant_id = ${tenantId}::uuid
        limit 1
      `
      return normalizePulseSurveyCadence(rows[0]?.pulse_survey_cadence)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('does not exist') && !msg.includes('column')) {
        console.warn('[pulse_survey_cadence] direct SQL read:', msg)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from('tenant_portal_settings')
    .select('pulse_survey_cadence')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    if (!isPulseCadenceSchemaError(error.message)) {
      console.warn('[pulse_survey_cadence] supabase read:', error.message)
    }
    return 'monthly'
  }
  return normalizePulseSurveyCadence(data?.pulse_survey_cadence as string | undefined)
}

export async function persistTenantPulseSurveyCadence(
  tenantId: string,
  cadence: PulseSurveyCadence
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = getDirectPostgres()
  if (sql) {
    try {
      await sql`
        insert into public.tenant_portal_settings (tenant_id, pulse_survey_cadence, updated_at)
        values (${tenantId}::uuid, ${cadence}, now())
        on conflict (tenant_id) do update set
          pulse_survey_cadence = EXCLUDED.pulse_survey_cadence,
          updated_at = EXCLUDED.updated_at
      `
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('does not exist') && !msg.includes('column')) {
        console.warn('[pulse_survey_cadence] direct SQL write:', msg)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const now = new Date().toISOString()

  const { data: existing, error: selErr } = await supabase
    .from('tenant_portal_settings')
    .select('tenant_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  // SELECT は pulse_survey_cadence を指定していないので schema cache エラーは起きない
  if (selErr && !isPulseCadenceSchemaError(selErr.message)) {
    return { ok: false, error: selErr.message }
  }

  if (existing) {
    const { error } = await supabase
      .from('tenant_portal_settings')
      .update({ pulse_survey_cadence: cadence, updated_at: now })
      .eq('tenant_id', tenantId)
    if (error) {
      if (isPulseCadenceSchemaError(error.message)) {
        // 列がまだない環境（ローカル未マイグレーション等）: 本番指定自体は通す
        console.warn('[pulse_survey_cadence] cadence save skipped (schema cache):', error.message)
        return { ok: true }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  }

  const { error } = await supabase.from('tenant_portal_settings').insert({
    tenant_id: tenantId,
    pulse_survey_cadence: cadence,
  })
  if (error) {
    if (isPulseCadenceSchemaError(error.message)) {
      console.warn('[pulse_survey_cadence] cadence save skipped (schema cache):', error.message)
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
