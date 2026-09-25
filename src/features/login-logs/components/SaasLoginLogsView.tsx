'use client'

import { LogIn } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatDateTimeInJST } from '@/lib/datetime'
import type { SaasLoginLog } from '../queries'
import { LOGIN_LOG_MAX_ROWS } from '../params'
import { LoginLogPeriodSelector } from './LoginLogPeriodSelector'
import { LoginLogTenantSelector } from './LoginLogTenantSelector'
import { LoginLogPurgePanel } from './LoginLogPurgePanel'

interface SaasLoginLogsViewProps {
  logs: SaasLoginLog[]
  yearMonth: string | null
  tenantId: string | null
  tenantOptions: { id: string; name: string }[]
  /** 削除パネルを表示できるか（developer のみ） */
  canPurge: boolean
}

const columns: Column<SaasLoginLog>[] = [
  {
    key: 'logged_in_at',
    label: '日時',
    sortable: true,
    render: val => <span className="text-[#24292f]">{formatDateTimeInJST(val)}</span>,
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
  logs,
  yearMonth,
  tenantId,
  tenantOptions,
  canPurge,
}: SaasLoginLogsViewProps) {
  const isCapped = logs.length >= LOGIN_LOG_MAX_ROWS

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">
          ログイン履歴（全テナント）
        </h1>
        <p className="text-sm text-[#57606a] mt-1">
          全テナントのログイン履歴を年月・テナントで絞り込んで確認できます
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
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-[#57606a]">
            ログイン履歴一覧
            <span className="text-xs text-[#57606a] ml-2">({logs.length.toLocaleString()}件)</span>
          </span>
        </div>
        {isCapped && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            新しい {LOGIN_LOG_MAX_ROWS.toLocaleString()} 件のみ表示しています。年月やテナントで絞り込んでください。
          </p>
        )}
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={logs} getRowId={item => item.id} />
        </div>
      </div>

      {canPurge && <LoginLogPurgePanel />}
    </div>
  )
}
