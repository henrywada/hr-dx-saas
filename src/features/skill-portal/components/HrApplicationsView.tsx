'use client'

import { useState, useTransition } from 'react'
import type { SkillRoleApplication, SkillRequirementApplication } from '../types'
import {
  hrApproveRoleApplication,
  hrRejectRoleApplication,
  hrApproveRequirementApplication,
  hrRejectRequirementApplication,
} from '../actions'

type Props = {
  roleApplications: SkillRoleApplication[]
  requirementApplications: SkillRequirementApplication[]
}

type Tab = 'role' | 'requirement'

export function HrApplicationsView({ roleApplications, requirementApplications }: Props) {
  const [tab, setTab] = useState<Tab>('role')

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['role', 'requirement'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-white shadow-sm'
                : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t === 'role'
              ? `職種申請（${roleApplications.length}件）`
              : `要件申請（${requirementApplications.length}件）`}
          </button>
        ))}
      </div>

      {tab === 'role' ? (
        <HrList
          applications={roleApplications}
          renderContent={app => (
            <div>
              <p className="text-sm font-medium text-gray-900">
                {(app as SkillRoleApplication).skill?.name ?? '—'}
              </p>
              {(app as SkillRoleApplication).note && (
                <p className="mt-0.5 text-xs text-gray-500">
                  申請理由: {(app as SkillRoleApplication).note}
                </p>
              )}
              {(app as SkillRoleApplication).manager_comment && (
                <p className="mt-0.5 text-xs text-[#FD7601]">
                  上長コメント: {(app as SkillRoleApplication).manager_comment}
                </p>
              )}
            </div>
          )}
          onApprove={hrApproveRoleApplication}
          onReject={hrRejectRoleApplication}
        />
      ) : (
        <HrList
          applications={requirementApplications}
          renderContent={app => {
            const req = (app as SkillRequirementApplication).requirement
            return (
              <div>
                {req?.skill?.name && <p className="text-xs text-gray-400">{req.skill.name}</p>}
                <p className="text-sm font-medium text-gray-900">
                  {req?.name ?? '—'}
                  {req?.level?.name && (
                    <span className="ml-1 text-xs text-gray-400">（{req.level.name}）</span>
                  )}
                </p>
                {(app as SkillRequirementApplication).evidence && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    証明: {(app as SkillRequirementApplication).evidence}
                  </p>
                )}
                {(app as SkillRequirementApplication).manager_comment && (
                  <p className="mt-0.5 text-xs text-[#FD7601]">
                    上長コメント: {(app as SkillRequirementApplication).manager_comment}
                  </p>
                )}
              </div>
            )
          }}
          onApprove={hrApproveRequirementApplication}
          onReject={hrRejectRequirementApplication}
        />
      )}
    </div>
  )
}

type AnyApplication = SkillRoleApplication | SkillRequirementApplication

function HrList({
  applications,
  renderContent,
  onApprove,
  onReject,
}: {
  applications: AnyApplication[]
  renderContent: (app: AnyApplication) => React.ReactNode
  onApprove: (id: string, comment?: string) => Promise<any>
  onReject: (id: string, comment?: string) => Promise<any>
}) {
  if (applications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
        最終承認待ちの申請がありません
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {applications.map(app => (
        <HrCard
          key={app.id}
          app={app}
          renderContent={renderContent}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  )
}

function HrCard({
  app,
  renderContent,
  onApprove,
  onReject,
}: {
  app: AnyApplication
  renderContent: (app: AnyApplication) => React.ReactNode
  onApprove: (id: string, comment?: string) => Promise<any>
  onReject: (id: string, comment?: string) => Promise<any>
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const empName = app.employee?.name ?? '—'
  const empNo = app.employee?.employee_no
  const divName = (app.employee as any)?.divisions?.name

  function handle(action: 'approve' | 'reject') {
    setError(null)
    startTransition(async () => {
      const fn = action === 'approve' ? onApprove : onReject
      const result = await fn(app.id, comment.trim() || undefined)
      if (result && !result.success) setError(result.error)
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 py-4">
        <div className="mb-3 text-xs text-gray-500">
          {divName && <span>{divName} / </span>}
          <span className="font-medium text-gray-700">{empName}</span>
          {empNo && <span className="ml-1 font-mono">（{empNo}）</span>}
          <span className="ml-2">{app.created_at.slice(0, 10)} 申請</span>
        </div>
        {renderContent(app)}
      </div>
      <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          placeholder="人事コメント（任意）"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => handle('reject')}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            却下
          </button>
          <button
            type="button"
            onClick={() => handle('approve')}
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? '処理中...' : '最終承認・スキルマップに反映'}
          </button>
        </div>
      </div>
    </div>
  )
}
