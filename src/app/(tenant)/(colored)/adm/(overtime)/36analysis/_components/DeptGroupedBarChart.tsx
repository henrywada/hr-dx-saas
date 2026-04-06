'use client'

/**
 * 部署別・ステータス別グループ横棒グラフ（ノンスタック版）
 *
 * 画像モックアップ準拠:
 *  - 部署ごとにグループを作成
 *  - 各ステータス（安全/注意/危険/重大/法違反）を別々の横バーで表示
 *  - クリック時にその部署・ステータスのドリルダウンを通知（オプション）
 */

import { STATUS_COLORS } from '@/utils/overtimeThresholds'
import type { OvertimeStatus } from '@/utils/overtimeThresholds'
import type { OvertimeThresholds } from '@/utils/overtimeThresholds'

// =============================================================================
// 型定義
// =============================================================================

export type DeptGroupData = {
  /** 部署のフルパス（例: SaaS開発_全社 / 東京事務所 / 人事部） */
  deptPath: string
  /** 部署ID */
  divisionId: string
  /** 各ステータスの人数 */
  counts: Record<OvertimeStatus, number>
  /** 合計人数 */
  total: number
}

type Props = {
  data: DeptGroupData[]
  thresholds: OvertimeThresholds
  onDeptClick?: (divisionId: string) => void
  selectedDivisionId?: string
}

// =============================================================================
// ステータス設定
// =============================================================================

const STATUS_CONFIG: Array<{
  key: OvertimeStatus
  label: string
  color: string
}> = [
  { key: 'safe', label: `安全（〜45h以下）`, color: STATUS_COLORS.safe },
  { key: 'warning', label: `注意（45〜60h）`, color: STATUS_COLORS.warning },
  { key: 'danger', label: `危険（60〜80h）`, color: STATUS_COLORS.danger },
  { key: 'critical', label: `重大（80〜100h）`, color: STATUS_COLORS.critical },
  { key: 'violation', label: `法違反（100h〜）`, color: STATUS_COLORS.violation },
]

// =============================================================================
// 1部署グループ
// =============================================================================

function DeptGroup({
  dept,
  maxCount,
  onClick,
  isSelected,
}: {
  dept: DeptGroupData
  maxCount: number
  onClick?: () => void
  isSelected?: boolean
}) {
  // 表示する行（count > 0 のみ）
  const rows = STATUS_CONFIG.filter((s) => dept.counts[s.key] > 0)

  // フルパスを分割して最後の部分を強調
  const pathParts = dept.deptPath.split(' / ')
  const deptShortName = pathParts.at(-1) ?? dept.deptPath
  const deptParentPath = pathParts.slice(0, -1).join(' / ')

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? 'border-2 border-rose-400 shadow-md ring-1 ring-rose-200'
          : 'border-slate-200'
      }`}
      onClick={onClick}
    >
      {/* 部署ヘッダー */}
      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <div>
          {deptParentPath && (
            <p className="text-[10px] text-slate-400 leading-none mb-0.5">
              {deptParentPath}
            </p>
          )}
          <p className="text-sm font-bold text-slate-800">{deptShortName}</p>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          合計 {dept.total}名
        </span>
      </div>

      {/* バー行 */}
      <div className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <div className="px-4 py-3 text-xs text-slate-400 italic">
            残業データなし
          </div>
        ) : (
          rows.map((seg) => {
            const count = dept.counts[seg.key]
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
            const isViolation = seg.key === 'violation'

            return (
              <div
                key={seg.key}
                className="flex items-center gap-3 px-4 py-2.5 group/row hover:bg-slate-50/60 transition-colors"
              >
                {/* カテゴリ名 */}
                <div className="w-36 shrink-0 flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isViolation ? 'text-red-700 font-bold' : 'text-slate-600'
                    }`}
                  >
                    {seg.label}
                  </span>
                </div>

                {/* バー */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: seg.color,
                        minWidth: pct > 0 ? '4px' : '0',
                        boxShadow: isViolation
                          ? `0 0 6px ${seg.color}80`
                          : undefined,
                      }}
                    />
                  </div>

                  {/* 人数 */}
                  <span
                    className={`text-sm font-bold tabular-nums w-12 text-right shrink-0 ${
                      isViolation ? 'text-red-700' : 'text-slate-700'
                    }`}
                  >
                    {count}名
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function DeptGroupedBarChart({ data, thresholds, onDeptClick, selectedDivisionId }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <p className="text-sm">表示できる部署データがありません</p>
        <p className="text-xs">別の部署レベルを選択してください</p>
      </div>
    )
  }

  // バーの基準最大値（全ステータス・全部署の最大人数）
  const maxCount = Math.max(
    ...data.flatMap((d) =>
      Object.values(d.counts).filter((v) => v > 0),
    ),
    1,
  )

  // 違反が多い順にソート（危険度の高い部署を上に）
  const sorted = [...data].sort(
    (a, b) =>
      (b.counts.violation + b.counts.critical + b.counts.danger) -
      (a.counts.violation + a.counts.critical + a.counts.danger),
  )

  return (
    <div className="space-y-4">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            部署別 残業ステータス分布
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            各部署の当月残業時間帯をステータス区分別に表示しています
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap">
          基準: 月{thresholds.monthlyLimit}h /
          平均{thresholds.averageLimit}h /
          単月{thresholds.singleMonthSpecialLimit}h
        </div>
      </div>

      {/* 部署グループリスト */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sorted.map((dept) => (
          <DeptGroup
            key={dept.divisionId}
            dept={dept}
            maxCount={maxCount}
            isSelected={selectedDivisionId === dept.divisionId}
            onClick={
              onDeptClick
                ? () => onDeptClick(dept.divisionId)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
