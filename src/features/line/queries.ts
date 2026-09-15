/**
 * LINE友だち招待 — 読み取り専用クエリ（page.tsx から呼ぶ）
 *
 * createClient() のみ使用。createAdminClient() は使わない。
 */

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { FriendInviteCandidate, LineLinkStats } from './types'

/**
 * 友だち招待の送信候補一覧を返す
 *
 * 条件:
 *   1. 自テナントの employees で user_id IS NOT NULL
 *   2. line_friends に status='linked' で存在する employee_id を除外
 *   3. 各 user_id に get_tenant_employee_auth_email RPC でメールを解決
 *      （取得できない場合は email: '' としてリストに残す）
 */
export async function listFriendInviteCandidates(): Promise<FriendInviteCandidate[]> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) return []

  const supabase = await createClient()

  // 連携済みの employee_id を取得（除外リスト）
  // エラー時は throw して page の error boundary に委ねる（サイレントに空セットにしない）
  const { data: linkedRows, error: linkedError } = await supabase
    .from('line_friends')
    .select('employee_id')
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'linked')
    .not('employee_id', 'is', null)
  if (linkedError) throw new Error(`連携済み従業員の取得に失敗しました: ${linkedError.message}`)

  const linkedEmployeeIds = new Set<string>(
    (linkedRows ?? []).map(r => r.employee_id).filter((id): id is string => id !== null)
  )

  // user_id が存在する従業員を取得
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, user_id')
    .eq('tenant_id', user.tenant_id)
    .not('user_id', 'is', null)
    .order('name')

  if (error || !employees) return []

  // 連携済みを除外し、メールを解決して候補リストを組み立てる
  const candidates: FriendInviteCandidate[] = []
  for (const emp of employees) {
    if (!emp.user_id) continue
    if (linkedEmployeeIds.has(emp.id)) continue

    // RPC でメールアドレスを取得
    let email = ''
    const { data: emailData } = await supabase.rpc('get_tenant_employee_auth_email', {
      p_tenant_id: user.tenant_id,
      p_user_id: emp.user_id,
    })
    if (typeof emailData === 'string' && emailData.length > 0) {
      email = emailData
    }

    candidates.push({
      employeeId: emp.id,
      userId: emp.user_id,
      name: emp.name ?? '',
      email,
    })
  }

  return candidates
}

/**
 * LINE連携状況の件数を集計して返す（SaaS管理者専用）
 *
 * layout.tsx と同じ条件でガード:
 *   - appRole === 'developer'（現行 SaaS 管理者ロール）
 *   - user.role === 'supaUser'（レガシー user_metadata ロール）
 * どちらか一方でも満たせば通過。
 */
export async function getLineLinkStats(): Promise<LineLinkStats> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  // layout.tsx と同様の OR ガード（レガシー supaUser も許可）
  const isSaasAdmin = user.appRole === 'developer' || user.role === 'supaUser'
  if (!isSaasAdmin) throw new Error('Forbidden: SaaS管理者権限が必要です')

  const supabase = await createClient()

  // line_friends 全件を status 別に集計
  const { data, error } = await supabase.from('line_friends').select('status')

  if (error) throw error

  const stats: LineLinkStats = { linked: 0, unlinked: 0, blocked: 0 }
  for (const row of data ?? []) {
    if (row.status === 'linked') stats.linked++
    else if (row.status === 'unlinked') stats.unlinked++
    else if (row.status === 'blocked') stats.blocked++
  }

  return stats
}
