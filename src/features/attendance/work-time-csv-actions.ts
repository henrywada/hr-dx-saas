'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { canAccessHrAttendanceDashboard } from './hr-dashboard-access'
import {
  minutesBetween,
  normalizeRecordDateToYmd,
  parseFlexibleJstTime,
  parseHolidayCell,
} from './work-time-csv-parse'
import type { AttendanceActionResult } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase
}

/** クライアントから送る生行 */
export type WorkTimeCsvRawInput = {
  line: number
  employee_number: string
  record_date: string
  start_time: string
  end_time: string
  is_holiday?: string
  duration_minutes?: string
}

/** 検証済み行（画面のプレビュー・編集用） */
export type WorkTimeCsvValidatedRow = {
  line: number
  employee_number: string
  employee_id: string | null
  employee_name: string | null
  record_date: string
  start_time: string
  end_time: string
  start_iso: string | null
  end_iso: string | null
  duration_minutes: number | null
  is_holiday: boolean
  error: string | null
}

/** 保存リクエスト（サーバで再検証） */
export type WorkTimeCsvCommitRow = {
  line: number
  employee_number: string
  employee_id: string
  record_date: string
  start_time: string
  end_time: string
  is_holiday: boolean
}

export type WorkTimeCsvCommitResult = {
  summary: { total: number; success: number; failed: number }
  details: { line: number; error?: string }[]
}

async function requireHrTenant(): Promise<
  AttendanceActionResult<{ supabase: Awaited<ReturnType<typeof createClient>>; tenantId: string }>
> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    return {
      ok: false,
      error: 'この機能は人事（hr / hr_manager）、テナント管理者、または開発者ロールのみ利用できます。',
    }
  }
  const supabase = await createClient()
  return { ok: true, data: { supabase, tenantId: user.tenant_id } }
}

function periodMonthDate(recordDateYmd: string): string {
  return `${recordDateYmd.slice(0, 7)}-01`
}

/**
 * 従業員番号をテナント内で解決し、時刻・日付を検証する（ウィザードの「チェック」用）
 */
export async function validateWorkTimeCsvRows(
  rows: WorkTimeCsvRawInput[],
): Promise<AttendanceActionResult<WorkTimeCsvValidatedRow[]>> {
  const ctx = await requireHrTenant()
  if (ctx.ok === false) return ctx

  const { supabase, tenantId } = ctx.data
  const nos = [...new Set(rows.map((r) => r.employee_number.trim()).filter(Boolean))]

  const empByNo = new Map<string, { id: string; name: string | null }>()
  if (nos.length > 0) {
    const { data: emps, error } = await db(supabase)
      .from('employees')
      .select('id, employee_no, name')
      .eq('tenant_id', tenantId)
      .in('employee_no', nos)

    if (error) {
      return { ok: false, error: error.message }
    }
    for (const e of emps ?? []) {
      const row = e as { id: string; employee_no: string | null; name: string | null }
      if (row.employee_no) {
        empByNo.set(String(row.employee_no).trim(), { id: row.id, name: row.name })
      }
    }
  }

  /** 従業員 ID が解決できた行: テナント内 1 人 1 日 1 行 */
  const seenByEmployeeDate = new Map<string, number>()
  /** 番号未解決でも、同一従業員番号・同一日の CSV 重複を検出 */
  const seenByEmpNoDate = new Map<string, number>()
  const out: WorkTimeCsvValidatedRow[] = []

  for (const r of rows) {
    const empNo = r.employee_number.trim()
    const dateStr = r.record_date.trim()
    const recordDateYmd = normalizeRecordDateToYmd(dateStr)
    const errors: string[] = []

    if (!empNo) errors.push('従業員番号が空です')
    if (!recordDateYmd) {
      errors.push('record_date は YYYY-MM-DD または YYYY/MM/DD 形式で入力してください')
    }

    const startIso =
      recordDateYmd ? parseFlexibleJstTime(recordDateYmd, r.start_time) : null
    const endIso = recordDateYmd ? parseFlexibleJstTime(recordDateYmd, r.end_time) : null

    if (errors.length === 0 && !startIso) errors.push('出勤時刻を解釈できません')
    if (errors.length === 0 && !endIso) errors.push('退勤時刻を解釈できません')
    if (errors.length === 0 && startIso && endIso) {
      const mins = minutesBetween(startIso, endIso)
      if (mins < 0) errors.push('退勤が出勤より前です')
    }

    let emp = empNo ? empByNo.get(empNo) : undefined
    if (empNo && !emp) errors.push('従業員番号が見つかりません（テナント内）')

    const dateOk = Boolean(recordDateYmd)
    if (emp && recordDateYmd) {
      const k = `${emp.id}|${recordDateYmd}`
      if (seenByEmployeeDate.has(k)) {
        errors.push(`同一従業員・同一日の行が複数あります（先頭は ${seenByEmployeeDate.get(k)} 行目）`)
      } else {
        seenByEmployeeDate.set(k, r.line)
      }
    } else if (empNo && recordDateYmd && !emp) {
      const k = `${empNo}|${recordDateYmd}`
      if (seenByEmpNoDate.has(k)) {
        errors.push(`同一従業員番号・同一日の行が複数あります（先頭は ${seenByEmpNoDate.get(k)} 行目）`)
      } else {
        seenByEmpNoDate.set(k, r.line)
      }
    }

    const duration =
      startIso && endIso && errors.length === 0 ? minutesBetween(startIso, endIso) : null

    out.push({
      line: r.line,
      employee_number: empNo,
      employee_id: emp?.id ?? null,
      employee_name: emp?.name ?? null,
      record_date: recordDateYmd ?? dateStr,
      start_time: r.start_time,
      end_time: r.end_time,
      start_iso: startIso,
      end_iso: endIso,
      duration_minutes: duration,
      is_holiday: parseHolidayCell(r.is_holiday),
      error: errors.length > 0 ? errors.join('／') : null,
    })
  }

  return { ok: true, data: out }
}

