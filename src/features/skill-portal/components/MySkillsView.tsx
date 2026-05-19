'use client'

import { useState } from 'react'
import type { SkillRoleApplication, SkillRequirementApplication } from '../types'
import type { TenantSkillWithRequirements, EmployeeSkillAssignment } from '@/features/skill-map/types'
import { APPLICATION_STATUS_LABEL } from '../types'
import { ApplyRoleModal } from './ApplyRoleModal'
import { ApplyRequirementModal } from './ApplyRequirementModal'

type Props = {
  skills: TenantSkillWithRequirements[]
  currentAssignments: EmployeeSkillAssignment[]
  roleApplications: SkillRoleApplication[]
  requirementApplications: SkillRequirementApplication[]
  hasApprover: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending_manager: 'bg-amber-100 text-amber-700',
  pending_hr: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
}

export function MySkillsView({
  skills,
  currentAssignments,
  roleApplications,
  requirementApplications,
  hasApprover,
}: Props) {
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [applyReqId, setApplyReqId] = useState<string | null>(null)

  const assignedSkillIds = new Set(currentAssignments.map(a => a.skill_id))
  const assignedSkills = skills.filter(s => assignedSkillIds.has(s.id))
  const reqAppByReqId = new Map(requirementApplications.map(a => [a.requirement_id, a]))
  const roleAppBySkillId = new Map(roleApplications.map(a => [a.skill_id, a]))

  return (
    <div className="space-y-8">
      {!hasApprover && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          承認者が設定されていません。申請前に人事担当者にご連絡ください。
        </div>
      )}

      {/* 職種セクション */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">割り当て済み職種</h2>
          <button
            type="button"
            onClick={() => setShowRoleModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            ＋ 職種を申請
          </button>
        </div>

        {assignedSkills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500">
            割り当て済みの職種がありません
          </p>
        ) : (
          <div className="space-y-4">
            {assignedSkills.map(skill => {
              const pending = roleAppBySkillId.get(skill.id)
              return (
                <div
                  key={skill.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3"
                    style={{ borderLeftColor: skill.color_hex, borderLeftWidth: 4 }}
                  >
                    <span
                      className="inline-block rounded px-2 py-0.5 text-sm font-semibold"
                      style={{ backgroundColor: `${skill.color_hex}20`, color: skill.color_hex }}
                    >
                      {skill.name}
                    </span>
                    {pending && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pending.status] ?? ''}`}>
                        {APPLICATION_STATUS_LABEL[pending.status]}
                      </span>
                    )}
                  </div>

                  {skill.requirements.length > 0 && (
                    <ul className="divide-y divide-gray-50 px-4">
                      {skill.requirements.map(req => {
                        const app = reqAppByReqId.get(req.id)
                        return (
                          <li key={req.id} className="flex items-center justify-between py-2.5">
                            <div className="min-w-0">
                              <span className="text-sm text-gray-800">{req.name}</span>
                              {req.level?.name && (
                                <span className="ml-1.5 text-xs text-gray-400">{req.level.name}</span>
                              )}
                            </div>
                            <div className="ml-3 shrink-0">
                              {app ? (
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? ''}`}>
                                  {APPLICATION_STATUS_LABEL[app.status]}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setApplyReqId(req.id)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  達成申請
                                </button>
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
          <h2 className="text-base font-semibold text-gray-900">申請履歴</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">種別</th>
                  <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">内容</th>
                  <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">ステータス</th>
                  <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">申請日</th>
                </tr>
              </thead>
              <tbody>
                {roleApplications.map(app => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">職種</td>
                    <td className="px-4 py-2.5 text-sm text-gray-800">{app.skill?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? ''}`}>
                        {APPLICATION_STATUS_LABEL[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{app.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
                {requirementApplications.map(app => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">要件</td>
                    <td className="px-4 py-2.5 text-sm text-gray-800">
                      {app.requirement?.skill?.name && (
                        <span className="mr-1 text-xs text-gray-400">{app.requirement.skill.name} /</span>
                      )}
                      {app.requirement?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? ''}`}>
                        {APPLICATION_STATUS_LABEL[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{app.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showRoleModal && (
        <ApplyRoleModal
          skills={skills}
          assignedSkillIds={assignedSkillIds}
          pendingSkillIds={new Set(roleApplications.filter(a => a.status !== 'rejected').map(a => a.skill_id))}
          onClose={() => setShowRoleModal(false)}
        />
      )}
      {applyReqId && (
        <ApplyRequirementModal requirementId={applyReqId} onClose={() => setApplyReqId(null)} />
      )}
    </div>
  )
}
