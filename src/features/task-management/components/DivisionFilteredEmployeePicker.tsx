'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface DivisionOption {
  id: string
  name: string
  parentId: string | null
  layer: number
}

interface FlatDivisionOption {
  id: string
  /** ドロップダウン表示用（階層インデント付き） */
  label: string
  depth: number
}

interface DivisionFilteredEmployeePickerProps {
  employees: EmployeeOption[]
  employeeDivisionById: Record<string, string | null>
  divisions: DivisionOption[]
  value: string
  onChange: (employeeId: string) => void
  /** 氏名検索欄の右に並べる操作（例: 「追加」ボタン） */
  action?: ReactNode
}

/**
 * divisions を parent_id に基づく木構造の深さ優先順に平坦化し、
 * 階層インデント付きラベルを付与する。
 * （layer 列のソートだけでは兄弟が親をまたいで並び、同名部署が区別できない）
 */
function flattenDivisionsInTreeOrder(divisions: DivisionOption[]): FlatDivisionOption[] {
  const byParent = new Map<string | null, DivisionOption[]>()
  for (const d of divisions) {
    const key = d.parentId
    const list = byParent.get(key) ?? []
    list.push(d)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }

  const result: FlatDivisionOption[] = []
  const visited = new Set<string>()

  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? []
    for (const child of children) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      const indent = '\u3000'.repeat(depth) // 全角スペースで階層を表現
      const branch = depth === 0 ? '' : '└ '
      result.push({
        id: child.id,
        depth,
        label: `${indent}${branch}${child.name}`,
      })
      walk(child.id, depth + 1)
    }
  }

  walk(null, 0)

  // 親が一覧に無い孤児ノードも末尾に追加（データ不整合時のフォールバック）
  for (const d of divisions) {
    if (visited.has(d.id)) continue
    result.push({ id: d.id, depth: 0, label: d.name })
  }

  return result
}

/** 指定組織とその子孫 division id の集合を返す */
function collectDivisionAndDescendantIds(rootId: string, divisions: DivisionOption[]): Set<string> {
  const childrenByParent = new Map<string | null, string[]>()
  for (const d of divisions) {
    const list = childrenByParent.get(d.parentId) ?? []
    list.push(d.id)
    childrenByParent.set(d.parentId, list)
  }

  const result = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId)
    }
  }
  return result
}

/** 組織階層（division）で従業員を絞り込んでから選択する2段階ピッカー。 */
export function DivisionFilteredEmployeePicker({
  employees,
  employeeDivisionById,
  divisions,
  value,
  onChange,
  action,
}: DivisionFilteredEmployeePickerProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState('')

  const treeOptions = useMemo(() => flattenDivisionsInTreeOrder(divisions), [divisions])

  const filteredEmployees = useMemo(() => {
    if (!selectedDivisionId) return employees
    const allowed = collectDivisionAndDescendantIds(selectedDivisionId, divisions)
    return employees.filter(e => {
      const divId = employeeDivisionById[e.id]
      return divId != null && allowed.has(divId)
    })
  }, [selectedDivisionId, employees, employeeDivisionById, divisions])

  return (
    <div className="space-y-1.5">
      <select
        value={selectedDivisionId}
        onChange={e => setSelectedDivisionId(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
      >
        <option value="">すべての組織</option>
        {treeOptions.map(d => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <EmployeePicker employees={filteredEmployees} value={value} onChange={onChange} />
        </div>
        {action}
      </div>
    </div>
  )
}
