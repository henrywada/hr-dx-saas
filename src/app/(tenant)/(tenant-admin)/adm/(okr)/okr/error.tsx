'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/okr — OKR・目標管理
        </div>
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-sm font-medium text-gray-700">データの読み込みに失敗しました</p>
          <p className="text-xs text-gray-400">{error.message}</p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              再試行
            </button>
            <Link
              href={APP_ROUTES.TENANT.ADMIN}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              管理トップへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
