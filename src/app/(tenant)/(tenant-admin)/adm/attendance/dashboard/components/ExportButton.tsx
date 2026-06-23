'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { exportAttendanceCSV } from '@/features/attendance/actions'

type ExportButtonProps = {
  year: number
  month: number
}

export function ExportButton({ year, month }: ExportButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setPending(true)
    try {
      const res = await exportAttendanceCSV(year, month)
      if (res.ok === false) {
        setError(res.error)
        return
      }
      const blob = new Blob([res.csvText], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エクスポートに失敗しました')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? '出力中…' : 'CSVエクスポート'}
      </Button>
      {error ? <p className="text-xs text-red-600 max-w-[14rem] text-right">{error}</p> : null}
    </div>
  )
}
