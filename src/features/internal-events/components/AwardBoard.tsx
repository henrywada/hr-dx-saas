import { Trophy } from 'lucide-react'
import type { Award } from '../types'

interface Props {
  awards: Award[]
}

export function AwardBoard({ awards }: Props) {
  if (awards.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        まだ表彰の発表はありません。
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <Trophy className="w-4 h-4 text-amber-500" />
        表彰発表
      </h3>
      <ul className="space-y-3">
        {awards.map(award => (
          <li key={award.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {award.period_label}
              </span>
              <span className="text-sm font-bold text-slate-900">{award.award_type}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{award.recipient_name}さん</p>
            {award.comment && <p className="text-xs text-slate-500 mt-0.5">{award.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
