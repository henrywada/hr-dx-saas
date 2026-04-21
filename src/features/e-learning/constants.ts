export const COURSE_CATEGORIES = ['初級', '中級', '上級', 'その他'] as const
export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const COURSE_STATUS_LABELS = {
  draft: '下書き',
  published: '公開中',
  archived: 'アーカイブ',
} as const

export const SLIDE_TYPE_LABELS = {
  text: 'テキスト',
  image: '画像',
  quiz: 'クイズ',
} as const
