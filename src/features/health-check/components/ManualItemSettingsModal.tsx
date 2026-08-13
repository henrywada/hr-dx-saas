'use client'

import { useMemo, useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { saveManualFormItems } from '@/features/health-check/actions'
import {
  DEFAULT_MANUAL_FORM_ITEM_CODES,
  KYOKAI_STANDARD_ITEMS,
  displayItemName,
  normalizeHeader,
} from '@/features/health-check/kyokai-preset'
import type { HealthCheckItem } from '@/features/health-check/types'

export function ManualItemSettingsModal({
  open,
  onOpenChange,
  items,
  selectedIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: HealthCheckItem[]
  selectedIds: string[]
}) {
  const systemByCode = useMemo(
    () => new Map(items.filter(i => i.tenant_id == null).map(i => [i.code, i])),
    [items]
  )
  const defaultIds = useMemo(
    () =>
      DEFAULT_MANUAL_FORM_ITEM_CODES.map(code => systemByCode.get(code)?.id).filter(
        (id): id is string => Boolean(id)
      ),
    [systemByCode]
  )
  const initialIds = selectedIds.length > 0 ? selectedIds : defaultIds
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialIds))
  const [pendingNames, setPendingNames] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const customItems = useMemo(
    () =>
      items.filter(i => i.tenant_id != null && !KYOKAI_STANDARD_ITEMS.some(s => s.code === i.code)),
    [items]
  )

  const filteredStandard = useMemo(() => {
    const q = query.trim()
    if (!q) return KYOKAI_STANDARD_ITEMS
    return KYOKAI_STANDARD_ITEMS.filter(s => s.header.includes(q))
  }, [query])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addCustomName() {
    const name = normalizeHeader(newName)
    if (!name) return
    const standard = KYOKAI_STANDARD_ITEMS.find(s => s.header === name)
    if (standard) {
      const id = systemByCode.get(standard.code)?.id
      if (id) {
        setChecked(prev => new Set(prev).add(id))
        setNewName('')
        return
      }
    }
    const existing = items.find(i => normalizeHeader(i.name) === name)
    if (existing) {
      setChecked(prev => new Set(prev).add(existing.id))
      setNewName('')
      return
    }
    if (!pendingNames.includes(name)) setPendingNames(prev => [...prev, name])
    setNewName('')
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const r = await saveManualFormItems({
        itemIds: [...checked],
        newItemNames: pendingNames,
      })
      if (!r.ok) {
        setError(r.error ?? '保存に失敗しました')
        return
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg p-0">
        <DialogHeader className="rounded-t-lg">
          <DialogTitle>手入力項目の設定</DialogTitle>
          <p className="sr-only">結果本表・追加検査の標準項目から、手入力に出す項目を選びます。</p>
        </DialogHeader>
        <div className="overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          <p className="text-xs text-slate-600">
            表示名は日本の標準健診項目（結果本表・追加検査）に合わせています。チェックした項目が手入力に出ます。
          </p>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="項目名で絞り込み"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-2">
            {filteredStandard.map(s => {
              const item = systemByCode.get(s.code)
              if (!item) return null
              return (
                <label
                  key={s.code}
                  className="flex items-center gap-2 px-1 py-0.5 text-xs text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  {s.header}
                </label>
              )
            })}
          </div>
          {(customItems.length > 0 || pendingNames.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">追加登録した項目</p>
              {customItems.map(item => (
                <label key={item.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  {displayItemName(item.code, item.name)}
                </label>
              ))}
              {pendingNames.map(name => (
                <div key={name} className="flex items-center justify-between gap-2 text-xs">
                  <span>{name}（未保存）</span>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-red-600"
                    onClick={() => setPendingNames(prev => prev.filter(n => n !== name))}
                  >
                    取消
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs flex-1 min-w-48">
              リストにない項目名
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                placeholder="項目名を入力"
              />
            </label>
            <Button type="button" size="sm" variant="outline" onClick={addCustomName}>
              追加
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
