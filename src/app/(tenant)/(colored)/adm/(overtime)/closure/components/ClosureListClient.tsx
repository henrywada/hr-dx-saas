'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '../[closure_id]/timecard/components/input'
import { formatDateTimeInJST } from '@/lib/datetime'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { ClosureStatusBadge } from './ClosureStatusBadge'
import type { Tables } from '@/lib/supabase/types'

type ClosureItem = Tables<'monthly_overtime_closures'>

export function ClosureListClient() {
  const router = useRouter()
  const [items, setItems] = useState<ClosureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [yearMonth, setYearMonth] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/closure')
      const json = (await res.json()) as { error?: string; items?: ClosureItem[] }
      if (!res.ok) {
        setError(json.error ?? '一覧の取得に失敗しました')
        setItems([])
        return
      }
      setItems(json.items ?? [])
    } catch {
      setError('通信に失敗しました')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: yearMonth.trim() }),
      })
      const json = (await res.json()) as { error?: string; item?: ClosureItem }
      if (!res.ok) {
        setCreateError(json.error ?? '作成に失敗しました')
        return
      }
      setDialogOpen(false)
      setYearMonth('')
      await load()
      if (json.item?.id) {
        router.push(`/adm/closure/${json.item.id}`)
      }
    } catch {
      setCreateError('通信に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  function formatYmLabel(ym: string) {
    return ym.slice(0, 7)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">月次締め管理</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">
            月ごとの残業締めの状況を確認し、集計・承認・ロックを行います。対象月が集計済み以降になると、上長向け「残業申請の承認」画面では
            <span className="font-bold text-red-600">その月の申請に対する承認・却下・修正依頼はできず</span>
            、詳細の閲覧のみとなります。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : '再取得'}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
            新規締め
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20" aria-busy="true">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-400" aria-label="読み込み中" />
        </div>
      ) : !error ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>対象月</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>集計日時</TableHead>
              <TableHead>集計Ver</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-neutral-500">
                  締めデータがありません。「新規締め」から作成してください。
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium">{formatYmLabel(row.year_month)}</TableCell>
                  <TableCell>
                    <ClosureStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">
                    {row.aggregated_at ? formatDateTimeInJST(row.aggregated_at) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.aggregate_version ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/adm/closure/${row.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      詳細
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新規月次締め</DialogTitle>
            <p className="text-sm text-neutral-500">対象月を YYYY-MM 形式で入力してください。</p>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 px-6 pb-6 pt-2 sm:px-8">
            <div className="space-y-2">
              <label htmlFor="new-ym" className="text-sm font-medium text-neutral-800">
                対象月
              </label>
              <Input
                id="new-ym"
                placeholder="2026-04"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                disabled={creating}
                required
              />
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                キャンセル
              </Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? '作成中…' : '作成'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
