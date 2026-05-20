'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Compass,
  CheckCircle2,
  BookOpen,
  Award,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { SkillRoleApplication, SkillRequirementApplication } from '../types'
import type {
  TenantSkillWithRequirements,
  EmployeeSkillAssignment,
} from '@/features/skill-map/types'
import { APPLICATION_STATUS_LABEL } from '../types'
import { ApplyRoleModal } from './ApplyRoleModal'
import { ApplyRequirementModal } from './ApplyRequirementModal'
import { saveEmployeeCareerGoal } from '@/features/skill-map/actions'

type Props = {
  skills: TenantSkillWithRequirements[]
  currentAssignments: EmployeeSkillAssignment[]
  roleApplications: SkillRoleApplication[]
  requirementApplications: SkillRequirementApplication[]
  hasApprover: boolean
  elAchievedRequirementIds: Set<string>
  employeeId: string
  initialCareerGoals: any[]
  mappedCourses: Array<{ course_id: string; course_title: string; requirement_id: string }>
}

const STATUS_COLORS: Record<string, string> = {
  pending_manager: 'bg-amber-50 text-amber-700 border-amber-200/60',
  pending_hr: 'bg-blue-50 text-blue-700 border-blue-200/60',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  rejected: 'bg-red-50 text-red-600 border-red-200/60',
}

