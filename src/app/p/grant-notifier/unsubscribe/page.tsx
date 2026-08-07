import { CheckCircle2, XCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/features/grant-notifier/unsubscribe-token'

/**
 * 助成金情報配信メールからの配信停止ページ（認証不要）。
 *
 * メールの署名付きトークンを検証し、該当テナントの通知先メールから当該アドレスを除外する。
 * 未ログインのメールリンクからの操作のため、HMAC 署名の検証で認可したうえで
 * service_role（createAdminClient）を使う。エンドユーザー向け actions.ts での
 * createAdminClient 禁止に対する、意図的かつ限定的な例外。
 */

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '配信停止 | 助成金情報配信 | HR-DX',
}

function ResultCard({
  tone,
  title,
  body,
}: {
  tone: 'success' | 'error'
  title: string
  body: string
}) {
  const Icon = tone === 'success' ? CheckCircle2 : XCircle

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#e2e6ec] bg-white p-8 shadow-xs">
        <Icon
          className={`h-8 w-8 ${tone === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
          strokeWidth={2}
        />
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          HR-DX 助成金情報配信
        </p>
      </div>
    </main>
  )
}

export default async function GrantNotifierUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const secret = process.env.UNSUBSCRIBE_SECRET

  if (!token || !secret) {
    return (
      <ResultCard
        tone="error"
        title="配信停止できませんでした"
        body="リンクが正しくありません。メール本文のリンクをそのままお開きください。"
      />
    )
  }

  const verified = verifyUnsubscribeToken(token, secret)
  if (!verified) {
    return (
      <ResultCard
        tone="error"
        title="配信停止できませんでした"
        body="リンクの有効性を確認できませんでした。お手数ですが、配信条件の設定画面から通知先メールを削除してください。"
      />
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grant_tenant_conditions')
    .select('notify_emails')
    .eq('tenant_id', verified.tenantId)
    .maybeSingle()

  if (error) {
    console.error('[grant-notifier] 配信条件の取得に失敗しました:', error.message)
    return (
      <ResultCard
        tone="error"
        title="配信停止できませんでした"
        body="処理中にエラーが発生しました。時間をおいて再度お試しください。"
      />
    )
  }

  const current = Array.isArray(data?.notify_emails)
    ? data.notify_emails.filter((e): e is string => typeof e === 'string')
    : []
  const next = current.filter(e => e !== verified.email)

  if (next.length !== current.length) {
    const { error: updateError } = await admin
      .from('grant_tenant_conditions')
      .update({ notify_emails: next })
      .eq('tenant_id', verified.tenantId)

    if (updateError) {
      console.error('[grant-notifier] 通知先メールの更新に失敗しました:', updateError.message)
      return (
        <ResultCard
          tone="error"
          title="配信停止できませんでした"
          body="処理中にエラーが発生しました。時間をおいて再度お試しください。"
        />
      )
    }
  }

  // 既に削除済みの場合も同じ結果を返す（何度リンクを開いても結果が変わらない）
  return (
    <ResultCard
      tone="success"
      title="配信を停止しました"
      body={`${verified.email} 宛の助成金情報メールを停止しました。再開する場合は、管理画面の「助成金情報配信 › 配信条件」から通知先メールに追加してください。`}
    />
  )
}
