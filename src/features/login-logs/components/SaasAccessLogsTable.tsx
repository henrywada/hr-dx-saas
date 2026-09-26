'use client'

import { useMemo } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatDateTimeInJST } from '@/lib/datetime'
import {
  buildPageNameResolver,
  toAccessLogRow,
  type AccessLog,
  type AccessLogRow,
  type ServiceRoute,
} from '../access-log'

const MARK = '●'

const columns: Column<AccessLogRow>[] = [
  {
    key: 'created_at',
    label: '表示日時',
    sortable: true,
    render: val => <span className="text-[#24292f]">{formatDateTimeInJST(val)}</span>,
  },
  {
    key: 'is_login',
    label: 'ログイン',
    sortable: true,
    render: val => <span className="text-primary">{val ? MARK : ''}</span>,
  },
  {
    key: 'is_logout',
    label: 'ログアウト',
    sortable: true,
    render: val => <span className="text-[#57606a]">{val ? MARK : ''}</span>,
  },
  {
    key: 'page_name',
    label: 'ページ名',
    sortable: true,
    render: val => <span className="text-[#24292f]">{val ?? ''}</span>,
  },
  {
    key: 'page_path',
    label: 'GETページPath',
    sortable: true,
    render: val => <span className="font-mono text-xs text-[#24292f] break-all">{val ?? ''}</span>,
  },
  {
    key: 'operation',
    label: '重要操作',
    sortable: true,
    render: val => <span className="font-medium text-[#24292f]">{val ?? ''}</span>,
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

interface SaasAccessLogsTableProps {
  logs: AccessLog[]
  serviceRoutes: ServiceRoute[]
}

export function SaasAccessLogsTable({ logs, serviceRoutes }: SaasAccessLogsTableProps) {
  const rows = useMemo(() => {
    const resolvePageName = buildPageNameResolver(serviceRoutes)
    return logs.map(log => toAccessLogRow(log, resolvePageName))
  }, [logs, serviceRoutes])
  return <DataTable columns={columns} data={rows} getRowId={item => item.id} />
}
