'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

export default function ServiceAssignmentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ServiceAssignmentDetailError:', error)
  }, [error])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">エラーが発生しました</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md">{error.message}</p>
        <div className="flex gap-3">
          <Link
            href={`${APP_ROUTES.TENANT.ADMIN}/service-assignments`}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            一覧に戻る
          </Link>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
