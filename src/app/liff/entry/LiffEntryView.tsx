'use client'

// src/app/liff/entry/LiffEntryView.tsx
// LINE LIFF エントリポイント: IDトークン取得 → /api/line/liff-auth 呼び出し → /top へ遷移する。
import { useEffect, useState } from 'react'

import { APP_ROUTES } from '@/config/routes'

/** 画面の状態 */
type AuthState = 'loading' | 'not_linked' | 'error'

export function LiffEntryView() {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // LIFF SDK は SSR 非対応のため動的インポートする
        const liffModule = await import('@line/liff')
        const liff = liffModule.default
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        // 未ログインの場合は LINE ログインフローへリダイレクトする
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        // IDトークンを取得する（トークン文字列自体はログに出力しない）
        const idToken = liff.getIDToken()
        if (!idToken) {
          if (!cancelled) setState('error')
          return
        }

        // liff-auth API でセッションを確立する
        const res = await fetch('/api/line/liff-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })

        if (res.ok) {
          // セッション Cookie が付与されたのでポータルへ遷移する
          window.location.assign(APP_ROUTES.TENANT.PORTAL)
          return
        }

        const body = await res.json().catch(() => ({}))
        if (!cancelled) {
          setState(body.error === 'not_linked' ? 'not_linked' : 'error')
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
  }, [])

  if (state === 'loading') {
    return <p className="p-6 text-center text-sm text-gray-500">読み込み中...</p>
  }

  if (state === 'not_linked') {
    return (
      <div className="space-y-2 p-6 text-center text-sm text-gray-600">
        <p>まだアカウントが連携されていません。</p>
        <p>管理者から送られた招待メールのリンクからアクセスしてください。</p>
      </div>
    )
  }

  return (
    <div className="p-6 text-center text-sm text-red-600">
      <p>読み込みに失敗しました。もう一度お試しください。</p>
    </div>
  )
}
