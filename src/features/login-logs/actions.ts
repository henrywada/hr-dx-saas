'use server'

import { callRpc } from '@/features/login-logs/rpc'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { isDeveloper } from '@/features/login-logs/saas-auth'
import { YEAR_MONTH_RE, isPastYearMonth } from '@/features/login-logs/params'

/**
 * ログイン履歴の一括削除（developer のみ）。
 * 指定年月の1日 0:00（JST）より前の LOGIN_SUCCESS を全テナント分削除する。
 */

export interface PurgeResult {
  success: boolean
  count?: number
  error?: string
}

const yearMonthSchema = z.string().regex(YEAR_MONTH_RE)

const ERR_FORBIDDEN = '権限がありません。'
const ERR_INVALID = '対象年月が不正です。当月より前の年月を指定してください。'
const ERR_PREVIEW = '対象件数の取得に失敗しました。'
const ERR_PURGE = 'ログイン履歴の削除に失敗しました。'

/** 権限・入力を検証し、問題があればエラー結果を返す */
async function validate(yearMonth: unknown): Promise<PurgeResult | { ym: string }> {
  if (!(await isDeveloper())) return { success: false, error: ERR_FORBIDDEN }
  const parsed = yearMonthSchema.safeParse(yearMonth)
  if (!parsed.success || !isPastYearMonth(parsed.data)) {
    return { success: false, error: ERR_INVALID }
  }
  return { ym: parsed.data }
}

/** 削除対象件数のプレビュー */
export async function previewPurgeLoginLogs(yearMonth: string): Promise<PurgeResult> {
  const v = await validate(yearMonth)
  if ('success' in v) return v

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'count_login_logs_before', { p_year_month: v.ym })
  if (error) {
    console.error('previewPurgeLoginLogs error:', error)
    return { success: false, error: ERR_PREVIEW }
  }
  return { success: true, count: Number(data ?? 0) }
}

/** 削除の実行 */
export async function purgeLoginLogs(yearMonth: string): Promise<PurgeResult> {
  const v = await validate(yearMonth)
  if ('success' in v) return v

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'delete_login_logs_before', { p_year_month: v.ym })
  if (error) {
    console.error('purgeLoginLogs error:', error)
    return { success: false, error: ERR_PURGE }
  }
  revalidatePath(APP_ROUTES.SAAS.LOGIN_LOGS)
  return { success: true, count: Number(data ?? 0) }
}
