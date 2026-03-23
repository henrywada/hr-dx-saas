'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_ROUTES } from '@/config/routes'
import { getUnresolvedAlertsList, resolveAlert } from '@/features/attendance/actions'
import type { HrOvertimeAlertView } from '@/features/attendance/types'
import { formatDateInJST } from '@/lib/datetime'

const STATUS_LABEL: Record<HrOvertimeAlertView['statusUi'], string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
}

type AlertListProps = {
  initialAlerts: HrOvertimeAlertView[]
}

export function AlertList({ initialAlerts }: AlertListProps) {
  const router = useRouter()
  const [openAll, setOpenAll] = useState(false)
  const [fullList, setFullList] = useState<HrOvertimeAlertView[] | null>(null)
  const [pending, startTransition] = useTransition()

  const loadAll = () => {
    startTransition(async () => {
      const r = await getUnresolvedAlertsList()
      if (r.ok) setFullList(r.data)
    })
  }

  const handleOpenAll = () => {
    setOpenAll(true)
    loadAll()
  }

  const handleResolve = (id: string) => {
    startTransition(async () => {
      const r = await resolveAlert(id)
      if (r.ok) {
        router.refresh()
        if (openAll) loadAll()
      }
    })
  }

  const rows = initialAlerts.slice(0, 10)

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-slate-800">アラート一覧</h2>
          <Button type="button" variant="outline" size="sm" onClick={handleOpenAll}>
            すべて表示
          </Button>
        </div>

        {rows.length === 0 ? (
          <Alert>
            <AlertTitle>未解決のアラートはありません</AlertTitle>
            <AlertDescription>現在、対応が必要な残業アラートは登録されていません。</AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 divide-y divide-amber-100 overflow-hidden">
            {rows.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                onResolve={() => handleResolve(a.id)}
                pending={pending}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>未解決アラート（全件）</DialogTitle>
          </DialogHeader>
          <div className="px-1 pb-2 space-y-2">
            {fullList == null && pending ? (
              <p className="text-sm text-slate-500">読み込み中…</p>
            ) : null}
            {(fullList ?? []).map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                onResolve={() => handleResolve(a.id)}
                pending={pending}
              />
            ))}
            {fullList && fullList.length === 0 ? (
              <p className="text-sm text-slate-500">未解決のアラートはありません。</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AlertRow({
  alert,
  onResolve,
  pending,
}: {
  alert: HrOvertimeAlertView
  onResolve: () => void
  pending: boolean
}) {
  const detailHref = `${APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}?highlightEmployeeId=${alert.employeeId}`

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white/80">
      <Link
        href={detailHref}
        className="flex-1 min-w-0 space-y-1 group"
      >
        <p className="font-semibold text-slate-900 group-hover:text-primary truncate">{alert.employeeName}</p>
        <p className="text-sm text-amber-900 font-medium">{alert.alertTypeLabel}</p>
        <p className="text-xs text-slate-600">
          基準 / 実績: <span className="font-mono">{alert.thresholdDisplay}</span>
          {' · '}
          発生: {alert.triggeredAt ? formatDateInJST(alert.triggeredAt) : '—'}
        </p>
        <p className="text-xs">
          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {STATUS_LABEL[alert.statusUi]}
          </span>
        </p>
      </Link>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Link
          href={detailHref}
          className="inline-flex items-center justify-center font-medium rounded-lg border-2 border-primary text-primary hover:bg-primary-light px-4 py-2 text-sm transition-all"
        >
          詳細
        </Link>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onResolve}>
          解決済みにする
        </Button>
      </div>
    </div>
  )
}
