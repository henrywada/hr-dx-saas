'use client'

import type { SkillGrowthMilestone } from '../types'

interface MilestoneTimelineProps {
  milestones: SkillGrowthMilestone[]
  isManager: boolean
  onProposeMilestone?: () => void
}

function statusIcon(status: SkillGrowthMilestone['status']) {
  if (status === 'completed') return '✅'
  if (status === 'in_progress') return '⏳'
  if (status === 'proposed') return '💬'
  return '🔒'
}

function statusLabel(status: SkillGrowthMilestone['status']) {
  const map: Record<string, string> = {
    completed: '完了',
    in_progress: '進行中',
    confirmed: '予定',
    proposed: '提案中（承認待ち）',
    changed: '変更済み',
  }
  return map[status] ?? status
}

export function MilestoneTimeline({
  milestones,
  isManager,
  onProposeMilestone,
}: MilestoneTimelineProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700">育成ロードマップ</h3>
        {isManager && (
          <button
            onClick={onProposeMilestone}
            className="text-xs text-primary border border-primary rounded px-2 py-1 hover:bg-[#f6f8fa] transition-colors"
          >
            ＋ ステップ変更・追加
          </button>
        )}
      </div>

      {milestones.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          マイルストーンがまだ設定されていません
        </p>
      )}

      <div className="relative">
        {milestones.map((m, idx) => (
          <div key={m.id} className="flex gap-3 mb-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200 text-base flex-shrink-0">
                {statusIcon(m.status)}
              </div>
              {idx < milestones.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-4" />
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">{m.title}</span>
                <span
                  className={`text-xs rounded px-2 py-0.5 font-medium ${
                    m.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : m.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-700'
                        : m.status === 'proposed'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {statusLabel(m.status)}
                </span>
              </div>
              {m.target_date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  目標:{' '}
                  {new Date(m.target_date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
              {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
