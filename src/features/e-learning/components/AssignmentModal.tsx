'use client'

import { useState, useTransition } from 'react'
import { X, Search } from 'lucide-react'
import { assignEmployees } from '../actions'

interface Employee {
  id: string
  name: string
  division_id: string | null
}

interface Props {
  courseId: string
  employees: Employee[]
  onClose: () => void
}

export function AssignmentModal({ courseId, employees, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
    }
  }

  const handleSubmit = () => {
    if (selected.size === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await assignEmployees(courseId, Array.from(selected), dueDate || undefined)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'アサインに失敗しました')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">受講者をアサイン</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="従業員名で検索"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <button onClick={toggleAll} className="hover:text-blue-600 underline text-xs">
              {selected.size === filtered.length ? 'すべて解除' : 'すべて選択'}
            </button>
            <span>{selected.size}名選択中</span>
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto">
            {filtered.map(emp => (
              <label
                key={emp.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(emp.id)}
                  onChange={() => toggle(emp.id)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">{emp.name}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">該当する従業員がいません</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">受講期限（任意）</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || selected.size === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {isPending ? 'アサイン中...' : `${selected.size}名をアサイン`}
          </button>
        </div>
      </div>
    </div>
  )
}
