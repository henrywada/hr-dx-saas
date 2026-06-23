'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Users,
  Lightbulb,
  Target,
  BarChart3,
  AlertCircle,
  PlayCircle,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// === 型定義 ===
type Priority = '高' | '中' | '低'
type PDCAPhase = 'plan' | 'do' | 'check' | 'act'

interface ELearningCourse {
  id: string
  title: string
  target: string
  duration: string
}

interface ImprovementTheme {
  id: string
  priority: Priority
  department: string
  issue: string
  evidence: string
  recommendation: string
  courses: ELearningCourse[]
}

interface PDCAItem {
  id: string
  themeId: string
  title: string
  department: string
  phase: PDCAPhase
  responsible: string
  targetDate: string
  linkedCourses: string[]
  progress: number
}

// === AIが集団分析結果から自動生成した改善テーマ候補 ===
const IMPROVEMENT_THEMES: ImprovementTheme[] = [
  {
    id: 'theme-1',
    priority: '高',
    department: '営業部',
    issue: '上司からのサポートスコアが急落',
    evidence:
      '前期比リスク値 +15%。"上司の支援" スコアが 3.1 → 2.6 に低下（全カテゴリ中最大の下落幅）',
    recommendation: '管理職向け 1on1 面談の頻度増加と傾聴スキル強化施策を推奨',
    courses: [
      { id: 'c1', title: '1on1 の進め方 基礎編', target: '管理職', duration: '45分' },
      { id: 'c2', title: '部下への傾聴スキル実践', target: '管理職', duration: '60分' },
    ],
  },
  {
    id: 'theme-2',
    priority: '高',
    department: 'カスタマーサポート部',
    issue: '業務量過多・残業増加への深刻な懸念',
    evidence:
      'フリーコメントで「人員不足」「残業時間増加」が前月比 3 倍に急増。総合スコア 2.8（要注意）',
    recommendation: '業務フロー見直しと緊急採用計画の策定。管理職の労務管理スキル向上を推奨',
    courses: [
      { id: 'c3', title: 'タスク管理と業務効率化実践', target: '全員', duration: '30分' },
      { id: 'c4', title: 'マネジャーのための労務管理', target: '管理職', duration: '50分' },
    ],
  },
  {
    id: 'theme-3',
    priority: '中',
    department: 'マーケティング部',
    issue: '回答率・スコア共に全社最低水準',
    evidence: '回答率 65%（全社平均 85%）、総合スコア 2.9。心理的安全性の低下が示唆される',
    recommendation: 'チームビルディング施策と心理的安全性向上プログラムの導入を推奨',
    courses: [
      { id: 'c5', title: '心理的安全性の高いチーム作り', target: '管理職', duration: '40分' },
      { id: 'c6', title: 'チームビルディング実践ガイド', target: '全員', duration: '35分' },
    ],
  },
  {
    id: 'theme-4',
    priority: '中',
    department: '全社',
    issue: '会社への共感スコアが全カテゴリ中最低',
    evidence: '「会社への共感」スコア 3.2（前期 3.5 から低下傾向が継続中）',
    recommendation: '経営ビジョン再共有のためのタウンホール開催とエンゲージメント施策を推奨',
    courses: [{ id: 'c7', title: 'エンゲージメント経営入門', target: '管理職', duration: '55分' }],
  },
  {
    id: 'theme-5',
    priority: '低',
    department: '営業部',
    issue: '月末事務作業の負担感が増大',
    evidence: 'フリーコメントで「月末の事務作業」に関するネガティブ投稿が急増（前月比 +180%）',
    recommendation: '業務自動化ツール・RPA 導入の検討と、社内 DX 推進施策を推奨',
    courses: [{ id: 'c8', title: 'DX 推進と業務自動化入門', target: '全員', duration: '45分' }],
  },
]

// 前期からの継続施策（PDCAボードの初期データ）
const INITIAL_PDCA_ITEMS: PDCAItem[] = [
  {
    id: 'pdca-pre-1',
    themeId: 'pre',
    title: '管理職コーチングスキル強化プログラム',
    department: '開発部',
    phase: 'check',
    responsible: '人事部',
    targetDate: '2026年3月',
    linkedCourses: ['コーチング基礎', 'フィードバック実践'],
    progress: 75,
  },
]

// === フェーズ・優先度の表示設定 ===
const PHASE_CONFIG: Record<
  PDCAPhase,
  {
    label: string
    borderColor: string
    bgColor: string
    headerColor: string
    icon: React.ReactNode
    next: PDCAPhase | null
  }
