'use client'

// src/app/liff/LiffRouterView.tsx
// LIFF ルータ: liff.state クエリパラメータを解析し、対応するサブルートへリダイレクトする。
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { resolveLiffStatePath } from '@/lib/line/resolveLiffStatePath'

export function LiffRouterView() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // LIFF SDK は SSR 非対応のため動的インポートする
        const liffModule = await import('@line/liff')
        const liff = liffModule.default
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        // liff.state パラメータを取得して遷移先パスを解決する
        const liffState = new URLSearchParams(window.location.search).get('liff.state')
        const destination = resolveLiffStatePath(liffState)
        if (!cancelled) router.replace(destination)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    run()

    // クリーンアップ: アンマウント時に setState を呼ばないようにする
    return () => {
      cancelled = true
    }
  }, [router])

  if (error) {
    return (
      <p className="p-6 text-center text-sm text-red-600">
        読み込みに失敗しました。もう一度お試しください。
      </p>
    )
  }

  return <p className="p-6 text-center text-sm text-gray-500">読み込み中...</p>
}
