'use client'

import { Users, AlertOctagon, TrendingUp, BookCheck } from 'lucide-react'
import { type OvertimeKpiResult } from '@/utils/overtimeThresholds'

type Props = {
  kpi: OvertimeKpiResult
}

type KpiCardProps = {
  title: string
  value: number
  unit?: string
  icon: React.ReactNode
  accentClass: string
  bgClass: string
  note?: string
  pulse?: boolean
}

function KpiCard({
  title,
  value,
  unit = '名',
  icon,
  accentClass,
  bgClass,
  note,
  pulse,
}: KpiCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 ${bgClass}`}
    >
      {/* 背景装飾 */}
      <div
        className={`pointer-events-none absolute right-3 top-3 opacity-[0.07] ${accentClass}`}
      >
        <div className="scale-[2.8]">{icon}</div>
      </div>

      {/* アイコン */}
      <div className={`inline-flex items-center justify-center p-2.5 rounded-xl mb-4 ${accentClass} bg-white/60`}>
        <div className="w-5 h-5">{icon}</div>
      </div>

      {/* 値 */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-3xl font-extrabold tracking-tight ${
            pulse ? 'animate-pulse' : ''
          }`}
        >
          {value.toLocaleString()}
        </span>
        <span className="text-sm font-medium text-slate-500">{unit}</span>
      </div>

      {/* タイトル */}
      <p className="mt-1.5 text-sm font-semibold text-slate-700 leading-snug">{title}</p>

      {/* 補足 */}
      {note && (
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{note}</p>
      )}
    </div>
  )
}

export function KpiCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* カード1: 対象従業員数 */}
      <KpiCard
        title="対象従業員数"
        value={kpi.totalEmployees}
        icon={<Users />}
        accentClass="text-blue-600"
        bgClass="bg-white border-slate-200"
        note="選択レベル配下の全従業員"
      />

      {/* カード2: 36協定違反（確定） */}
      <KpiCard
        title="36協定 違反（確定）"
        value={kpi.violationCount}
        icon={<AlertOctagon />}
        accentClass="text-red-600"
        bgClass={
          kpi.violationCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-slate-200'
        }
        note="月100h超 / 複数月平均80h超 / 年7回超 等"
        pulse={kpi.violationCount > 0}
      />

      {/* カード3: 違反予備軍（月45h超） */}
      <KpiCard
        title="違反予備軍"
        value={kpi.warningCount}
        icon={<TrendingUp />}
        accentClass="text-amber-600"
        bgClass={
          kpi.warningCount > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-slate-200'
        }
        note="月45h超の月がある従業員数"
      />

      {/* カード4: 特別条項適用者数 */}
      <KpiCard
        title="特別条項 適用者数"
        value={kpi.specialClauseCount}
        icon={<BookCheck />}
        accentClass="text-purple-600"
        bgClass="bg-white border-slate-200"
        note="45h超月が1回以上ある従業員数"
      />
    </div>
  )
}
