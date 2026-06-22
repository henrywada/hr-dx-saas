'use client'

import { useMemo, useState, useEffect, useTransition } from 'react'
import { AlertCircle, BarChart3, HelpCircle, Users, Award, TrendingDown } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { getSkillBottleneckAnalysisAction } from '../actions'
import type { TenantSkillWithRequirements } from '../types'

type Props = {
  skills: TenantSkillWithRequirements[]
  divisions: Array<{ id: string; name: string; pathLabel: string }>
}

type BottleneckItem = {
  requirement_id: string
  requirement_name: string
  category: string | null
  level_name: string | null
  assigned_employee_count: number
  completed_employee_count: number
  uncompleted_employee_count: number
  completion_rate: number
}

export function BottleneckView({ skills, divisions }: Props) {
  const [divisionId, setDivisionId] = useState('all')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [data, setData] = useState<BottleneckItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 職種の初期値
  useEffect(() => {
    if (skills.length > 0 && !selectedSkillId) {
      setSelectedSkillId(skills[0].id)
    }
  }, [skills, selectedSkillId])

  // データフェッチ
  useEffect(() => {
    if (!selectedSkillId) return

    startTransition(async () => {
      setError(null)
      const res = await getSkillBottleneckAnalysisAction({
        divisionId: divisionId === 'all' ? undefined : divisionId,
        skillId: selectedSkillId,
      })

      if (res.success) {
        setData(res.bottleneckData)
      } else {
        setError((res as any).error)
        setData([])
      }
    })
  }, [divisionId, selectedSkillId])

  // Recharts用データ成形
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.requirement_name,
      '達成率 (%)': item.completion_rate,
      '未達成者 (名)': item.uncompleted_employee_count,
    }))
  }, [data])

  const selectedSkill = skills.find(s => s.id === selectedSkillId)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 説明ガイダンス */}
      <div className="rounded-xl border border-[#e2e6ec] bg-linear-to-r from-blue-50/40 to-indigo-50/10 p-5 shadow-sm">
        <div className="flex gap-3">
          <HelpCircle className="h-5 w-5 text-[#FD7601] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-[#24292f]">組織スキルボトルネック分析</h4>
            <p className="text-xs text-[#FD7601] mt-1 leading-relaxed max-w-[75ch]">
              選択した職種・部門に所属するメンバー全体をスキャンし、**「どの技能要件が特にクリアできていないか（達成率が低いか）」**をボトルネックとして可視化します。
              未達成者が多く、クリア率が極めて低い項目（ボトルネック）を特定することで、社内研修やeラーニングの優先アサインターゲット、または中途採用で獲得すべきピンポイントスキルの特定など、実効性の高い育成・採用投資を可能にします。
            </p>
          </div>
        </div>
      </div>

      {/* フィルター条件 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            対象組織・部門（フィルタ）
          </label>
          <select
            value={divisionId}
            onChange={e => setDivisionId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
          >
            <option value="all">全組織（すべて）</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.pathLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-gray-400" />
            分析する職種・ロール
          </label>
          <select
            value={selectedSkillId}
            onChange={e => setSelectedSkillId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
          >
            {skills.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ローディング、エラー、空状態 */}
      {isPending ? (
        <div className="flex flex-col items-center py-24 text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-xs font-semibold">スキルデータを集計しています...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 shadow-sm">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <span className="font-bold">データの取得に失敗しました:</span>
          <p className="text-xs mt-1 text-red-500 font-mono">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center text-xs text-gray-500 shadow-inner">
          対象の組織・職種にアサインされた従業員、またはスキル要件定義が見つかりません。
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 左: Recharts チャート */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <BarChart3 className="h-4.5 w-4.5 text-primary shrink-0" />
              <h4 className="text-sm font-bold text-gray-800">
                スキル要件の充足度分布（達成率が低いボトルネック順）
              </h4>
            </div>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="#9ca3af" fontSize={10} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 500 }}
                    stroke="#e5e7eb"
                    tickFormatter={value => (value.length > 10 ? `${value.slice(0, 9)}…` : value)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1f2937' }}
                  />
                  <Bar dataKey="達成率 (%)" radius={[0, 4, 4, 0]} barSize={12}>
                    {chartData.map((entry, index) => {
                      const rate = entry['達成率 (%)']
                      // インペカブルなカラーリング：30%未満は赤、60%未満は鮮やかな琥珀、それ以上はブルー
                      const fill = rate < 30 ? '#ef4444' : rate < 60 ? '#f59e0b' : '#3b82f6'
                      return <Cell key={`cell-${index}`} fill={fill} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 右: 要件ごとの未充足者ランキング・詳細リスト */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[460px]">
            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 shrink-0">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
              最優先での育成・配置が必要なスキル
            </h4>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {data.map((item, idx) => {
                const badgeColor =
                  item.completion_rate < 30
                    ? 'bg-red-50 text-red-700 border-red-100'
                    : item.completion_rate < 60
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-[#f6f8fa] text-[#FD7601] border-[#e2e6ec]'

                return (
                  <div
                    key={item.requirement_id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 hover:border-gray-200 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-mono text-gray-400 font-bold">RANK {idx + 1}</span>
                        {item.level_name && (
                          <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold">
                            {item.level_name}
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[9px] bg-[#f6f8fa] text-[#57606a] px-1.5 rounded font-semibold">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-800 mt-1.5 truncate" title={item.requirement_name}>
                        {item.requirement_name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        達成: <span className="font-bold text-gray-700">{item.completed_employee_count}</span>名 / 未達成: <span className="font-bold text-red-500">{item.uncompleted_employee_count}</span>名
                      </p>
                    </div>

                    <div className={`text-right shrink-0 px-2 py-1 rounded-lg border text-[11px] font-bold ${badgeColor}`}>
                      {item.completion_rate}%
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-400 mt-3 flex items-center justify-between shrink-0">
              <span className="font-medium">※ アサイン従業員総数: {data[0]?.assigned_employee_count || 0} 名</span>
              <span className="font-medium">充足率が低い順</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
