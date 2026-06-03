'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'

export default function Error({
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
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Alert variant="destructive">
        <AlertTitle>エラーが発生しました</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message}
          <div className="mt-4">
            <Button onClick={reset} variant="outline" size="sm">
              再読み込み
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
