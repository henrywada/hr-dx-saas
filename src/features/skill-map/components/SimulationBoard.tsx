'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import type { SkillMapDraft, SkillMatrixRow } from '../types'
import { saveSkillMapDraft, confirmSkillMapDraft } from '../actions'
import { APP_ROUTES } from '@/config/routes'
import { SkillCoverageBar } from './SkillCoverageBar'

type Division = { id: string; name: string | null }

type Props = {
  draft: SkillMapDraft
  employees: SkillMatrixRow[]
  divisions: Division[]
}

function calcDivisionCoverage(
  divisionId: string,
  employees: SkillMatrixRow[],
  snapshot: Record<string, string>
): number {
  const members = employees.filter((e) => (snapshot[e.employee_id] ?? '') === divisionId)
  if (members.length === 0) return 0
  return Math.round(members.reduce((sum, m) => sum + m.coverage, 0) / members.length)
}

export function SimulationBoard({ draft, employees, divisions }: Props) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<Record<string, string>>(draft.snapshot)
  const [draftName, setDraftName] = useState(draft.name)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    setSnapshot((prev) => ({ ...prev, [String(active.id)]: String(over.id) }))
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await saveSkillMapDraft({ draftId: draft.id, name: draftName, snapshot })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }, [draft.id, draftName, snapshot])

  const handleConfirm = useCallback(async () => {
    if (!confirm('この配置を本番に適用しますか？従業員の所属部署が変更されます。')) return
    setConfirming(true)
    setError(null)
    try {
      const result = await confirmSkillMapDraft(draft.id)
      if (result.success) {
        router.push(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
      } else {
        setError(result.error ?? '適用に失敗しました')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '適用に失敗しました')
    } finally {
      setConfirming(false)
    }
  }, [draft.id, router])

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            placeholder="シミュレーション名"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200 disabled:opacity-40"
          >
            {saving ? '保存中...' : '下書き保存'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 disabled:opacity-40"
          >
            {confirming ? '適用中...' : 'この配置を適用'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">従業員</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {employees.map((emp) => (
                <div
                  key={emp.employee_id}
                  draggable
                  className="bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm"
                  data-id={emp.employee_id}
                >
                  <div className="font-medium text-sm">{emp.employee_name}</div>
                  {emp.division_name && <div className="text-xs text-gray-500">{emp.division_name}</div>}
                  <SkillCoverageBar coverage={emp.coverage} label="スキル" showPercentage />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-sm">部署</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {divisions.map((div) => {
                const coverage = calcDivisionCoverage(div.id, employees, snapshot)
                const memberCount = employees.filter(
                  (e) => (snapshot[e.employee_id] ?? '') === div.id
                ).length
                return (
                  <div
                    key={div.id}
                    className={`border-2 rounded-lg p-3 min-h-16 transition-colors ${
                      coverage < 50 && memberCount > 0
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    data-division-id={div.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{div.name ?? '未設定'}</span>
                      <span className="text-xs text-gray-500">{memberCount}名</span>
                    </div>
                    {memberCount > 0 && (
                      <SkillCoverageBar coverage={coverage} label="充足率" showPercentage />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  )
}
