'use client'

import { LogIn } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatDateTimeInJST } from '@/lib/datetime'
import type { SaasLoginSession } from '../queries'
import { formatStayDuration, toStaySeconds } from '../session'
import { LOGIN_LOG_MAX_ROWS, type LogView } from '../params'
import type { AccessLog, ServiceRoute } from '../access-log'
import { LoginLogPeriodSelector } from './LoginLogPeriodSelector'
import { LoginLogTenantSelector } from './LoginLogTenantSelector'
import { LoginLogPurgePanel } from './LoginLogPurgePanel'
import { LoginLogViewSelector } from './LoginLogViewSelector'
import { SaasAccessLogsTable } from './SaasAccessLogsTable'

interface SaasLoginLogsViewProps {
  /** 表示種別: sessions=Log in/out, pages=ページ閲覧 */
  view: LogView
  sessions: SaasLoginSession[]
  accessLogs: AccessLog[]
  /** ページ名の照合用（view=pages のときのみ取得） */
  serviceRoutes: ServiceRoute[]
  yearMonth: string | null
  tenantId: string | null
  tenantOptions: { id: string; name: string }[]
  /** 削除パネルを表示できるか（developer のみ） */
  canPurge: boolean
}

type SaasLoginSessionRow = SaasLoginSession & { stay_seconds: number | null }

const columns: Column<SaasLoginSessionRow>[] = [
  {
    key: 'logged_in_at',
    label: 'ログイン日時',
    sortable: true,
    render: val => <span className="text-[#24292f]">{formatDateTimeInJST(val)}</span>,
  },
  {
    key: 'last_activity_at',
    label: '最終操作時刻',
    sortable: true,
    render: val => <span className="text-[#24292f]">{formatDateTimeInJST(val)}</span>,
  },
  {
    key: 'stay_seconds',
    label: '滞在時間（推定）',
    sortable: true,
    render: val => <span className="text-[#24292f]">{formatStayDuration(val)}</span>,
  },
  {
    key: 'employee_name',
    label: 'ユーザー名',
    sortable: true,
    render: val => <span className="font-medium text-[#24292f]">{val || '---'}</span>,
  },
  {
    key: 'email',
    label: 'メールアドレス',
    sortable: true,
    render: val => <span className="text-[#57606a]">{val || '---'}</span>,
  },
  {
    key: 'tenant_name',
    label: 'テナント名',
    sortable: true,
    render: val => <span className="text-[#57606a]">{val || '---'}</span>,
  },
]

export function SaasLoginLogsView({
  view,
  sessions,
  accessLogs,
  serviceRoutes,
  yearMonth,
  tenantId,
  tenantOptions,
  canPurge,
}: SaasLoginLogsViewProps) {
  const rows: SaasLoginSessionRow[] = sessions.map(s => ({
    ...s,
    stay_seconds: toStaySeconds(s.logged_in_at, s.last_activity_at),
  }))
  const isPages = view === 'pages'
  const listCount = isPages ? accessLogs.length : rows.length
  const isCapped = listCount >= LOGIN_LOG_MAX_ROWS

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">
          ログイン履歴（全テナント）
        </h1>
        <p className="text-sm text-[#57606a] mt-1">
          全テナントのログイン履歴と利用時間（推定）を年月・テナントで絞り込んで確認できます
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-none p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#57606a]">対象年月</span>
            <LoginLogPeriodSelector yearMonth={yearMonth} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#57606a]">テナント</span>
            <LoginLogTenantSelector tenantId={tenantId} options={tenantOptions} />
          </div>
          <LoginLogViewSelector view={view} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-[#57606a]">
            {isPages ? 'ページ閲覧・操作履歴一覧' : 'ログイン履歴一覧'}
            <span className="text-xs text-[#57606a] ml-2">({listCount.toLocaleString()}件)</span>
          </span>
        </div>
        {isCapped && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            新しい {LOGIN_LOG_MAX_ROWS.toLocaleString()} 件のみ表示しています。年月やテナントで絞り込んでください。
          </p>
        )}
        {!isPages && (
          <p className="text-xs text-[#57606a]">
            滞在時間は、ログイン後の最後の操作時刻までの推定値です（ログアウトしない場合や、30分を超える無操作は、その手前までを集計）。
          </p>
        )}
        <div className="overflow-x-auto">
          {isPages ? (
            <SaasAccessLogsTable logs={accessLogs} serviceRoutes={serviceRoutes} />
          ) : (
            <DataTable columns={columns} data={rows} getRowId={item => item.id} />
          )}
        </div>
      </div>

      {canPurge && <LoginLogPurgePanel />}
    </div>
  )
}
