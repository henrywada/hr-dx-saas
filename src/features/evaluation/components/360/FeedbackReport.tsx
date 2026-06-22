'use client'

import { useState } from 'react'
import { QUESTION_CATEGORY_LABELS, REVIEWER_TYPE_LABELS } from '@/features/evaluation/360-types'
import type { FeedbackReportData, ReviewerType } from '@/features/evaluation/360-types'

interface Props {
  subjects: Array<{
    subject_id: string
    employee_name: string
    department_name: string | null
  }>
  onSelectSubject: (subjectId: string) => Promise<FeedbackReportData | null>
}

const REVIEWER_TYPE_ORDER: ReviewerType[] = ['superior', 'peer', 'subordinate', 'self']

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100
  const color =
    score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-[#f6f8fa]0' : score > 0 ? 'bg-amber-500' : 'bg-[#f6f8fa]'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#f6f8fa] rounded-full h-2">
        <div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-[#57606a] w-8 text-right">
        {score > 0 ? score.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export function FeedbackReport({ subjects, onSelectSubject }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [report, setReport] = useState<FeedbackReportData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSelect(subjectId: string) {
    setSelectedId(subjectId)
    setLoading(true)
    const data = await onSelectSubject(subjectId)
    setReport(data)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {subjects.map(s => (
          <button
            key={s.subject_id}
            onClick={() => handleSelect(s.subject_id)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              selectedId === s.subject_id
                ? 'bg-primary text-white border-primary'
                : 'border-[#e2e6ec] text-[#57606a] hover:bg-[#f6f8fa]'
            }`}
          >
            {s.employee_name}
          </button>
        ))}
      </div>

      {!selectedId && (
        <p className="text-sm text-[#57606a] py-8 text-center">
          被評価者を選択するとレポートが表示されます
        </p>
      )}

      {loading && (
        <p className="text-sm text-[#57606a] py-8 text-center">読み込み中…</p>
      )}

      {report && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#f6f8fa] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{report.responded_count}</p>
              <p className="text-xs text-[#57606a]">回答済 / {report.total_reviewers}名</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{report.strengths.length}</p>
              <p className="text-xs text-[#57606a]">強み項目（4.0以上）</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{report.improvements.length}</p>
              <p className="text-xs text-[#57606a]">改善領域（2.5以下）</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#24292f] mb-3">設問別スコア</h4>
            <div className="space-y-3">
              {report.question_results.map(q => (
                <div key={q.question_id} className="border border-[#e2e6ec] rounded-xl p-4">
                  <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 bg-[#f6f8fa] text-[#57606a] rounded-full mr-2">
                      {QUESTION_CATEGORY_LABELS[q.category]}
                    </span>
                    <span className="text-sm text-[#24292f]">{q.question_text}</span>
                  </div>
                  <ScoreBar score={q.avg_all} />
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    {REVIEWER_TYPE_ORDER.filter(t => q.avg_by_type[t] !== undefined).map(t => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="text-xs text-[#57606a] w-12 shrink-0">
                          {REVIEWER_TYPE_LABELS[t]}
                        </span>
                        <ScoreBar score={q.avg_by_type[t]!} />
                      </div>
                    ))}
                  </div>
                  {q.comments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.comments.map((c, i) => (
                        <p key={i} className="text-xs text-[#57606a] bg-[#f6f8fa] rounded px-2 py-1">
                          「{c}」
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-green-700 mb-2">強み（4.0以上）</h4>
              {report.strengths.length === 0 ? (
                <p className="text-sm text-[#57606a]">なし</p>
              ) : (
                report.strengths.map(q => (
                  <p key={q.question_id} className="text-sm text-[#24292f] py-0.5">
                    · {q.question_text}
                    <span className="ml-1 text-green-600 font-mono text-xs">
                      ({q.avg_all.toFixed(1)})
                    </span>
                  </p>
                ))
              )}
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-amber-700 mb-2">改善領域（2.5以下）</h4>
              {report.improvements.length === 0 ? (
                <p className="text-sm text-[#57606a]">なし</p>
              ) : (
                report.improvements.map(q => (
                  <p key={q.question_id} className="text-sm text-[#24292f] py-0.5">
                    · {q.question_text}
                    <span className="ml-1 text-amber-600 font-mono text-xs">
                      ({q.avg_all.toFixed(1)})
                    </span>
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
