import type { BloomLevel, SlideType } from './types'

export const COURSE_CATEGORIES = ['初級', '中級', '上級', 'その他'] as const
export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const COURSE_STATUS_LABELS = {
  draft: '下書き',
  published: '公開中',
  archived: 'アーカイブ',
} as const

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  // 既存
  text:          'テキスト',
  image:         '画像',
  quiz:          'クイズ',
  // マイクロラーニング用フェーズ
  objective:     '学習目標',
  micro_content: 'ミニ講座',
  scenario:      'シナリオ問題',
  reflection:    '振り返り',
  checklist:     '現場適用チェック',
} as const

// マイクロラーニングの標準フェーズ順序
export const MICRO_LEARNING_SLIDE_TYPES: SlideType[] = [
  'objective',
  'micro_content',
  'scenario',
  'reflection',
  'checklist',
]

// ============================================================
// Bloom's Taxonomy
// ============================================================

export const BLOOM_LEVELS: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
]

export const BLOOM_LEVEL_LABELS: Record<BloomLevel, string> = {
  remember:    '記憶する',
  understand:  '理解する',
  apply:       '応用する',
  analyze:     '分析する',
  evaluate:    '評価する',
  create:      '創造する',
}

// Tailwind クラス（bg + text + border のセット）
export const BLOOM_LEVEL_COLORS: Record<
  BloomLevel,
  { bg: string; text: string; border: string }
> = {
  remember:    { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300'   },
  understand:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300'   },
  apply:       { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300'  },
  analyze:     { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  evaluate:    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  create:      { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
}
