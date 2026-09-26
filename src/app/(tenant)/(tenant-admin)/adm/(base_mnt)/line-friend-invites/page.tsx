/**
 * LINE友だち招待 — テナント管理者ページ（Server Component）
 *
 * - getServerUser() でユーザー確認後に listFriendInviteCandidates() を呼び出す
 * - supabase.from() は page.tsx に書かない（queries.ts に委譲）
 * - layout が employee を弾くため、ロール分岐は不要
 */

import { notFound, redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { listFriendInviteCandidates } from '@/features/line/queries'
import { isLineEnabledForTenant } from '@/lib/line/line-enabled'
import { getMyouTenantIds } from '@/lib/auth/tenant-audience'
import FriendInviteClient from '@/features/line/components/FriendInviteClient'

export default async function LineFriendInvitesPage() {
  // 認証チェック
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // MYOU テナントは LINE 連携を使わないため画面を表示しない
  if (!isLineEnabledForTenant(user.tenant_id, getMyouTenantIds())) {
    notFound()
  }

  // 招待候補の取得（未連携従業員）
  const candidates = await listFriendInviteCandidates()

  return <FriendInviteClient candidates={candidates} />
}
