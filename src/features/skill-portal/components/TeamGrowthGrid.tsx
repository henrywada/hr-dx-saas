'use client'

import Link from 'next/link'
import type { TeamMemberGrowthCard } from '../types'
import { APP_ROUTES } from '@/config/routes'

interface TeamGrowthGridProps {
  cards: TeamMemberGrowthCard[]
}

function statusBadge(status: TeamMemberGrowthCard['status']) {
  const config = {
    consultation: { label: '🚨 相談あり', className: 'bg-red-100 text-red-700' },
    on_track: { label: '✅ 順調', className: 'bg-green-100 text-green-700' },
    in_progress: { label: '⏳ 進行中', className: 'bg-yellow-100 text-yellow-700' },
    no_goal: { label: '⚪ 目標未設定', className: 'bg-gray-100 text-gray-500' },
  }
  return config[status]
}

export function TeamGrowthGrid({ cards }: TeamGrowthGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        担当メンバーがいません。承認者マスタを確認してください。
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gray-600 mb-3">担当メンバーの育成状況</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(card => {
          const badge = statusBadge(card.status)
          return (
            <Link
              key={card.employee_id}
              href={APP_ROUTES.TENANT.SKILL_JOURNEY(card.employee_id)}
              className="block bg-white border rounded-xl p-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800">{card.employee_name ?? '—'}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {card.goal_skill_name
                  ? `目標: ${card.goal_skill_name}${card.goal_deadline ? ` ・ 期限 ${new Date(card.goal_deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })}` : ''}`
                  : '目標未設定'}
              </p>
              <div className="bg-[#FD7601]-10 rounded-full h-1.5 overflow-hidden mb-1">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${card.achievement_rate}%` }}
                />
              </div>
              <p className="text-xs text-primary font-semibold">{card.achievement_rate}% 達成</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
