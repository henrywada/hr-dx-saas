'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantSkillWithRequirements, SkillRequirement, EmployeeSkillRow } from '../types'
import {
  loadEmployeeSkillRequirementSelectionsAction,
  setEmployeeSkillRequirementSelection,
} from '../actions'

type Props = {
  row: EmployeeSkillRow
  employeeLabel: string
  skillsWithRequirements: TenantSkillWithRequirements[]
  onClose: () => void
}

type MatrixRenderRow = {
  requirementId: string
  jobName: string
  /** 職種割り当ての開始日（YYYY-MM-DD）。未設定時は — */
  jobStartedAt: string
  skillName: string
  levelLabel: string
  jobRowSpan: number
  skillRowSpan: number
  showJobCell: boolean
  showSkillCell: boolean
}

/** 割り当て職種ごとの要件をフラット化し、rowspan 用メタを付与 */
function buildMatrixRenderRows(
  jobs: TenantSkillWithRequirements[],
  startedAtByJobId: Record<string, string>
): MatrixRenderRow[] {
  type Flat = { job: TenantSkillWithRequirements; req: SkillRequirement; levelLabel: string }
  const flats: Flat[] = []
  for (const job of jobs) {
    const reqs = [...job.requirements].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'ja', { numeric: true })
      if (byName !== 0) return byName
      return a.sort_order - b.sort_order
    })
    for (const req of reqs) {
      const levelLabel =
        (req.level?.name && req.level.name.trim()) ||
        (req.criteria && req.criteria.trim()) ||
        '—'
      flats.push({ job, req, levelLabel })
    }
  }

  const result: MatrixRenderRow[] = []
  for (let i = 0; i < flats.length; i++) {
    const { job, req, levelLabel } = flats[i]

    let showJobCell = false
    let jobRowSpan = 0
    if (i === 0 || flats[i - 1].job.id !== job.id) {
      showJobCell = true
      jobRowSpan = flats.filter(f => f.job.id === job.id).length
    }

    const skillGroupKey = `${job.id}\0${req.name}`
    let showSkillCell = false
    let skillRowSpan = 0
    if (i === 0 || `${flats[i - 1].job.id}\0${flats[i - 1].req.name}` !== skillGroupKey) {
      showSkillCell = true
      skillRowSpan = flats.filter(f => f.job.id === job.id && f.req.name === req.name).length
    }

    result.push({
      requirementId: req.id,
      jobName: job.name,
      jobStartedAt: startedAtByJobId[job.id] ?? '—',
      skillName: req.name,
      levelLabel,
      jobRowSpan,
      skillRowSpan,
      showJobCell,
      showSkillCell,
    })
  }
  return result
}

export function EmployeeSkillMatrixModal({
  row,
  employeeLabel,
  skillsWithRequirements,
  onClose,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const assignedSkillIds = useMemo(() => new Set(Object.keys(row.currentAssignments)), [row])

  const jobsForEmployee = useMemo(
    () =>
      skillsWithRequirements
        .filter(j => assignedSkillIds.has(j.id))
        .sort((a, b) => a.sort_order - b.sort_order),
    [skillsWithRequirements, assignedSkillIds]
  )

  const startedAtByJobId = useMemo(() => {
    const m: Record<string, string> = {}
    for (const [skillId, a] of Object.entries(row.currentAssignments)) {
      m[skillId] = a.started_at
    }
    return m
  }, [row.currentAssignments])

  const matrixRows = useMemo(
    () => buildMatrixRenderRows(jobsForEmployee, startedAtByJobId),
    [jobsForEmployee, startedAtByJobId]
  )

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    ;(async () => {
      try {
        const ids = await loadEmployeeSkillRequirementSelectionsAction(row.employee_id)
        if (!cancelled) setSelectedIds(new Set(ids))
      } catch {
        if (!cancelled) setLoadError('選択状態の読み込みに失敗しました')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [row.employee_id])

  function handleToggle(requirementId: string, checked: boolean) {
    setActionError(null)
    startTransition(async () => {
      const res = await setEmployeeSkillRequirementSelection({
        employeeId: row.employee_id,
        requirementId,
        selected: checked,
      })
      if ('error' in res) {
        setActionError(res.error)
        return
      }
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (checked) next.add(requirementId)
        else next.delete(requirementId)
        return next
      })
      router.refresh()
    })
  }

  const noAssignedJobs = jobsForEmployee.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">スキル編集</h2>
            <p className="text-sm text-gray-500">{employeeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loadError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>
          )}
          {actionError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
          )}

          {noAssignedJobs ? (
            <p className="text-sm text-gray-600">
              職種が割り当てられていません。「✏️ 編集」または「＋ 割り当て」から職種を設定してください。
            </p>
          ) : matrixRows.length === 0 ? (
            <p className="text-sm text-gray-600">
              割り当て職種に登録された技能要件がありません。職種テンプレートの取り込み、または職種詳細で要件を登録してください。
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-800">
                      職種
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-800 whitespace-nowrap">
                      開始日
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-800">
                      スキル
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-800">
                      レベル
                    </th>
                    <th className="w-24 border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-800">
                      有効(ON)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map(r => (
                    <tr key={r.requirementId} className="bg-white hover:bg-gray-50/80">
                      {r.showJobCell && (
                        <td
                          rowSpan={r.jobRowSpan}
                          className="border border-gray-300 px-3 py-2 align-top font-medium whitespace-normal text-gray-900"
                        >
                          {r.jobName}
                        </td>
                      )}
                      {r.showJobCell && (
                        <td
                          rowSpan={r.jobRowSpan}
                          className="border border-gray-300 px-3 py-2 align-top font-mono text-xs whitespace-nowrap text-gray-800"
                        >
                          {r.jobStartedAt}
                        </td>
                      )}
                      {r.showSkillCell && (
                        <td
                          rowSpan={r.skillRowSpan}
                          className="border border-gray-300 px-3 py-2 align-top whitespace-normal text-gray-800"
                        >
                          {r.skillName}
                        </td>
                      )}
                      <td className="border border-gray-300 px-3 py-2 text-gray-700">
                        {r.levelLabel}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.requirementId)}
                          disabled={isPending}
                          onChange={e => handleToggle(r.requirementId, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary"
                          aria-label={`${r.jobName} ${r.skillName} ${r.levelLabel}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
