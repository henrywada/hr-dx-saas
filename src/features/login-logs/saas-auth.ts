import { getServerUser } from '@/lib/auth/server-user'

/** SaaS管理者（一覧の閲覧用）: supaUser または developer */
export async function isSaasAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && (user.role === 'supaUser' || user.appRole === 'developer')
}

/**
 * developer のみ（破壊的操作用）。
 * user_metadata の supaUser は本人が書き換え可能なため、削除系では使わない。
 */
export async function isDeveloper(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && user.appRole === 'developer'
}
