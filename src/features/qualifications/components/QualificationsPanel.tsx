'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  assignEmployeeQualification,
  createQualification,
  deleteEmployeeQualification,
} from '../actions'
import type { EmployeeQualificationRow, QualificationMaster } from '../types'

interface EmployeeOption {
  id: string
  name: string
}

interface Props {
  masters: QualificationMaster[]
  rows: EmployeeQualificationRow[]
  employees: EmployeeOption[]
}

export function QualificationsPanel({ masters, rows, employees }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const [masterName, setMasterName] = useState('')
  const [issuingBody, setIssuingBody] = useState('')
  const [renewalYears, setRenewalYears] = useState('')

  const [employeeId, setEmployeeId] = useState('')
  const [qualificationId, setQualificationId] = useState('')
  const [acquiredDate, setAcquiredDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [certNumber, setCertNumber] = useState('')

  function handleCreateMaster(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await createQualification({
        name: masterName,
        issuingBody: issuingBody || undefined,
        renewalYears: renewalYears ? Number(renewalYears) : undefined,
      })
      if (result.success) {
        setMasterName('')
        setIssuingBody('')
        setRenewalYears('')
        router.refresh()
      } else {
        setMessage(result.error ?? '登録に失敗しました')
      }
    })
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await assignEmployeeQualification({
        employeeId,
        qualificationId,
        acquiredDate: acquiredDate || undefined,
        expiryDate: expiryDate || undefined,
        certNumber: certNumber || undefined,
      })
      if (result.success) {
        setEmployeeId('')
        setQualificationId('')
        setAcquiredDate('')
        setExpiryDate('')
        setCertNumber('')
        router.refresh()
      } else {
        setMessage(result.error ?? '割当に失敗しました')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この資格登録を削除しますか？')) return
    startTransition(async () => {
      await deleteEmployeeQualification(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-xs text-red-600">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={handleCreateMaster} className="rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">資格マスタ登録</h3>
          <input
            value={masterName}
            onChange={e => setMasterName(e.target.value)}
            placeholder="資格名"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            required
          />
          <input
            value={issuingBody}
            onChange={e => setIssuingBody(e.target.value)}
            placeholder="発行機関（任意）"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
          <input
            type="number"
            min={1}
            value={renewalYears}
            onChange={e => setRenewalYears(e.target.value)}
            placeholder="更新周期（年・任意）"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white disabled:opacity-50"
          >
            マスタ追加
          </button>
        </form>

        <form onSubmit={handleAssign} className="rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">従業員への資格登録</h3>
          <select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            required
          >
            <option value="">従業員を選択</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select
            value={qualificationId}
            onChange={e => setQualificationId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            required
          >
            <option value="">資格を選択</option>
            {masters.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={acquiredDate} onChange={e => setAcquiredDate(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs" />
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs" />
          </div>
          <input
            value={certNumber}
            onChange={e => setCertNumber(e.target.value)}
            placeholder="認定番号（任意）"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isPending || masters.length === 0}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white disabled:opacity-50"
          >
            登録
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">従業員</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">資格</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">取得日</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">有効期限</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">登録された資格はありません</td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{row.employee_name}</div>
                    {row.division_name && <div className="text-[10px] text-gray-400">{row.division_name}</div>}
                  </td>
                  <td className="px-4 py-2 text-gray-800">{row.qualification_name}</td>
                  <td className="px-4 py-2 text-gray-600">{row.acquired_date ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={row.is_expired ? 'text-red-600 font-medium' : row.is_expiring_soon ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                      {row.expiry_date ?? '—'}
                      {row.is_expired && '（期限切れ）'}
                      {!row.is_expired && row.is_expiring_soon && '（90日以内）'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => handleDelete(row.id)} disabled={isPending} className="text-red-600 hover:underline disabled:opacity-50">
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
