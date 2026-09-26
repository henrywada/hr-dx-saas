// src/app/api/line/friend-link-accept/route.ts
// LINE友だち紐付けAPIエンドポイント
// LIFF画面から呼ばれ、招待トークンとLINE IDトークンを受け取って line_friends に upsert する。
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseFriendLinkAcceptBody } from '@/lib/line/parseLiffBodies'
import { isLineEnabledForTenant } from '@/lib/line/line-enabled'
import { getMyouTenantIds } from '@/lib/auth/tenant-audience'
import { verifyLineIdToken } from '@/lib/line/verifyLineIdToken'

export async function POST(req: Request) {
  // LINE_LOGIN_CHANNEL_ID が未設定の場合はサーバー側の設定ミス
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  if (!channelId) {
    console.error('[friend-link-accept] LINE_LOGIN_CHANNEL_ID が未設定です')
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }

  // リクエストボディのパース（バリデーション失敗は 400）
  let parsed: { idToken: string; inviteToken: string }
  try {
    parsed = parseFriendLinkAcceptBody(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // IDトークンを LINE_LOGIN_CHANNEL_ID で検証し lineUserId を取得
  // IDトークン自体は絶対にログに出力しない
  let lineUserId: string
  try {
    ;({ lineUserId } = await verifyLineIdToken(parsed.idToken, channelId))
  } catch {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }

  // 管理者クライアント（RLS バイパス）を使用
  // このルートはエンドユーザー向け Route Handler だが、
  // invite_token は未認証ユーザーが保持する使い捨てトークンであり
  // RLS での絞り込みができないため特例として許可されている
  const admin = createAdminClient()

  // 招待レコードを取得（employee_id ベース）
  const { data: invite, error: inviteError } = await admin
    .from('line_friend_invites')
    .select('id, tenant_id, employee_id, expires_at, used_at')
    .eq('invite_token', parsed.inviteToken)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }

  // MYOU テナントは LINE 連携を使わないため紐付けを行わない
  if (!isLineEnabledForTenant(invite.tenant_id, getMyouTenantIds())) {
    return NextResponse.json({ error: 'line_disabled' }, { status: 403 })
  }

  // 使用済みチェック（原子的 update の前の早期リターン）
  if (invite.used_at) {
    return NextResponse.json({ error: 'already_used' }, { status: 401 })
  }

  // 期限切れチェック
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 401 })
  }

  // used_at を原子的に更新（競合リクエストへの対策）
  // .is('used_at', null) で「まだ未使用の場合のみ更新」を保証する
  const { data: claimed, error: claimError } = await admin
    .from('line_friend_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id')

  if (claimError) {
    console.error('[friend-link-accept] used_at の原子的更新に失敗', claimError.message)
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }

  // 更新行数が 0 の場合は他のリクエストが先に使用済みにした
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'already_used' }, { status: 401 })
  }

  // 招待に紐づく従業員レコードを取得して user_id を確認
  // employee_id と tenant_id の両方で絞り込み（テナント境界の確認）
  const { data: employee, error: employeeError } = await admin
    .from('employees')
    .select('id, user_id')
    .eq('id', invite.employee_id)
    .eq('tenant_id', invite.tenant_id)
    .maybeSingle()

  if (employeeError) {
    console.error('[friend-link-accept] 従業員レコードの取得に失敗', employeeError.message)
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }

  // 従業員レコードが存在しない、または user_id が未設定の場合は無効な招待
  if (!employee || !employee.user_id) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }

  // 既存の line_friends レコードを確認（別の従業員への再バインドを防止）
  const { data: existingFriend, error: existingFriendError } = await admin
    .from('line_friends')
    .select('user_id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (existingFriendError) {
    console.error('[friend-link-accept] line_friends の取得に失敗', existingFriendError.message)
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }

  // 既にバインド済みで、かつ別の従業員に紐づいている場合は拒否
  // 同一従業員への再リンクは冪等として許可する
  if (existingFriend?.user_id && existingFriend.user_id !== employee.user_id) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }

  // line_friends に upsert（同一 line_user_id の競合時は上書き）
  const { error: upsertError } = await admin.from('line_friends').upsert(
    {
      line_user_id: lineUserId,
      user_id: employee.user_id,
      employee_id: invite.employee_id,
      tenant_id: invite.tenant_id,
      status: 'linked',
      linked_at: new Date().toISOString(),
    },
    { onConflict: 'line_user_id' }
  )

  if (upsertError) {
    console.error('[friend-link-accept] line_friends の upsert に失敗', upsertError.message)
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
