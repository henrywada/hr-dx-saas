'use client'

import { useState, useTransition } from 'react'
import { setCampaignStatus } from '@/features/evaluation/360-actions'
import { createClient } from '@/lib/supabase/client'
import { CampaignFormModal } from './CampaignFormModal'
import { QuestionEditor } from './QuestionEditor'
import { SubjectReviewerSetup } from './SubjectReviewerSetup'
import { FeedbackReport } from './FeedbackReport'
import type {
  Review360Campaign,
  CampaignDetail,
  FeedbackReportData,
} from '@/features/evaluation/360-types'
import { CAMPAIGN_STATUS_LABELS } from '@/features/evaluation/360-types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  campaigns: Review360Campaign[]
  employees: Employee[]
}

type AdminTab = 'questions' | 'subjects' | 'report'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-[#f6f8fa] text-[#57606a]',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-[#f6f8fa] text-[#57606a]',
}

export function CampaignDashboard({ campaigns, employees }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Review360Campaign | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Review360Campaign | null>(null)
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('questions')
  const [loading, setLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function selectCampaign(c: Review360Campaign) {
    setSelectedCampaign(c)
    setActiveTab('questions')
    setLoading(true)
    const supabase = createClient()
    const { get360CampaignDetail } = await import('@/features/evaluation/360-queries')
    const d = await get360CampaignDetail(supabase as any, c.id)
    setDetail(d)
    setLoading(false)
  }

  async function fetchReport(subjectId: string): Promise<FeedbackReportData | null> {
    const supabase = createClient()
    const { get360FeedbackReport } = await import('@/features/evaluation/360-queries')
    return get360FeedbackReport(supabase as any, subjectId)
  }

  function handleStatusChange(campaignId: string, newStatus: 'open' | 'closed') {
    const msg =
      newStatus === 'open'
        ? 'キャンペーンを公開します。公開後は設問の変更ができません。よろしいですか？'
        : 'キャンペーンをクローズします。よろしいですか？'
    if (!confirm(msg)) return
    setStatusError('')
    startTransition(async () => {
      const result = await setCampaignStatus(campaignId, newStatus)
      if (result.success === false) { setStatusError(result.error); return }
      setSelectedCampaign(prev => (prev ? { ...prev, status: newStatus } : null))
      setDetail(prev => (prev ? { ...prev, status: newStatus } : null))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#24292f]">360度評価</h1>
          <p className="text-sm text-[#57606a]">キャンペーン管理・フィードバックレポート</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90"
        >
          + キャンペーン作成
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-[#57606a] px-1">キャンペーン一覧</h2>
          {campaigns.length === 0 && (
            <p className="text-sm text-[#57606a] py-4 text-center">キャンペーンがありません</p>
          )}
          {campaigns.map(c => (
            <div
              key={c.id}
              onClick={() => selectCampaign(c)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedCampaign?.id === c.id
                  ? 'border-primary bg-primary/5'
                  : 'border-[#e2e6ec] hover:bg-[#f6f8fa]'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium text-[#24292f]">{c.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[c.status] ?? ''}`}
                >
                  {CAMPAIGN_STATUS_LABELS[c.status]}
                </span>
              </div>
              <p className="text-xs text-[#57606a] mt-1">期限: {c.deadline}</p>
            </div>
          ))}
        </div>

        <div className="col-span-2">
          {!selectedCampaign && (
            <div className="flex items-center justify-center h-48 text-[#57606a] text-sm border border-dashed border-[#e2e6ec] rounded-xl">
              左のキャンペーンを選択してください
            </div>
          )}

          {selectedCampaign && (
            <div className="border border-[#e2e6ec] rounded-xl overflow-hidden">
              <div className="bg-[#f6f8fa] px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#24292f]">{selectedCampaign.name}</h3>
                  <p className="text-xs text-[#57606a]">
                    期限: {selectedCampaign.deadline}
                    {selectedCampaign.is_anonymous && ' · 匿名有効'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedCampaign.status === 'draft' && (
                    <>
                      <button
                        onClick={() => setEditingCampaign(selectedCampaign)}
                        className="text-xs px-3 py-1 border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa]"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedCampaign.id, 'open')}
                        disabled={isPending}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        公開する
                      </button>
                    </>
                  )}
                  {selectedCampaign.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange(selectedCampaign.id, 'closed')}
                      disabled={isPending}
                      className="text-xs px-3 py-1 bg-[#f6f8fa] text-white rounded-lg hover:bg-[#f6f8fa] disabled:opacity-50"
                    >
                      クローズ
                    </button>
                  )}
                </div>
              </div>

              {statusError && <p className="px-4 py-2 text-red-500 text-sm">{statusError}</p>}

              <div className="flex border-b border-[#e2e6ec]">
                {(
                  [
                    ['questions', '設問管理'],
                    ['subjects', '対象者・評価者'],
                    ['report', 'レポート'],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-primary text-primary font-medium'
                        : 'text-[#57606a] hover:text-[#24292f]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {loading && (
                  <p className="text-sm text-[#57606a] py-8 text-center">読み込み中…</p>
                )}
                {!loading && detail && (
                  <>
                    {activeTab === 'questions' && (
                      <QuestionEditor
                        campaignId={selectedCampaign.id}
                        initialQuestions={detail.questions}
                        disabled={selectedCampaign.status !== 'draft'}
                      />
                    )}
                    {activeTab === 'subjects' && (
                      <SubjectReviewerSetup
                        campaignId={selectedCampaign.id}
                        subjects={detail.subjects}
                        employees={employees}
                        disabled={selectedCampaign.status === 'closed'}
                      />
                    )}
                    {activeTab === 'report' && (
                      <FeedbackReport
                        subjects={detail.subjects.map(s => ({
                          subject_id: s.id,
                          employee_name: s.employee_name,
                          department_name: s.department_name,
                        }))}
                        onSelectSubject={fetchReport}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CampaignFormModal onClose={() => setShowCreateModal(false)} />
      )}
      {editingCampaign && (
        <CampaignFormModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
        />
      )}
    </div>
  )
}
