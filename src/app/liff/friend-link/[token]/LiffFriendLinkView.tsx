'use client'

// src/app/liff/friend-link/[token]/LiffFriendLinkView.tsx
// LINE友だち紐付け LIFF クライアントコンポーネント
// LIFF 初期化 → フォロー確認 → IDトークン取得 → API呼び出し の順で実行する。
import { useEffect, useState } from 'react'

import { ensureFriendship } from '@/lib/line/ensureFriendship'

/** 画面の状態 */
type FriendLinkState = 'loading' | 'done' | 'missing_token' | 'error' | 'expired' | 'already_used'

/** エラー状態ごとのユーザー向けメッセージ */
const ERROR_MESSAGES: Record<Exclude<FriendLinkState, 'loading' | 'done'>, string> = {
  missing_token: '招待リンクが正しくありません。',
  error: '連携に失敗しました。もう一度お試しください。',
  expired: '招待の有効期限が切れています。管理者に再発行を依頼してください。',
  already_used: 'この招待は既に使用されています。',
}

interface LiffFriendLinkViewProps {
  inviteToken: string
}

export function LiffFriendLinkView({ inviteToken }: LiffFriendLinkViewProps) {
  const [state, setState] = useState<FriendLinkState>('loading')

  useEffect(() => {
    // 招待トークンが渡されていない場合は即終了
    if (!inviteToken) {
      setState('missing_token')
      return
    }

    let cancelled = false

    async function run() {
      try {
        // LIFF SDK を動的インポート（SSR 非対応のため）
        const liffModule = await import('@line/liff')
        const liff = liffModule.default
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        // 未ログインの場合はログインフローへリダイレクト
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        // LINEアプリ内のLIFFブラウザは最初からログイン済み扱いになり
        // liff.login() の認可フローを経由しないため、LIFFアプリ設定の
        // 「友だち追加オプション」による自動プロンプトが発火しない。
        // ここで明示的にフォロー状態を確認し、未フォローなら促す。
        await ensureFriendship(liff)

        // IDトークンを取得（友だち追加確認の後に行う）
        const idToken = liff.getIDToken()
        if (!idToken) {
          if (!cancelled) setState('error')
          return
        }

        // 紐付け API を呼び出す
        const res = await fetch('/api/line/friend-link-accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, inviteToken }),
        })

        if (res.ok) {
          if (!cancelled) setState('done')
          return
        }

        // API エラーレスポンスに応じて状態を設定
        const body = await res.json().catch(() => ({}))
        if (!cancelled) {
          if (body.error === 'expired') setState('expired')
          else if (body.error === 'already_used') setState('already_used')
          else setState('error')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    }

    run()

    // クリーンアップ: アンマウント時に setState を呼ばないようにする
    return () => {
      cancelled = true
    }
  }, [inviteToken])

  if (state === 'loading') {
    return <p className="p-6 text-center text-sm text-gray-500">読み込み中...</p>
  }

  if (state === 'done') {
    return (
      <p className="p-6 text-center text-sm text-gray-900">
        連携が完了しました。今後はLINEのリッチメニューからHR-DXにアクセスできます。
      </p>
    )
  }

  return <p className="p-6 text-center text-sm text-red-600">{ERROR_MESSAGES[state]}</p>
}
