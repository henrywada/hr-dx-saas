'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { extractTextFromUploadedFile } from '@/features/inquiry-chat/extractors/files'
import { generateCourseFromText } from './ai-generator'
import type { AiGeneratedCourse, SlideType } from './types'

// ============================================================
// コース CRUD
// ============================================================

export async function createCourse(input: {
  title: string
  description?: string
  category: string
  status: string
  course_type: 'template' | 'tenant'
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('el_courses')
    .insert({
      tenant_id: input.course_type === 'tenant' ? user.tenant_id : null,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      status: input.status,
      course_type: input.course_type,
      created_by_employee_id: user.employee_id ?? null,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/adm/el-courses')
  revalidatePath('/saas_adm/el-templates')
  return data
}

export async function updateCourse(
  id: string,
  input: {
    title?: string
    description?: string
    category?: string
    status?: string
  }
) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_courses').update(input).eq('id', id)
  if (error) throw error

  revalidatePath('/adm/el-courses')
  revalidatePath(`/adm/el-courses/${id}`)
  revalidatePath('/saas_adm/el-templates')
}

export async function deleteCourse(id: string) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_courses').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/adm/el-courses')
  revalidatePath('/saas_adm/el-templates')
}

// テンプレートコースをテナントコースへコピー（スライド・クイズ含む再帰コピー）
export async function copyTemplateToTenant(templateId: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data: template, error: templateError } = await supabase
    .from('el_courses')
    .select('*')
    .eq('id', templateId)
    .is('tenant_id', null)
    .single()
  if (templateError) throw templateError

  const { data: newCourse, error: courseError } = await supabase
    .from('el_courses')
    .insert({
      tenant_id: user.tenant_id,
      title: template.title,
      description: template.description,
      category: template.category,
      status: 'draft',
      course_type: 'tenant',
      original_course_id: templateId,
      estimated_minutes: template.estimated_minutes,
      created_by_employee_id: user.employee_id ?? null,
    })
    .select()
    .single()
  if (courseError) throw courseError

  const { data: slides, error: slidesError } = await supabase
    .from('el_slides')
    .select(`*, el_quiz_questions(*, el_quiz_options(*))`)
    .eq('course_id', templateId)
    .order('slide_order', { ascending: true })
  if (slidesError) throw slidesError

  for (const slide of slides ?? []) {
    const { data: newSlide, error: slideError } = await supabase
      .from('el_slides')
      .insert({
        course_id: newCourse.id,
        slide_order: slide.slide_order,
        slide_type: slide.slide_type,
        title: slide.title,
        content: slide.content,
        image_url: slide.image_url,
      })
      .select()
      .single()
    if (slideError) throw slideError

    for (const q of slide.el_quiz_questions ?? []) {
      const { data: newQ, error: qError } = await supabase
        .from('el_quiz_questions')
        .insert({
          slide_id: newSlide.id,
          question_text: q.question_text,
          question_order: q.question_order,
          explanation: q.explanation,
        })
        .select()
        .single()
      if (qError) throw qError

      const options = (q.el_quiz_options ?? []).map((o: any) => ({
        question_id: newQ.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        option_order: o.option_order,
      }))
      if (options.length > 0) {
        const { error: optError } = await supabase.from('el_quiz_options').insert(options)
        if (optError) throw optError
      }
    }
  }

  revalidatePath('/adm/el-courses')
  return newCourse
}

// ============================================================
// スライド CRUD
// ============================================================

export async function upsertSlide(input: {
  id?: string
  course_id: string
  slide_order: number
  slide_type: SlideType
  title?: string
  content?: string
  image_url?: string
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data, error } = input.id
    ? await supabase.from('el_slides').update(input).eq('id', input.id).select().single()
    : await supabase.from('el_slides').insert(input).select().single()

  if (error) throw error
  revalidatePath(`/adm/el-courses/${input.course_id}`)
  revalidatePath(`/saas_adm/el-templates/${input.course_id}`)
  return data
}

export async function deleteSlide(id: string, courseId: string) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_slides').delete().eq('id', id)
  if (error) throw error

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
}

export async function reorderSlides(courseId: string, orderedIds: string[]) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('el_slides')
      .update({ slide_order: i })
      .eq('id', orderedIds[i])
    if (error) throw error
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
}

// ============================================================
// クイズ CRUD
// ============================================================

export async function upsertQuizQuestion(input: {
  id?: string
  slide_id: string
  question_text: string
  question_order: number
  explanation?: string
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data, error } = input.id
    ? await supabase.from('el_quiz_questions').update(input).eq('id', input.id).select().single()
    : await supabase.from('el_quiz_questions').insert(input).select().single()

  if (error) throw error
  return data
}

