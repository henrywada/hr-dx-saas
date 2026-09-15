// src/app/api/line/liff-auth/route.ts
// LINE LIFF からの自動ログイン用 Route Handler。
// IDトークン検証 → line_friends 照会 → employees 照会 → Supabase セッション確立 の順で実行する。
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseLiffAuthBody } from '@/lib/line/parseLiffBodies'
import { verifyLineIdToken } from '@/lib/line/verifyLineIdToken'
import { establishSupabaseSession } from '@/lib/line/establishSupabaseSession'

export async function POST(req: Request) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  if (!channelId) {
    console.error('LINE_LOGIN_CHANNEL_ID が未設定です')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  // リクエストボディを検証する
  let parsed: { idToken: string }
  try {
    parsed = parseLiffAuthBody(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // LINE IDトークンを検証し lineUserId を取得する（IDトークン自体はログに出力しない）
  let lineUserId: string
  try {
    ;({ lineUserId } = await verifyLineIdToken(parsed.idToken, channelId))
  } catch {
    return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // line_friends テーブルで連携済みレコードを照会する
  const { data: friend, error: friendError } = await adminClient
    .from('line_friends')
    .select('user_id, tenant_id, status')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  // status === 'linked' かつ user_id / tenant_id が揃っている場合のみ許可する
  if (
    friendError ||
    !friend ||
    friend.status !== 'linked' ||
    !friend.user_id ||
    !friend.tenant_id
  ) {
    if (friendError) {
      console.error('LINE liff-auth: line_friends 照会失敗', friendError)
    }
    return NextResponse.json({ error: 'not_linked' }, { status: 401 })
  }

  // employees テーブルで同テナント・同ユーザーの存在を確認する
  const { data: employee, error: employeeError } = await adminClient
    .from('employees')
    .select('id')
    .eq('tenant_id', friend.tenant_id)
    .eq('user_id', friend.user_id)
    .maybeSingle()

  if (employeeError || !employee) {
    if (employeeError) {
      console.error('LINE liff-auth: employees 照会失敗', employeeError)
    }
    return NextResponse.json({ error: 'not_linked' }, { status: 401 })
  }

  // auth.admin.getUserById でメールアドレスを取得する
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    friend.user_id
  )
  if (userError || !userData?.user?.email) {
    if (userError) {
      console.error('LINE liff-auth: getUserById 失敗', userError)
    }
    return NextResponse.json({ error: 'not_linked' }, { status: 401 })
  }

  // セッション確立: adminClient でマジックリンクを生成し、sessionClient で Cookie に焼く
  try {
    const sessionClient = await createClient()
    await establishSupabaseSession({
      adminClient,
      sessionClient,
      email: userData.user.email,
    })
  } catch (sessionError) {
    console.error('LINE liff-auth: セッション確立失敗', sessionError)
    return NextResponse.json({ error: 'session_failed' }, { status: 500 })
  }

  // Set-Cookie は sessionClient（createClient）経由で自動付与される
  return NextResponse.json({ ok: true })
}