export function MySkillsView({
  skills,
  currentAssignments,
  roleApplications,
  requirementApplications,
  hasApprover,
  elAchievedRequirementIds,
  employeeId,
  initialCareerGoals,
  mappedCourses,
}: Props) {
  const [activeTab, setActiveTab] = useState<'skills' | 'career'>('skills')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [applyReqId, setApplyReqId] = useState<string | null>(null)

  // キャリア目標の管理
  const [careerGoals, setCareerGoals] = useState<any[]>(initialCareerGoals)
  const [selectedTargetSkillId, setSelectedTargetSkillId] = useState<string>(
    initialCareerGoals[0]?.target_skill_id || ''
  )
  const [targetDate, setTargetDate] = useState<string>(
    initialCareerGoals[0]?.target_date || ''
  )
  const [isPending, startTransition] = useTransition()

  const assignedSkillIds = new Set(currentAssignments.map(a => a.skill_id))
  const assignedSkills = skills.filter(s => assignedSkillIds.has(s.id))
  const reqAppByReqId = new Map(requirementApplications.map(a => [a.requirement_id, a]))
  const roleAppBySkillId = new Map(roleApplications.map(a => [a.skill_id, a]))

  // 技能要件が達成済みかどうかを判定
  const isRequirementAchieved = (reqId: string) => {
    return (
      elAchievedRequirementIds.has(reqId) ||
      reqAppByReqId.get(reqId)?.status === 'approved'
    )
  }

  // 目標職種の保存処理
  const handleSaveGoal = async () => {
    if (!selectedTargetSkillId) return

    startTransition(async () => {
      const res = await saveEmployeeCareerGoal({
        employeeId,
        targetSkillId: selectedTargetSkillId,
        targetDate: targetDate || null,
      })

      if (res.success) {
        const targetSkill = skills.find(s => s.id === selectedTargetSkillId)
        setCareerGoals([
          {
            employee_id: employeeId,
            target_skill_id: selectedTargetSkillId,
            target_date: targetDate || null,
            skill_name: targetSkill?.name || '目標職種',
          },
        ])
        alert('目標職種・キャリア目標を設定しました！')
      } else {
        alert('目標の保存に失敗しました: ' + (res as any).error)
      }
    })
  }

  // 選択された目標職種の要件詳細
  const targetSkillDetail = skills.find(s => s.id === selectedTargetSkillId)

  // ギャップ分析用のレーダーチャートデータ計算
  const radarData = useMemo(() => {
    if (!targetSkillDetail || targetSkillDetail.requirements.length === 0) return []

    // カテゴリごとに集計
    const categoryStats: Record<string, { total: number; achieved: number }> = {}

    for (const req of targetSkillDetail.requirements) {
      const cat = req.category || '全般・共通'
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, achieved: 0 }
      }
      categoryStats[cat].total++
      if (isRequirementAchieved(req.id)) {
        categoryStats[cat].achieved++
      }
    }

    return Object.entries(categoryStats).map(([category, stats]) => ({
      subject: category,
      '現在の達成要件数': stats.achieved,
      '目標職種に必要な総要件数': stats.total,
      fullMark: stats.total,
    }))
  }, [targetSkillDetail, elAchievedRequirementIds, requirementApplications])

  // 不足しているスキル要件 ＆ 紐づくeラーニングのレコメンド抽出
  const missingRequirementsWithRecommendations = useMemo(() => {
    if (!targetSkillDetail) return []

    return targetSkillDetail.requirements
      .filter(req => !isRequirementAchieved(req.id))
      .map(req => {
        // eラーニングのマッピング
        const recommendations = mappedCourses.filter(c => c.requirement_id === req.id)
        return {
          ...req,
          recommendations,
        }
      })
  }, [targetSkillDetail, elAchievedRequirementIds, requirementApplications, mappedCourses])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* サブナビゲーション・タブ */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'skills'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          保有スキル・申請
        </button>
        <button
          onClick={() => setActiveTab('career')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'career'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Compass className="w-4 h-4" />
          キャリア・シミュレータ
        </button>
      </div>

      {!hasApprover && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/75 p-4 text-sm text-amber-800 flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
          <span>承認者が設定されていません。申請前に人事担当者にご連絡ください。</span>
        </div>
      )}

      {/* --- TAB 1: 保有スキル・申請 --- */}
      {activeTab === 'skills' && (
        <div className="space-y-8 animate-fade-in">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Award className="w-4.5 h-4.5 text-primary" />
                  現在の割り当て職種・技能クリア状況
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 max-w-[65ch]">
                  現在アサインされている職種と、各技能要件のクリア状況です。未達成の技能をクリックして申請が行えます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/95 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                ＋ 新たな職種を申請
              </button>
            </div>

            {assignedSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500 shadow-inner">
                <p>割り当て済みの職種がありません</p>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(true)}
                  className="mt-3 text-xs text-primary font-semibold hover:underline"
                >
                  職種希望を申請する
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {assignedSkills.map(skill => {
                  const pending = roleAppBySkillId.get(skill.id)
                  return (
                    <div
                      key={skill.id}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* サイドストライプを廃止。インジケーターサークルと背景トーンで洗練された印象に */}
                      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/30 px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: skill.color_hex }}
                          />
                          <span className="text-sm font-bold text-gray-800">
                            {skill.name}
                          </span>
                        </div>
                        {pending && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[pending.status] ?? ''}`}
                          >
                            {APPLICATION_STATUS_LABEL[pending.status]}
                          </span>
                        )}
                      </div>

                      {skill.requirements.length > 0 && (
                        <ul className="divide-y divide-gray-100 px-4 py-1">
                          {skill.requirements.map(req => {
                            const app = reqAppByReqId.get(req.id)
                            const isAchieved = isRequirementAchieved(req.id)
                            return (
                              <li key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                                <div className="min-w-0 flex items-start gap-2.5">
                                  {isAchieved ? (
                                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-200 shrink-0 mt-0.5 bg-gray-50/50" />
                                  )}
                                  <div className="min-w-0">
                                    <span className={`text-sm ${isAchieved ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                      {req.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      {req.level?.name && (
                                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded font-medium">
                                          レベル: {req.level.name}
                                        </span>
                                      )}
                                      {req.category && (
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-medium">
                                          {req.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-center">
                                  {elAchievedRequirementIds.has(req.id) && (
                                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold">
                                      eラーニング修了
                                    </span>
                                  )}
                                  {app ? (
                                    <span
                                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[app.status] ?? ''}`}
                                    >
                                      {APPLICATION_STATUS_LABEL[app.status]}
                                    </span>
                                  ) : (
                                    !isAchieved && (
                                      <button
                                        type="button"
                                        onClick={() => setApplyReqId(req.id)}
                                        className="text-xs text-primary font-bold hover:underline py-1 px-2.5 rounded-md hover:bg-primary/5 transition-colors"
                                      >
                                        達成申請する
                                      </button>
                                    )
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 申請履歴 */}
          {(roleApplications.length > 0 || requirementApplications.length > 0) && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-gray-900">申請・承認ステータス履歴</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50/75 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">種別</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">申請内容</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">ステータス</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">申請日</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {roleApplications.map(app => (
                        <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 font-medium">職種希望</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                            {app.skill?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[app.status] ?? ''}`}
                            >
                              {APPLICATION_STATUS_LABEL[app.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                            {app.created_at.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                      {requirementApplications.map(app => (
                        <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 font-medium">技能クリア</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {app.requirement?.skill?.name && (
                              <span className="mr-1.5 text-xs text-gray-400">
                                [{app.requirement.skill.name}]
                              </span>
                            )}
                            <span className="font-semibold">{app.requirement?.name ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[app.status] ?? ''}`}
                            >
                              {APPLICATION_STATUS_LABEL[app.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                            {app.created_at.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* --- TAB 2: キャリア・シミュレータ --- */}
      {activeTab === 'career' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* キャリアガイダンス説明 */}
          <div className="rounded-xl border border-blue-100 bg-linear-to-r from-blue-50/40 to-indigo-50/10 p-5 shadow-sm">
            <div className="flex gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-950">
                  キャリア目標 ＆ スキルギャップシミュレータ
                </h4>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed max-w-[75ch]">
                  将来目指したい職種を「目標」として設定できます。
                  現在の自身の保有スキルとの差分が多角的なレーダーチャートに変換され、**「何が強みで、どのカテゴリを伸ばせば目標に届くか」**がクリアに可視化されます。
                  さらに、不足技能に関連付けられた **おすすめeラーニング教材** が自動レコメンドされます。
                </p>
              </div>
            </div>
          </div>

          {/* 目標職種設定カード */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-blue-600" />
              現在のキャリアパス目標設定
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">目標とする職種・ロール：</label>
                <select
                  value={selectedTargetSkillId}
                  onChange={e => setSelectedTargetSkillId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  <option value="">-- 目標とする職種を選択 --</option>
                  {skills.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" /> 目標達成の希望時期（目安）：
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={isPending || !selectedTargetSkillId}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <SaveGoalIcon isPending={isPending} />
                キャリア目標を設定・保存
              </button>
            </div>
          </div>

          {selectedTargetSkillId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* レーダーチャート */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    スキルカテゴリ別充足率ギャップ
                  </h4>
                </div>

                {radarData.length > 0 ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fontSize: 9, fill: '#4b5563' }}
                          tickFormatter={value => (value.length > 8 ? `${value.slice(0, 7)}…` : value)}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fontSize: 9 }} />
                        <Radar
                          name="あなたの保有要件"
                          dataKey="現在の達成要件数"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.25}
                        />
                        <Radar
                          name="目標職種の必要要件"
                          dataKey="目標職種に必要な総要件数"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.12}
                        />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 9, marginTop: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-400 py-20 border border-dashed border-gray-100 rounded-lg">
                    要件定義が存在しません。
                  </p>
                )}
              </div>

              {/* 不足要件＆レコメンド */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[340px]">
                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 shrink-0">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                  不足スキル要件 ＆ 推奨eラーニング教材
                </h4>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                  {missingRequirementsWithRecommendations.length === 0 ? (
                    <div className="text-center py-16 text-emerald-600 font-bold text-xs bg-emerald-50/40 rounded-xl border border-dashed border-emerald-100">
                      🎉 素晴らしい！目標職種の要件をすべてクリアしています！
                    </div>
                  ) : (
                    missingRequirementsWithRecommendations.map(req => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">
                              {req.category || '共通要件'}
                            </span>
                            <h5 className="text-xs font-bold text-gray-800 mt-1">{req.name}</h5>
                          </div>
                          {req.level?.name && (
                            <span className="text-[10px] text-gray-500 font-bold shrink-0 bg-gray-100 px-1.5 rounded">
                              {req.level.name}
                            </span>
                          )}
                        </div>

                        {/* 推奨されるeラーニング教材 */}
                        {req.recommendations.length > 0 ? (
                          <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 space-y-1.5">
                            <p className="text-[9px] text-blue-600 font-bold flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> おすすめの学習コンテンツ
                            </p>
                            {req.recommendations.map((course: any) => (
                              <a
                                key={course.course_id}
                                href={`/el-courses/${course.course_id}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100/60 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all text-[10px] font-semibold"
                              >
                                <span className="truncate mr-2">{course.course_title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-gray-400 mt-1 italic flex items-center gap-1 bg-white p-1.5 rounded border border-gray-100">
                            <Clock className="w-2.5 h-2.5" /> 研修コンテンツを準備中です。
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl bg-white shadow-sm">
              <Compass className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              「目標とする職種」を選択すると、<br />スキルギャップ分析とおすすめ教材が表示されます
            </div>
          )}
        </div>
      )}

      {/* --- 各モーダル --- */}
      {showRoleModal && (
        <ApplyRoleModal
          skills={skills}
          assignedSkillIds={assignedSkillIds}
          pendingSkillIds={
            new Set(roleApplications.filter(a => a.status !== 'rejected').map(a => a.skill_id))
          }
          onClose={() => setShowRoleModal(false)}
        />
      )}
      {applyReqId && (
        <ApplyRequirementModal requirementId={applyReqId} onClose={() => setApplyReqId(null)} />
      )}
    </div>
  )
}

function SaveGoalIcon({ isPending }: { isPending: boolean }) {
  if (isPending) {
    return <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
  }
  return <CheckCircle2 className="w-3.5 h-3.5" />
}