export async function upsertQuizOptions(
  questionId: string,
  options: { text: string; is_correct: boolean }[]
) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  await supabase.from('el_quiz_options').delete().eq('question_id', questionId)

  const rows = options.map((o, i) => ({
    question_id: questionId,
    option_text: o.text,
    is_correct: o.is_correct,
    option_order: i,
  }))

  const { error } = await supabase.from('el_quiz_options').insert(rows)
  if (error) throw error
}

// ============================================================
// 受講割り当て
// ============================================================

export async function assignEmployees(courseId: string, employeeIds: string[], dueDate?: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')

  const supabase = await createClient()

  const rows = employeeIds.map(employeeId => ({
    tenant_id: user.tenant_id!,
    course_id: courseId,
    employee_id: employeeId,
    assigned_by_employee_id: user.employee_id ?? null,
    due_date: dueDate ?? null,
  }))

  const { error } = await supabase
    .from('el_assignments')
    .upsert(rows, { onConflict: 'course_id,employee_id', ignoreDuplicates: true })

  if (error) throw error
  revalidatePath('/adm/el-assignments')
}

export async function removeAssignment(assignmentId: string) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_assignments').delete().eq('id', assignmentId)
  if (error) throw error

  revalidatePath('/adm/el-assignments')
}

// ============================================================
// 受講進捗（従業員向け）
// ============================================================

export async function recordSlideProgress(
  assignmentId: string,
  slideId: string,
  quizScore?: number
) {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { error } = await supabase.from('el_progress').upsert(
    {
      tenant_id: user.tenant_id,
      assignment_id: assignmentId,
      employee_id: user.employee_id,
      slide_id: slideId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      quiz_score: quizScore ?? null,
    },
    { onConflict: 'assignment_id,slide_id' }
  )

  if (error) throw error
  revalidatePath(`/el-courses/${assignmentId}`)
}

export async function completeCourse(assignmentId: string) {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { error } = await supabase
    .from('el_assignments')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('employee_id', user.employee_id)

  if (error) throw error
  revalidatePath('/el-courses')
  revalidatePath(`/el-courses/${assignmentId}`)
}

// ============================================================
// AI コース生成
// ============================================================

export async function generateCourseFromFile(formData: FormData): Promise<AiGeneratedCourse> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('ファイルが選択されていません')

  const buf = Buffer.from(await file.arrayBuffer())
  const mime = file.type || 'application/octet-stream'
  const rawText = await extractTextFromUploadedFile(buf, mime, file.name)

  if (!rawText || rawText.trim().length < 50) {
    throw new Error('ファイルからテキストを抽出できませんでした')
  }

  return generateCourseFromText(rawText)
}

export async function saveAiGeneratedCourse(
  courseData: AiGeneratedCourse,
  courseType: 'template' | 'tenant'
) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from('el_courses')
    .insert({
      tenant_id: courseType === 'tenant' ? user.tenant_id : null,
      title: courseData.title,
      description: courseData.description,
      category: courseData.category,
      status: 'draft',
      course_type: courseType,
      estimated_minutes: courseData.estimated_minutes,
      created_by_employee_id: user.employee_id ?? null,
    })
    .select()
    .single()

  if (courseError) throw courseError

  for (let i = 0; i < courseData.slides.length; i++) {
    const slide = courseData.slides[i]

    const { data: newSlide, error: slideError } = await supabase
      .from('el_slides')
      .insert({
        course_id: course.id,
        slide_order: i,
        slide_type: slide.slide_type,
        title: slide.title,
        content: slide.content ?? null,
      })
      .select()
      .single()

    if (slideError) throw slideError

    if (slide.slide_type === 'quiz' && slide.quiz) {
      const { data: q, error: qError } = await supabase
        .from('el_quiz_questions')
        .insert({
          slide_id: newSlide.id,
          question_text: slide.quiz.question,
          question_order: 0,
          explanation: slide.quiz.explanation,
        })
        .select()
        .single()

      if (qError) throw qError

      const opts = slide.quiz.options.map((o, idx) => ({
        question_id: q.id,
        option_text: o.text,
        is_correct: o.is_correct,
        option_order: idx,
      }))
      const { error: optError } = await supabase.from('el_quiz_options').insert(opts)
      if (optError) throw optError
    }
  }

  revalidatePath('/adm/el-courses')
  revalidatePath('/saas_adm/el-templates')
  return course
}
