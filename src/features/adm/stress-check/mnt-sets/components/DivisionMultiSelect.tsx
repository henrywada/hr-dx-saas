'use client'

import React, { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Division } from '@/features/organization/types'
import { buildDivisionFullPath } from '@/features/organization/types'

interface DivisionMultiSelectProps {
  allDivisions: Division[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

/** layer=1 の部署を起点としたチェックボックスツリー。
 *  祖先が選択済みの場合は「親が選択済み」とグレー表示し disabled にする。 */
export function DivisionMultiSelect({
  allDivisions,
  selectedIds,
  onChange,
}: DivisionMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // flat 配列 → children マップ（code 昇順でソート）
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Division[]>()
    for (const d of allDivisions) {
      const key = d.parent_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    map.forEach((v, k) =>
      map.set(
        k,
        [...v].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
      )
    )
    return map
  }, [allDivisions])

  const divMap = useMemo(() => new Map(allDivisions.map(d => [d.id, d])), [allDivisions])

  // 祖先の中に選択済み division があるか判定（暗黙カバー判定）
  const isImplicitlyCovered = (divId: string): boolean => {
    let cur = divMap.get(divId)
    while (cur?.parent_id) {
      if (selectedSet.has(cur.parent_id)) return true
      cur = divMap.get(cur.parent_id)
    }
    return false
  }

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const renderNode = (div: Division, depth: number): React.ReactNode => {
    const children = childrenMap.get(div.id) ?? []
    const isSelected = selectedSet.has(div.id)
    const implicitlyCovered = !isSelected && isImplicitlyCovered(div.id)

    return (
      <div key={div.id}>
        <label
          className={`flex items-center gap-2 py-1 rounded cursor-pointer hover:bg-slate-50 transition-colors ${implicitlyCovered ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {children.length > 0 ? (
            <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}
          <input
            type="checkbox"
            checked={isSelected}
            disabled={implicitlyCovered}
            onChange={() => toggle(div.id)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <span
            className={`text-sm ${implicitlyCovered ? 'text-slate-400 italic' : 'text-slate-700'}`}
          >
            {div.name ?? '名前未設定'}
            {div.code && <span className="text-xs text-slate-400 ml-1">({div.code})</span>}
          </span>
          {implicitlyCovered && <span className="text-xs text-slate-400">親が選択済み</span>}
        </label>
        {children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const roots = childrenMap.get(null) ?? []

  if (roots.length === 0) {
    return <p className="text-sm text-slate-400 py-2">部署情報がありません</p>
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <div className="max-h-56 overflow-y-auto px-1 py-1">
        {roots.map(root => renderNode(root, 0))}
      </div>
      {selectedIds.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2 bg-blue-50 text-xs text-blue-700 rounded-b-lg">
          {selectedIds.length} 件の部署を選択中 — 配下の部署も自動的に対象になります
        </div>
      )}
    </div>
  )
}
