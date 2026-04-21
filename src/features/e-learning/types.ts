export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseType = 'template' | 'tenant'
export type SlideType = 'text' | 'image' | 'quiz'
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
  quiz_questions?: ElQuizQuestion[]
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

export interface ElSlideProgress {
  id: string
  assignment_id: string
  slide_id: string
  status: ProgressStatus
  quiz_score: number | null
  completed_at: string | null
}

export interface ElCourseViewerData extends ElCourseWithSlides {
  assignment: ElAssignment & { completed_at: string | null }
  progress: ElSlideProgress[]
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
}
