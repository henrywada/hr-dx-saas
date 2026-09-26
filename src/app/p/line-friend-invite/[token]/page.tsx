/**
 * LINE友だち招待 公開 QR ページ（認証不要）
 *
 * - トークンを invite_token で照合し、無効・使用済み・期限切れで日本語エラーメッセージを分岐する。
 * - createAdminClient を使用するのは、未ログイン訪問者には RLS が invite を隠すため。
 *   actions.ts での createAdminClient 禁止に対する意図的な例外（参照: grant-notifier/unsubscribe）。
 * - NEXT_PUBLIC_LIFF_ID が未設定の場合はサービス利用不可メッセージを返す。
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { buildFriendInviteLiffUrl } from '@/lib/line/friendInviteLiffUrl'
import { isLineEnabledForTenant } from '@/lib/line/line-enabled'
import { getMyouTenantIds } from '@/lib/auth/tenant-audience'
import { LineFriendInviteQr } from '@/features/line/components/LineFriendInviteQr'

// SSR 毎回実行（トークンの使用状況をリアルタイムで反映する）
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'LINE友だち追加 | HR-DX',
}

// エラーメッセージを一元管理するカード
function MessageCard({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#e2e6ec] bg-white p-8 shadow-xs text-center">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">HR-DX</p>
      </div>
    </main>
  )
}

export default async function LineFriendInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // LIFF ID が環境変数に設定されていなければサービス利用不可
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    return <MessageCard title="ご利用いただけません" body="現在この機能はご利用いただけません。" />
  }

  // 未認証訪問者のため RLS をバイパスして invite を取得する
  const admin = createAdminClient()
  const { data: invite, error } = await admin
    .from('line_friend_invites')
    .select('id, tenant_id, expires_at, used_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (error) {
    console.error('[line-friend-invite] invite 取得エラー:', error.message)
    return (
      <MessageCard
        title="エラーが発生しました"
        body="処理中にエラーが発生しました。時間をおいて再度お試しください。"
      />
    )
  }

  // トークンが存在しない（無効）
  if (!invite) {
    return (
      <MessageCard
        title="招待リンクが無効です"
        body="このリンクは存在しないか、すでに削除されています。担当者にお問い合わせください。"
      />
    )
  }

  // MYOU テナントは LINE 連携を使わない（既存招待が残っていても QR を表示しない）
  if (!isLineEnabledForTenant(invite.tenant_id, getMyouTenantIds())) {
    return <MessageCard title="ご利用いただけません" body="現在この機能はご利用いただけません。" />
  }

  // 使用済み
  if (invite.used_at) {
    return (
      <MessageCard
        title="招待リンクは使用済みです"
        body="このリンクはすでに使用されています。LINE連携が完了している場合はそのままご利用ください。"
      />
    )
  }

  // 期限切れ
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <MessageCard
        title="招待リンクの有効期限が切れています"
        body="このリンクの有効期限が切れています。担当者に新しい招待リンクの発行を依頼してください。"
      />
    )
  }

  // 有効なトークン — LIFF URL を生成して QR を表示
  const liffUrl = buildFriendInviteLiffUrl(liffId, token)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#e2e6ec] bg-white p-8 shadow-xs text-center">
        {/* LINE ブランドカラーに合わせたヘッダー */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">LINE友だち追加</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            LINEアプリのカメラ（またはQRコードリーダー）で、下のQRコードを読み取ってください。
          </p>
        </div>

        {/* QR コード */}
        <LineFriendInviteQr url={liffUrl} />

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">HR-DX</p>
      </div>
    </main>
  )
}
