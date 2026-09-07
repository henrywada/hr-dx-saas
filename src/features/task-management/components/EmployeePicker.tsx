'use client'

import { useEffect, useRef, useState } from 'react'
import { filterEmployeesByName, type EmployeeOption } from '../employee-filter'

interface EmployeePickerProps {
  employees: EmployeeOption[]
  value: string
  onChange: (employeeId: string) => void
  placeholder?: string
}

/**
 * 氏名で検索して従業員1名を選択するコンボボックス。
 * 候補は props で渡された employees をクライアント側でフィルタする（サーバー往復なし）。
 */
export function EmployeePicker({ employees, value, onChange, placeholder }: EmployeePickerProps) {
  const [query, setQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = employees.find(e => e.id === value) ?? null
  const candidates = filterEmployeesByName(employees, query)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(employee: EmployeeOption) {
    onChange(employee.id)
    setQuery('')
    setIsEditing(false)
    setIsOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return

    if (e.key === 'Enter') {
      // フォームの送信を防ぎ、候補が1件以上あれば先頭を選択する
      e.preventDefault()
      if (candidates.length > 0) handleSelect(candidates[0])
      return
    }

    if (e.key === 'Escape') {
      setIsOpen(false)
      setIsEditing(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={isEditing ? query : (selected?.name ?? '')}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          setIsEditing(true)
          setQuery('')
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? '氏名で検索'}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-md">
          {candidates.length === 0 ? (
            <li className="px-2.5 py-1.5 text-xs text-slate-400">該当する従業員がいません</li>
          ) : (
            candidates.map(employee => (
              <li key={employee.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(employee)}
                  className="block w-full px-2.5 py-1.5 text-left text-xs hover:bg-[#f6f8fa]"
                >
                  {employee.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