> = {
  plan: {
    label: 'Plan（計画）',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50/50',
    headerColor: 'bg-blue-600',
    icon: <Lightbulb size={14} />,
    next: 'do',
  },
  do: {
    label: 'Do（実施中）',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50/50',
    headerColor: 'bg-amber-500',
    icon: <Target size={14} />,
    next: 'check',
  },
  check: {
    label: 'Check（効果測定）',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50/50',
    headerColor: 'bg-purple-600',
    icon: <BarChart3 size={14} />,
    next: 'act',
  },
  act: {
    label: 'Act（改善・完了）',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50/50',
    headerColor: 'bg-emerald-600',
    icon: <CheckCircle2 size={14} />,
    next: null,
  },
}

const PRIORITY_CONFIG: Record<Priority, { badgeClass: string }> = {
  高: { badgeClass: 'bg-red-100 text-red-700 border border-red-200' },
  中: { badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200' },
  低: { badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

const PRIORITY_BORDER: Record<Priority, string> = {
  高: 'border-l-red-400',
  中: 'border-l-amber-400',
  低: 'border-l-gray-300',
}

// === サブコンポーネント ===

function CourseChip({ course }: { course: ELearningCourse }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs">
      <PlayCircle size={13} className="text-indigo-500 shrink-0" />
      <div>
        <div className="font-medium text-gray-800 leading-tight">{course.title}</div>
        <div className="text-gray-400 mt-0.5">
          {course.target} · {course.duration}
        </div>
      </div>
    </div>
  )
}

function ThemeCard({
  theme,
  adopted,
  onAdopt,
}: {
  theme: ImprovementTheme
  adopted: boolean
  onAdopt: (theme: ImprovementTheme) => void
}) {
  const [coursesExpanded, setCoursesExpanded] = useState(false)

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${PRIORITY_BORDER[theme.priority]} shadow-sm hover:shadow-md transition-shadow flex flex-col`}
    >
      <div className="p-5 flex flex-col grow">
        {/* ヘッダー行 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[theme.priority].badgeClass}`}
            >
              優先度：{theme.priority}
            </span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              <Users size={11} className="inline mr-1" />
              {theme.department}
            </span>
          </div>
          {adopted && (
            <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 size={12} />
              採用済
            </span>
          )}
        </div>

        {/* 課題タイトル */}
        <h3 className="font-bold text-gray-900 mb-2">{theme.issue}</h3>

        {/* データ根拠 */}
        <div className="flex items-start gap-2 mb-3">
          <TrendingDown size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed">{theme.evidence}</p>
        </div>

        {/* 推奨アクション */}
        <div className="flex items-start gap-2 mb-4 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
          <Lightbulb size={14} className="text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-800 font-medium leading-relaxed">
            {theme.recommendation}
          </p>
        </div>

        {/* eラーニングレコメンド（アコーディオン） */}
        <div className="mb-4">
          <button
            onClick={() => setCoursesExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mb-2"
          >
            <BookOpen size={13} />
            推奨 eラーニング教材 {theme.courses.length}件
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${coursesExpanded ? 'rotate-90' : ''}`}
            />
          </button>
          {coursesExpanded && (
            <div className="grid grid-cols-1 gap-2 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
              {theme.courses.map(course => (
                <CourseChip key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* 採用ボタン（下部に固定） */}
        <div className="mt-auto">
          {!adopted ? (
            <Button variant="primary" size="sm" className="w-full" onClick={() => onAdopt(theme)}>
              <Plus size={14} />
              施策として採用し、PDCAボードに追加
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full opacity-60 cursor-default"
              disabled
            >
              <CheckCircle2 size={14} />
              PDCAボードに追加済み
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function PDCACard({ item, onAdvance }: { item: PDCAItem; onAdvance: (id: string) => void }) {
  const hasNext = PHASE_CONFIG[item.phase].next !== null

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 text-sm">
      <div className="font-semibold text-gray-900 mb-1 leading-snug">{item.title}</div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <Users size={11} />
        {item.department}
        <span className="text-gray-300">·</span>
        <Clock size={11} />
        目標: {item.targetDate}
      </div>

      {/* 進捗バー（Plan以外で表示） */}
      {item.phase !== 'plan' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>進捗</span>
            <span>{item.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mb-3">
        担当: <span className="font-medium text-gray-700">{item.responsible}</span>
      </div>

      {/* リンクしたeラーニング */}
      {item.linkedCourses.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.linkedCourses.map(c => (
            <span
              key={c}
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100"
            >
              <BookOpen size={10} className="inline mr-1" />
              {c}
            </span>
          ))}
        </div>
      )}

      {/* フェーズ進行ボタン */}
      {hasNext ? (
        <button
          onClick={() => onAdvance(item.id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md py-1.5 px-3 border border-indigo-200 transition-colors mt-1"
        >
          次のフェーズへ
          <ArrowRight size={12} />
        </button>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md py-1.5 px-3 border border-emerald-200 mt-1">
          <CheckCircle2 size={12} />
          施策完了
        </div>
      )}
    </div>
  )
}

// === メインコンポーネント ===

export default function ImprovementActionSection() {
  const [adoptedIds, setAdoptedIds] = useState<Set<string>>(new Set())
  const [pdcaItems, setPdcaItems] = useState<PDCAItem[]>(INITIAL_PDCA_ITEMS)
  const nextIdRef = React.useRef(INITIAL_PDCA_ITEMS.length + 1)

  const handleAdopt = (theme: ImprovementTheme) => {
    if (adoptedIds.has(theme.id)) return
    setAdoptedIds(prev => new Set([...prev, theme.id]))
    const newItem: PDCAItem = {
      id: `pdca-${nextIdRef.current++}`,
      themeId: theme.id,
      title: `${theme.department}｜${theme.issue}`,
      department: theme.department,
      phase: 'plan',
      responsible: '人事部',
      targetDate: '2026年6月',
      linkedCourses: theme.courses.map(c => c.title),
      progress: 0,
    }
    setPdcaItems(prev => [...prev, newItem])
  }

  const handleAdvance = (itemId: string) => {
    setPdcaItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item
        const next = PHASE_CONFIG[item.phase].next
        if (!next) return item
        return { ...item, phase: next, progress: Math.min(item.progress + 30, 100) }
      })
    )
  }

  const phases: PDCAPhase[] = ['plan', 'do', 'check', 'act']

  return (
    <div className="space-y-12">
      {/* ── Section A: AI 改善テーマ候補 ── */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">AI 改善テーマ候補</h2>
          </div>
          <Badge variant="teal" className="text-xs">
            今期の集団分析より自動生成
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
            <AlertCircle size={12} />
            採用した施策は下のPDCAボードに追加されます
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {IMPROVEMENT_THEMES.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              adopted={adoptedIds.has(theme.id)}
              onAdopt={handleAdopt}
            />
          ))}
        </div>
      </section>

      {/* ── Section B: PDCA ボード ── */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-600 to-teal-600 flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">改善施策 PDCA ボード</h2>
          </div>
          <span className="text-sm text-gray-500">
            施策の実施 → 効果測定 → 次期改善 を1画面で追跡
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {phases.map(phase => {
            const cfg = PHASE_CONFIG[phase]
            const items = pdcaItems.filter(i => i.phase === phase)
            return (
              <div
                key={phase}
                className={`rounded-xl border-2 ${cfg.borderColor} ${cfg.bgColor} flex flex-col min-h-56`}
              >
                {/* カラムヘッダー */}
                <div
                  className={`${cfg.headerColor} text-white rounded-t-[10px] px-4 py-3 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <span className="text-white/70 text-xs bg-white/20 rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                    {items.length}
                  </span>
                </div>

                {/* カード一覧 */}
                <div className="p-3 flex flex-col gap-3 grow">
                  {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center grow text-center py-8 text-gray-400">
                      <div className="text-2xl mb-1">—</div>
                      <div className="text-xs">施策なし</div>
                    </div>
                  )}
                  {items.map(item => (
                    <PDCACard key={item.id} item={item} onAdvance={handleAdvance} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
          {phases.map(phase => {
            const dotColor = {
              plan: 'bg-blue-600',
              do: 'bg-amber-500',
              check: 'bg-purple-600',
              act: 'bg-emerald-600',
            }[phase]
            const desc = {
              plan: '施策を設計・承認待ち',
              do: '施策を実行中',
              check: '次回調査で効果を測定中',
              act: '効果確認済・横展開または完了',
            }[phase]
            return (
              <div key={phase} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
                {PHASE_CONFIG[phase].label.split('（')[0]}: {desc}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
