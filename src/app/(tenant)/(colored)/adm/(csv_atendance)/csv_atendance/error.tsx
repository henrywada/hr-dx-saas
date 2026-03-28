'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function CsvAtendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">表示中にエラーが発生しました</h2>
      <p className="text-sm text-slate-600">{error.message}</p>
      <Button type="button" variant="outline" onClick={() => reset()}>
        再試行
      </Button>
    </div>
  )
}