/**
 * 検証済みデータを work_time_records に保存し、対象月の overtime_monthly_stats を削除してダッシュ集計と整合させる
 */
export async function commitWorkTimeCsvImport(
  rows: WorkTimeCsvCommitRow[],
): Promise<AttendanceActionResult<WorkTimeCsvCommitResult>> {
  const ctx = await requireHrTenant()
  if (ctx.ok === false) return ctx

  if (rows.length === 0) {
    return { ok: false, error: '保存する行がありません。' }
  }

  const { supabase, tenantId } = ctx.data
  const details: { line: number; error?: string }[] = []
  let success = 0
  let failed = 0

  const statsKeys = new Map<string, { employee_id: string; period_month: string }>()

  const uniqueNos = [...new Set(rows.map((r) => r.employee_number.trim()).filter(Boolean))]
  if (uniqueNos.length === 0) {
    return { ok: false, error: '従業員番号が空の行のみです。' }
  }
  const { data: empRows, error: empBatchErr } = await db(supabase)
    .from('employees')
    .select('id, employee_no')
    .eq('tenant_id', tenantId)
    .in('employee_no', uniqueNos)

  if (empBatchErr) {
    return { ok: false, error: empBatchErr.message }
  }

  const idByNo = new Map<string, string>()
  for (const e of empRows ?? []) {
    const row = e as { id: string; employee_no: string | null }
    if (row.employee_no) idByNo.set(String(row.employee_no).trim(), row.id)
  }

  /** 同一保存リクエスト内で (employee_id, record_date) が重複すると後勝ちになり誤認しやすいため拒否 */
  const keysWrittenInBatch = new Set<string>()

  for (const r of rows) {
    const recordDate = normalizeRecordDateToYmd(r.record_date.trim())
    if (!recordDate) {
      failed++
      details.push({
        line: r.line,
        error: 'record_date の形式が正しくありません（YYYY-MM-DD または YYYY/MM/DD）',
      })
      continue
    }

    const startIso = parseFlexibleJstTime(recordDate, r.start_time)
    const endIso = parseFlexibleJstTime(recordDate, r.end_time)
    if (!startIso || !endIso) {
      failed++
      details.push({ line: r.line, error: '時刻の解釈に失敗しました' })
      continue
    }
    const duration = minutesBetween(startIso, endIso)
    if (duration < 0) {
      failed++
      details.push({ line: r.line, error: '退勤が出勤より前です' })
      continue
    }

    const employeeId = idByNo.get(r.employee_number.trim())
    if (!employeeId) {
      failed++
      details.push({ line: r.line, error: '従業員番号が見つかりません' })
      continue
    }
    if (employeeId !== r.employee_id) {
      failed++
      details.push({ line: r.line, error: '従業員の整合性チェックに失敗しました' })
      continue
    }

    const batchKey = `${employeeId}|${recordDate}`
    if (keysWrittenInBatch.has(batchKey)) {
      failed++
      details.push({
        line: r.line,
        error:
          '同一従業員・同一日の行がこの保存データ内に複数あります（1 日 1 行にまとめてから保存してください）',
      })
      continue
    }

    const rowPayload = {
      start_time: startIso,
      end_time: endIso,
      duration_minutes: duration,
      is_holiday: r.is_holiday,
      source: 'csv_import',
      qr_session_id: null,
      punch_supervisor_user_id: null,
    }

    // upsert(onConflict) は DB にユニーク制約がある前提のため、未マイグレーション環境でも動くよう SELECT → UPDATE / INSERT にする
    const { data: existingList, error: selErr } = await db(supabase)
      .from('work_time_records')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('record_date', recordDate)
      .limit(1)

    if (selErr) {
      failed++
      details.push({ line: r.line, error: selErr.message })
      continue
    }

    const existingId = (existingList as { id: string }[] | null)?.[0]?.id

    if (existingId) {
      const { error: upErr } = await db(supabase)
        .from('work_time_records')
        .update(rowPayload)
        .eq('id', existingId)
      if (upErr) {
        failed++
        details.push({ line: r.line, error: upErr.message })
        continue
      }
    } else {
      const { error: insErr } = await db(supabase).from('work_time_records').insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        record_date: recordDate,
        ...rowPayload,
      })
      if (insErr) {
        failed++
        details.push({ line: r.line, error: insErr.message })
        continue
      }
    }

    keysWrittenInBatch.add(batchKey)
    success++
    details.push({ line: r.line })
    const pm = periodMonthDate(recordDate)
    statsKeys.set(`${employeeId}|${pm}`, { employee_id: employeeId, period_month: pm })
  }

  for (const p of statsKeys.values()) {
    await db(supabase)
      .from('overtime_monthly_stats')
      .delete()
      .eq('employee_id', p.employee_id)
      .eq('period_month', p.period_month)
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CSV_ATENDANCE)

  return {
    ok: true,
    data: {
      summary: { total: rows.length, success, failed },
      details,
    },
  }
}
