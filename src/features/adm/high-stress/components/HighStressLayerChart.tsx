'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { HighStressEmployee, DivisionNode } from '../queries'

interface Props {
  data: HighStressEmployee[]
  divisionStats: DivisionNode[]
  submissionCounts: Record<string, number>
  targetLayer: number | null
}

interface ChartEntry {
  path: string
  divisionName: string
  totalEmployees: number
  submittedCount: number
  highStressCount: number
}

function buildChildrenMap(nodes: DivisionNode[]) {
  const map = new Map<string | null, DivisionNode[]>()
  nodes.forEach(n => {
    const arr = map.get(n.parent_id) ?? []
    arr.push(n)
    map.set(n.parent_id, arr)
  })
  return map
}

function getAllDescendantIds(
  id: string,
  childrenMap: Map<string | null, DivisionNode[]>
): Set<string> {
  const result = new Set<string>([id])
  for (const child of childrenMap.get(id) ?? []) {
    getAllDescendantIds(child.id, childrenMap).forEach(d => result.add(d))
  }
  return result
}

function buildPath(id: string, nodeMap: Map<string, DivisionNode>): string {
  const parts: string[] = []
  let current: string | null = id
  while (current) {
    const node = nodeMap.get(current)
    if (!node) break
    parts.unshift(node.name)
    current = node.parent_id
  }
  return parts.join('/')
}

function getEffectiveDivisions(
  nodes: DivisionNode[],
  targetLayer: number | null,
  childrenMap: Map<string | null, DivisionNode[]>
): DivisionNode[] {
  if (targetLayer === null) {
    return nodes.filter(n => n.parent_id === null)
  }
  const atLayer = nodes.filter(n => n.layer === targetLayer)
  const shallowLeaves = nodes.filter(n => {
    if (n.layer === null || n.layer >= targetLayer) return false
    return (childrenMap.get(n.id) ?? []).length === 0
  })
  return [...atLayer, ...shallowLeaves]
}

// 3層重ね棒: 灰（全体）→ 青（実施者）→ 赤（高ストレス者）
const TripleBar = (props: any) => {
  const { x, y, width, height, totalEmployees, submittedCount, highStressCount } = props
  if (!width || width <= 0) return null
  const subW = totalEmployees > 0 ? Math.round((submittedCount / totalEmployees) * width) : 0
  const hsW = totalEmployees > 0 ? Math.round((highStressCount / totalEmployees) * width) : 0
  const bh = Math.max(height - 6, 10)
  const by = y + (height - bh) / 2
  return (
    <g>
      <rect x={x} y={by} width={width} height={bh} fill="#e5e7eb" rx={4} />
      {subW > 0 && <rect x={x} y={by} width={subW} height={bh} fill="#93c5fd" rx={4} />}
      {hsW > 0 && <rect x={x} y={by} width={hsW} height={bh} fill="#ef4444" rx={4} />}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ChartEntry
  const notSubmitted = d.totalEmployees - d.submittedCount
  const rate = d.submittedCount > 0 ? Math.round((d.highStressCount / d.submittedCount) * 100) : 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[220px]">
      <p className="font-bold text-gray-800 mb-2 text-xs leading-snug break-all">{d.path}</p>
      <p className="text-blue-600">
        実施者：<span className="font-bold">{d.submittedCount}名</span>
      </p>
      <p className="text-gray-500">
        未実施者：<span className="font-bold">{notSubmitted}名</span>
      </p>
      <p className="text-red-500">
        高ストレス者：<span className="font-bold">{d.highStressCount}名</span>
      </p>
      <p className="text-gray-400 text-xs mt-1">高ストレス率（実施者比）：{rate}%</p>
    </div>
  )
}

export default function HighStressLayerChart({
  data,
  divisionStats,
  submissionCounts,
  targetLayer,
}: Props) {
  const nodeMap = new Map(divisionStats.map(d => [d.id, d]))
  const childrenMap = buildChildrenMap(divisionStats)
  const effectiveDivs = getEffectiveDivisions(divisionStats, targetLayer, childrenMap)

  const chartData: ChartEntry[] = effectiveDivs
    .map(div => {
      const descendantIds = getAllDescendantIds(div.id, childrenMap)
      const totalEmployees = Array.from(descendantIds).reduce(
        (sum, id) => sum + (nodeMap.get(id)?.directEmployeeCount ?? 0),
        0
      )
      const submittedCount = Array.from(descendantIds).reduce(
        (sum, id) => sum + (submissionCounts[id] ?? 0),
        0
      )
      const highStressCount = data.filter(
        e => e.division_id && descendantIds.has(e.division_id)
      ).length
      return {
        path: buildPath(div.id, nodeMap),
        divisionName: div.name,
        totalEmployees,
        submittedCount,
        highStressCount,
      }
    })
    .sort((a, b) => b.totalEmployees - a.totalEmployees)

  const maxTotal = Math.max(...chartData.map(d => d.totalEmployees), 1)
  const chartHeight = Math.max(180, chartData.length * 64)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-linear-to-b from-indigo-500 to-purple-600 rounded-full" />
          組織別 実施者・未実施者・高ストレス者分布
        </h2>
        <p className="text-xs text-gray-400 mt-0.5 pl-4">
          {targetLayer === null ? '全組織（ルートレベル）の集計' : `組織層 ${targetLayer} の集計`}
        </p>
      </div>

      <div className="flex gap-5 text-xs font-medium text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#e5e7eb]" />
          未実施者（全体）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#93c5fd]" />
          実施者
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#ef4444]" />
          高ストレス者
        </span>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, maxTotal + 1]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="path"
            width={200}
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
          <Bar dataKey="totalEmployees" barSize={32} shape={<TripleBar />} />
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-1.5">
        {chartData.map(d => {
          const notSubmitted = d.totalEmployees - d.submittedCount
          const rate =
            d.submittedCount > 0 ? Math.round((d.highStressCount / d.submittedCount) * 100) : 0
          return (
            <div
              key={d.path}
              className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-gray-50"
            >
              <span className="text-gray-600 truncate max-w-[45%]" title={d.path}>
                {d.path}
              </span>
              <div className="flex gap-3 shrink-0">
                <span className="text-blue-500 font-bold">実{d.submittedCount}名</span>
                <span className="text-gray-400 font-bold">未{notSubmitted}名</span>
                <span className="text-red-500 font-bold">高{d.highStressCount}名</span>
                <span className="text-gray-400 w-8 text-right">{rate}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
