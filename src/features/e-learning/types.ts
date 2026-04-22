export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseType = 'template' | 'tenant'

// 既存3種 + マイクロラーニング用5フェーズ
export type SlideType =
  | 'text'          // 既存（テキストスライド）
  | 'image'         // 既存（画像スライド）
  | 'quiz'          // 既存（クイズ）
  | 'objective'     // [Phase 1] 学習目標
  | 'micro_content' // [Phase 2] マイクロコンテンツ
  | 'scenario'      // [Phase 3] シナリオ問題（分岐）
  | 'reflection'    // [Phase 4] 振り返り＋解説
  | 'checklist'     // [Phase 5] 現場適用チェックリスト

// Bloom's Taxonomy の6認知レベル
export type BloomLevel =
  | 'remember'   // 記憶する
  | 'understand' // 理解する
  | 'apply'      // 応用する
  | 'analyze'    // 分析する
  | 'evaluate'   // 評価する
  | 'create'     // 創造する

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface ElCourse {
  id: string
  tenant_id: string | null
  title: string
  description: string | null
  category: string
  status: CourseStatus
  course_type: CourseType
  original_course_id: string | null
  thumbnail_url: string | null
  estimated_minutes: number | null
  created_by_employee_id: string | null
  bloom_level: BloomLevel | null
  learning_objectives: string[] | null
  /** 公開コースの受講開始日（DATE、YYYY-MM-DD）。未設定なら開始制限なし */
  published_start_date: string | null
  /** 公開コースの受講終了日（DATE、YYYY-MM-DD）。未設定なら終了制限なし */
  published_end_date: string | null
  created_at: string
  updated_at: string
}

export interface ElSlide {
  id: string
  course_id: string
  slide_order: number
  slide_type: SlideType
  title: string | null
  content: string | null
  image_url: string | null
  video_url: string | null
  estimated_seconds: number | null
  quiz_questions?: ElQuizQuestion[]
  scenario_branches?: ElScenarioBranch[]
  checklist_items?: ElChecklistItem[]
}

export interface ElQuizQuestion {
  id: string
  slide_id: string
  question_text: string
  question_order: number
  explanation: string | null
  options: ElQuizOption[]
}

export interface ElQuizOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  option_order: number
}

export interface ElAssignment {
  id: string
  tenant_id: string
  course_id: string
  employee_id: string
  assigned_by_employee_id: string | null
  due_date: string | null
  assigned_at: string
  course?: ElCourse
  employee?: { id: string; name: string; division_id: string | null }
}

export interface ElCourseWithSlides extends ElCourse {
  slides: ElSlide[]
}

// シナリオスライドの分岐選択肢
export interface ElScenarioBranch {
  id: string
  slide_id: string
  branch_order: number
  choice_text: string
  feedback_text: string | null
  is_recommended: boolean
  created_at: string
}

// 現場適用チェックリストの各項目
export interface ElChecklistItem {
  id: string
  slide_id: string
  item_order: number
  item_text: string
  created_at: string
}

// 受講者のチェックリスト完了記録
export interface ElChecklistCompletion {
  id: string
  tenant_id: string
  assignment_id: string
  checklist_item_id: string
  employee_id: string
  checked_at: string
}

export interface ElSlideProgress {
  id: string
  assignment_id: string
  slide_id: string
  status: ProgressStatus
  quiz_score: number | null
  scenario_branch_id: string | null
  selected_choice_text: string | null
  completed_at: string | null
}

export interface ElCourseViewerData extends ElCourseWithSlides {
  assignment: ElAssignment & { completed_at: string | null }
  progress: ElSlideProgress[]
  checklistCompletions: ElChecklistCompletion[]
}

export interface AiGeneratedCourse {
  title: string
  description: string
  category: string
  estimated_minutes: number
  slides: AiGeneratedSlide[]
}

export interface AiGeneratedSlide {
  slide_type: SlideType
  title: string
  content?: string
  quiz?: {
    question: string
    options: { text: string; is_correct: boolean }[]
    explanation: string
  }
  scenario?: {
    branches: { choice_text: string; feedback_text: string; is_recommended: boolean }[]
  }
  checklist?: {
    items: { item_text: string }[]
  }
}

// AI生成コース（マイクロラーニング対応）
export interface AiGeneratedMicroCourse extends AiGeneratedCourse {
  bloom_level: BloomLevel
  learning_objectives: string[]
}
