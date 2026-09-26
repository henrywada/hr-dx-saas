'use client'

import { LogIn } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatDateTimeInJST } from '@/lib/datetime'
import type { LoginSession } from '../queries'
import { formatStayDuration, toStaySeconds } from '../session'
import { LoginLogPeriodSelector } from './LoginLogPeriodSelector'

interface LoginLogsViewProps {
  sessions: LoginSession[]
  yearMonth: string | null
}

type LoginSessionRow = LoginSession & { stay_seconds: number | null }

export function LoginLogsView({ sessions, yearMonth }: LoginLogsViewProps) {
  const rows: LoginSessionRow[] = sessions.map(s => ({
    ...s,
    stay_seconds: toStaySeconds(s.logged_in_at, s.last_activity_at),
  }))

  const columns: Column<LoginSessionRow>[] = [
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
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">ログイン履歴</h1>
          <p className="text-sm text-[#57606a] mt-1">
            誰が・いつログインし、どのくらい利用したか（推定）を年月で絞り込んで確認できます
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-none p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#57606a]">対象年月</span>
          <LoginLogPeriodSelector yearMonth={yearMonth} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-[#57606a]">
            ログイン履歴一覧
            <span className="text-xs text-[#57606a] ml-2">({rows.length}件)</span>
          </span>
        </div>
        <p className="text-xs text-[#57606a]">
          滞在時間は、ログイン後の最後の操作時刻までの推定値です（ログアウトしない場合や、30分を超える無操作は、その手前までを集計）。
        </p>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={rows} getRowId={item => item.id} />
        </div>
      </div>
    </div>
  )
}
