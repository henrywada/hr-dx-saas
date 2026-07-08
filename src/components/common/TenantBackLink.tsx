'use client'

import { useRouter } from 'next/navigation'

type Props = {
  className?: string
  /** 暗い背景向けのライト配色 */
  variant?: 'default' | 'light'
}

/** 従業員ポータル・テナント管理者画面の前画面へ戻るリンク */
export default function TenantBackLink({ className = '', variant = 'default' }: Props) {
  const router = useRouter()

  const colorClass =
    variant === 'light' ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`shrink-0 text-xs font-medium ${colorClass} ${className}`.trim()}
    >
      ← 戻る
    </button>
  )
}
