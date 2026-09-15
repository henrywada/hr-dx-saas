import { NextResponse } from 'next/server'
import { parseWebhookEvents } from '@/lib/line/parseWebhookEvents'
import { verifyLineWebhookSignature } from '@/lib/line/verifyWebhookSignature'
import { createAdminClient } from '@/lib/supabase/admin'

// LINE Webhook エンドポイント
// Route Handler のため createAdminClient() を使用（エンドユーザー actions.ts ではない）
export async function POST(req: Request) {
  // チャネルシークレット未設定はサーバー設定不備として 500 を返す
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    console.error('[LINE Webhook] LINE_CHANNEL_SECRET が未設定です')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  // raw body を取得して署名検証（raw body 自体はログしない）
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  const isValid = verifyLineWebhookSignature({
    rawBody,
    signatureHeader: signature,
    channelSecret,
  })
  if (!isValid) {
    // 署名不一致は 401 を返す（不正リクエストの可能性）
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // ペイロードをパース
  let events
  try {
    events = parseWebhookEvents(JSON.parse(rawBody))
  } catch {
    // 個人情報を含みうるペイロードはログしない
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  for (const event of events) {
    if (event.type === 'follow') {
      // 友だち追加イベント: line_friends を upsert する
      const { data: existing } = await supabase
        .from('line_friends')
        .select('id, status, user_id')
        .eq('line_user_id', event.source.userId)
        .maybeSingle()

      if (!existing) {
        // 初回フォロー: 未紐付け状態で新規作成
        await supabase.from('line_friends').insert({
          line_user_id: event.source.userId,
          status: 'unlinked',
        })
      } else if (existing.status === 'blocked') {
        // ブロック解除後の再フォロー:
        //   user_id が紐付いている → linked に復元
        //   user_id が無い        → unlinked に復元
        await supabase
          .from('line_friends')
          .update({ status: existing.user_id ? 'linked' : 'unlinked' })
          .eq('id', existing.id)
      }
      // 友だち追加時の案内メッセージは LINE 公式アカウント側の
      // 「あいさつメッセージ」機能が送信するため、ここでは送信しない
    } else if (event.type === 'unfollow') {
      // ブロック（アンフォロー）イベント: status を blocked に更新
      await supabase
        .from('line_friends')
        .update({ status: 'blocked' })
        .eq('line_user_id', event.source.userId)
    }
    // "message" イベントは自由対話を実装しないため無視する
  }

  return NextResponse.json({ ok: true })
}
