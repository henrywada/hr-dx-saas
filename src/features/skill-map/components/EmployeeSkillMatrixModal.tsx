'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantSkillWithRequirements, SkillRequirement, EmployeeSkillRow } from '../types'
import {
  loadEmployeeSkillRequirementSelectionsAction,
  setEmployeeSkillRequirementSelection,
} from '../actions'
import { createClient } from '@/lib/supabase/client'

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
      const orderA = a.level?.sort_order ?? a.sort_order ?? 0
      const orderB = b.level?.sort_order ?? b.sort_order ?? 0
      if (orderA !== orderB) return orderA - orderB
      return a.id.localeCompare(b.id)
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

  // 追加：自己評価、スキルレベル、おすすめ用コース一覧のクライアント側フェッチステート
  const [selfEvals, setSelfEvals] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])

  // 追加：モーダル・ポップアップの表示ステート
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null)
  const [showRecommendModal, setShowRecommendModal] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [recommendReason, setRecommendReason] = useState('')

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

  // 既存：選択状態（有効ON）の読み込み ＆ 新規：自己評価、スキルレベル、おすすめコース一覧のフェッチ
  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    const fetchAll = async () => {
      try {
        const supabase = createClient()

        // 1. 選択状態
        const ids = await loadEmployeeSkillRequirementSelectionsAction(row.employee_id)
        if (!cancelled) setSelectedIds(new Set(ids))

        // 2. 従業員の自己評価
        const { data: evals } = await supabase
          .from('employee_skill_self_evaluations')
          .select('*')
          .eq('employee_id', row.employee_id)
        if (!cancelled && evals) setSelfEvals(evals)

        // 3. マスタ：スキルレベル
        const { data: lvls } = await supabase
          .from('skill_levels')
          .select('*')
          .order('sort_order', { ascending: true })
        if (!cancelled && lvls) setLevels(lvls)

        // 4. マスタ：公開済みeラーニングコース
        const { data: crs } = await supabase
          .from('el_courses')
          .select('id, title')
          .eq('status', 'published')
          .order('title', { ascending: true })
        if (!cancelled && crs) setCourses(crs)
      } catch (err) {
        if (!cancelled) setLoadError('情報の読み込みに失敗しました')
      }
    }

    fetchAll()

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
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
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
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      職種
                    </th>
                    <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      開始日
                    </th>
                    <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      スキル（技能要件）
                    </th>
                    <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      目標基準
                    </th>
                    <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      本人の自己評価
                    </th>
                    <th className="w-24 border border-gray-200 px-3 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      有効(ON)
                    </th>
                    <th className="w-48 border border-gray-200 px-3 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      育成支援アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrixRows.map(r => {
                    const selfEval = selfEvals.find(e => e.requirement_id === r.requirementId)
                    const selfLvlName = selfEval?.self_level_id
                      ? levels.find(l => l.id === selfEval.self_level_id)?.name
                      : null

                    return (
                      <tr key={r.requirementId} className="bg-white hover:bg-gray-50/50 transition-colors">
                        {r.showJobCell && (
                          <td
                            rowSpan={r.jobRowSpan}
                            className="border border-gray-200 px-3 py-3 align-top font-semibold text-gray-900 whitespace-normal bg-gray-50/20"
                          >
                            {r.jobName}
                          </td>
                        )}
                        {r.showJobCell && (
                          <td
                            rowSpan={r.jobRowSpan}
                            className="border border-gray-200 px-3 py-3 align-top font-mono text-xs text-gray-500 whitespace-nowrap bg-gray-50/20"
                          >
                            {r.jobStartedAt}
                          </td>
                        )}
                        {r.showSkillCell && (
                          <td
                            rowSpan={r.skillRowSpan}
                            className="border border-gray-200 px-3 py-3 align-top font-medium text-gray-800 whitespace-normal"
                          >
                            {r.skillName}
                          </td>
                        )}
                        <td className="border border-gray-200 px-3 py-3 text-gray-500 max-w-[200px] truncate">
                          {r.levelLabel}
                        </td>
                        <td className="border border-gray-200 px-3 py-3">
                          {selfEval ? (
                            <div className="space-y-0.5 border-l-2 border-emerald-300 pl-2">
                              <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {selfLvlName || '自己評価済'}
                              </span>
                              {selfEval.note && (
                                <p className="text-[10px] text-gray-500 italic max-w-[200px] truncate" title={selfEval.note}>
                                  "{selfEval.note}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">未入力</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.requirementId)}
                            disabled={isPending}
                            onChange={e => handleToggle(r.requirementId, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            aria-label={`${r.jobName} ${r.skillName} ${r.levelLabel}`}
                          />
                        </td>
                        <td className="border border-gray-200 px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowFeedbackModal(r.requirementId)}
                              className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            >
                              ✎ 応援
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowRecommendModal(r.requirementId)}
                              className="px-2 py-1 text-[10px] font-bold text-[#FD7601] bg-[#f6f8fa] hover:bg-[#FD7601]-10 border border-[#e2e6ec] rounded-md transition-colors"
                            >
                              🎓 推薦
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* フィードバック応援入力モーダル */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">フィードバック・応援を送信</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              この技能要件に関して、アドバイスや応援メッセージを従業員のスキルポータルへ直接送信します。
            </p>
            <textarea
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              placeholder="いつも頑張っていますね！この調子でステップアップしていきましょう！"
              rows={4}
              className="w-full p-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(null)
                  setFeedbackComment('')
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!feedbackComment.trim()}
                onClick={async () => {
                  if (!feedbackComment.trim()) return
                  const { addSkillFeedbackComment } = await import('@/features/skill-portal/actions')
                  const res = await addSkillFeedbackComment({
                    receiverEmployeeId: row.employee_id,
                    category: 'skill_approval',
                    relatedId: showFeedbackModal,
                    comment: feedbackComment,
                  })
                  if (res.success) {
                    alert('フィードバックを送信しました！')
                    setShowFeedbackModal(null)
                    setFeedbackComment('')
                  } else {
                    alert('送信に失敗しました: ' + (res as any).error)
                  }
                }}
                className="px-3 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* eラーニング推薦モーダル */}
      {showRecommendModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">おすすめeラーニング教材の推薦</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              この技能要件を磨くために効果的なeラーニングコンテンツを、従業員におすすめとして推薦します。
            </p>
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-600">コースの選択：</label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
              >
                <option value="">-- コースを選択 --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-gray-600">推薦の理由（任意）：</label>
              <textarea
                value={recommendReason}
                onChange={e => setRecommendReason(e.target.value)}
                placeholder="このコースで基礎を固めるのが、この技能習得の近道です。ぜひ受講してみてください！"
                rows={3}
                className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowRecommendModal(null)
                  setSelectedCourseId('')
                  setRecommendReason('')
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!selectedCourseId}
                onClick={async () => {
                  if (!selectedCourseId) return
                  const { recommendCourse } = await import('@/features/skill-portal/actions')
                  const res = await recommendCourse({
                    employeeId: row.employee_id,
                    courseId: selectedCourseId,
                    requirementId: showRecommendModal,
                    reason: recommendReason,
                  })
                  if (res.success) {
                    alert('コースの推薦を設定しました！')
                    setShowRecommendModal(null)
                    setSelectedCourseId('')
                    setRecommendReason('')
                  } else {
                    alert('推薦設定に失敗しました: ' + (res as any).error)
                  }
                }}
                className="px-3 py-2 bg-[#FD7601] text-white rounded-lg font-semibold hover:bg-[#FD7601] disabled:opacity-50 cursor-pointer"
              >
                推薦を設定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
