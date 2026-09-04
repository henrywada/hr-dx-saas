'use client'

import { useRouter } from 'next/navigation'

type Props = {
  className?: string
}

/** パブリックページ向けの前画面へ戻るリンク */
export default function BackLink({ className = '' }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`shrink-0 text-xs font-medium text-slate-500 hover:text-accent-orange ${className}`.trim()}
    >
      ← 戻る
    </button>
  )
}
