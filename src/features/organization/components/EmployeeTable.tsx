'use client'

import React, { useState, useMemo, useTransition, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Users, Filter, Mail } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { Division, Employee, AppRole } from '../types'
import { ACTIVE_STATUS_LABELS } from '../types'
import { deleteEmployee, resendEmployeeInviteEmail } from '../actions'
import { EmployeeFormDialog } from './EmployeeFormDialog'

interface EmployeeTableProps {
  employees: Employee[]
  divisions: Division[]
  appRoles: AppRole[]
  tenantId: string
  employeeCapacity: {
    limit: number | null
    registered_user_count: number
    company_doctor_count: number
    remaining: number | null
  }
}

type SortColumn =
  | 'division'
  | 'employee_no'
  | 'name'
  | 'sex'
  | 'start_date'
  | 'is_manager'
  | 'job_title'
  | 'app_role'
  | 'active_status'
type SortDirection = 'asc' | 'desc' | null

export function EmployeeTable({
  employees,
  divisions,
  appRoles,
  tenantId,
  employeeCapacity,
}: EmployeeTableProps) {
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDivision, setFilterDivision] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    employee?: Employee
  }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [resendTarget, setResendTarget] = useState<Employee | null>(null)
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(
    null
  )

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        if (sortDirection === 'asc') setSortDirection('desc')
        else if (sortDirection === 'desc') {
          setSortColumn(null)
          setSortDirection(null)
        } else setSortDirection('asc')
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
    },
    [sortColumn, sortDirection]
  )

  const filteredEmployees = useMemo(() => {
    const divisionSortKey = (emp: Employee) => {
      const n = emp.division?.name?.trim()
      return n && n.length > 0 ? n : '\uffff'
    }

    const list = employees.filter(emp => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          emp.name?.toLowerCase().includes(q) ||
          emp.employee_no?.toLowerCase().includes(q) ||
          emp.job_title?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterDivision) {
        if (filterDivision === '__unassigned__') {
          if (emp.division_id) return false
        } else {
          if (emp.division_id !== filterDivision) return false
        }
      }
      if (filterStatus && emp.active_status !== filterStatus) return false
      return true
    })

    const sorted = [...list]

    if (sortColumn && sortDirection) {
      const dir = sortDirection === 'asc' ? 1 : -1
      sorted.sort((a, b) => {
        let av = ''
        let bv = ''
        switch (sortColumn) {
          case 'division':
            av = a.division?.name ?? ''
            bv = b.division?.name ?? ''
            break
          case 'employee_no':
            av = a.employee_no ?? ''
            bv = b.employee_no ?? ''
            return av.localeCompare(bv, 'ja', { numeric: true }) * dir
          case 'name':
            av = a.name ?? ''
            bv = b.name ?? ''
            break
          case 'sex':
            av = a.sex ?? ''
            bv = b.sex ?? ''
            break
          case 'start_date':
            av = a.start_date ?? ''
            bv = b.start_date ?? ''
            break
          case 'is_manager':
            return ((a.is_manager ? 1 : 0) - (b.is_manager ? 1 : 0)) * dir
          case 'job_title':
            av = a.job_title ?? ''
            bv = b.job_title ?? ''
            break
          case 'app_role':
            av = a.app_role?.name ?? ''
            bv = b.app_role?.name ?? ''
            break
          case 'active_status':
            av = a.active_status ?? ''
            bv = b.active_status ?? ''
            break
        }
        return av.localeCompare(bv, 'ja') * dir
      })
    } else {
      sorted.sort((a, b) => {
        const dd = divisionSortKey(a).localeCompare(divisionSortKey(b), 'ja')
        if (dd !== 0) return dd
        const ma = a.is_manager === true ? 1 : 0
        const mb = b.is_manager === true ? 1 : 0
        if (ma !== mb) return mb - ma
        const na = (a.employee_no ?? '').trim()
        const nb = (b.employee_no ?? '').trim()
        const naKey = na === '' ? '\uffff' : na
        const nbKey = nb === '' ? '\uffff' : nb
        return naKey.localeCompare(nbKey, 'ja', { numeric: true })
      })
    }

    return sorted
  }, [employees, searchQuery, filterDivision, filterStatus, sortColumn, sortDirection])

  const handleDelete = (employee: Employee) => {
    setDeleteTarget(employee)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteEmployee(deleteTarget.id)
      setDeleteTarget(null)
    })
  }

  const confirmResend = () => {
    if (!resendTarget) return
    startTransition(async () => {
      const result = await resendEmployeeInviteEmail(resendTarget.id)
      setResendTarget(null)
      setResendResult({
        success: result.success,
        message: result.success
          ? `${resendTarget.name} へ招待メールを再送しました`
          : `送信失敗: ${result.error}`,
      })
      setTimeout(() => setResendResult(null), 4000)
    })
  }

  const columns: Column<Employee>[] = [
    {
      key: 'division_id' as keyof Employee,
      label: '部署',
      sortable: true,
      render: (_, emp) => {
        const divisionObj = emp.division as { id: string; name: string | null } | null | undefined
        return (
          <div className="text-[#57606a] hidden md:block">
            {divisionObj?.name || <span className="text-amber-500 text-xs">未所属</span>}
          </div>
        )
      },
    },
    {
      key: 'employee_no' as keyof Employee,
      label: '社員番号',
      sortable: true,
      render: val => <div className="font-mono text-xs text-[#57606a]">{val || '---'}</div>,
    },
    {
      key: 'name' as keyof Employee,
      label: '氏名',
      sortable: true,
      render: val => <div className="font-medium text-[#24292f]">{val || '名前未設定'}</div>,
    },
    {
      key: 'sex' as keyof Employee,
      label: '性別',
      sortable: true,
      render: val => <div className="text-[#57606a] hidden md:block">{val || '---'}</div>,
    },
    {
      key: 'start_date' as keyof Employee,
      label: '入社日',
      sortable: true,
      render: val => <div className="text-[#57606a] hidden md:block">{val || '---'}</div>,
    },
    {
      key: 'is_manager' as keyof Employee,
      label: '管理者',
      sortable: true,
      render: val => (
        <div className="text-center text-[#24292f] hidden md:block whitespace-nowrap">
          {val === true ? (
            <span className="text-xs leading-none text-[#24292f]" aria-label="管理者">
              ●
            </span>
          ) : (
            <span className="text-[#8b949e]">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'job_title' as keyof Employee,
      label: '役職',
      sortable: true,
      render: val => <div className="text-[#57606a] hidden lg:block">{val || '---'}</div>,
    },
    {
      key: 'app_role' as keyof Employee,
      label: 'アプリロール',
      sortable: true,
      render: (_, emp) => (
        <div className="text-[#57606a] hidden lg:block">{(emp.app_role as any)?.name || '---'}</div>
      ),
    },
    {
      key: 'active_status' as keyof Employee,
      label: 'ステータス',
      sortable: true,
      render: val => {
        const status = ACTIVE_STATUS_LABELS[val as string] || {
          label: val || '---',
          color: 'bg-[#f6f8fa] text-[#57606a]',
        }
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        )
      },
    },
    {
      key: 'id' as keyof Employee,
      label: '操作',
      width: 'w-24',
      render: (_, emp) => (
        <div className="flex justify-end gap-1">
          {emp.user_id && (
            <button
              onClick={() => setResendTarget(emp)}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-green-600 hover:bg-green-50 transition-colors"
              title="招待メール再送"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setDialogState({ open: true, employee: emp })}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-primary hover:bg-primary-light transition-colors"
            title="編集"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(emp)}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-red-600 hover:bg-red-50 transition-colors"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">従業員管理</h1>
          <p className="text-sm text-[#57606a] mt-1">従業員情報の一覧・追加・編集ができます</p>
        </div>
        <button
          onClick={() => setDialogState({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          従業員を追加
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-none p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#57606a]">
          <span>
            最大登録数：
            <span className="font-semibold text-[#24292f]">
              {employeeCapacity.limit === null ? '—' : employeeCapacity.limit}
            </span>
          </span>
          <span className="text-[#8b949e] hidden sm:inline">|</span>
          <span>
            登録ユーザ数：
            <span className="font-semibold text-[#24292f]">
              {employeeCapacity.registered_user_count}
            </span>
          </span>
          <span className="text-[#8b949e] hidden sm:inline">|</span>
          <span>
            産業医：
            <span className="font-semibold text-[#24292f]">
              {employeeCapacity.company_doctor_count}
            </span>
          </span>
          <span className="text-[#8b949e] hidden sm:inline">|</span>
          <span>
            残：
            <span
              className={`font-semibold ${
                employeeCapacity.remaining === null
                  ? 'text-[#57606a]'
                  : employeeCapacity.remaining > 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
              }`}
            >
              {employeeCapacity.remaining === null ? '—' : employeeCapacity.remaining}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#57606a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="氏名・社員番号で検索..."
              className="flex-1 px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#57606a]" />
            <select
              value={filterDivision}
              onChange={e => setFilterDivision(e.target.value)}
              className="px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
            >
              <option value="">全部署</option>
              <option value="__unassigned__">未所属</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
            >
              <option value="">全ステータス</option>
              {Object.entries(ACTIVE_STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-[#57606a]">
            従業員一覧
            <span className="text-xs text-[#57606a] ml-2">({filteredEmployees.length}名)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredEmployees}
            searchable={false}
            selectable={true}
            selectedIds={new Set()}
            onSelectChange={() => {}}
            sortKey={sortColumn as keyof Employee | null}
            sortOrder={sortDirection}
            onSortChange={(key, order) => {
              if (key) {
                handleSort(key as SortColumn)
                if (order === null && sortColumn === key && sortDirection === 'desc') {
                  setSortColumn(null)
                  setSortDirection(null)
                }
              }
            }}
            itemsPerPage={1000}
            getRowId={item => item.id}
          />
        </div>
      </div>

      {/* Employee Form Dialog */}
      <EmployeeFormDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false })}
        employee={dialogState.employee}
        divisions={divisions}
        appRoles={appRoles}
        tenantId={tenantId}
      />

      {/* 結果トースト */}
      {resendResult && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            resendResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          {resendResult.message}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[#e2e6ec]">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#24292f]">従業員を削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">「{deleteTarget.name}」</span>を削除しますか？
                </p>
                <p className="text-xs text-red-600 mt-1">この操作は取り消せません。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-accent-teal transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resend Email Confirmation Dialog */}
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setResendTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[#e2e6ec]">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#24292f] flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                招待メール再送
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-bold">「{resendTarget.name}」</span>
                  へ招待メールを再送しますか？
                </p>
                <p className="text-xs text-green-700 mt-1">
                  新しいパスワード設定リンク（有効期限2週間）を送信します。
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setResendTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-accent-teal transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmResend}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '送信中...' : '再送する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
