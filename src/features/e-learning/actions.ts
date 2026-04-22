'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { extractTextFromUploadedFile } from '@/features/inquiry-chat/extractors/files'
import { generateCourseFromText, generateMicroCourseFromText } from './ai-generator'
import type { AiGeneratedCourse, AiGeneratedMicroCourse, BloomLevel, SlideType } from './types'

// ============================================================
// コース CRUD
// ============================================================

export async function createCourse(input: {
  title: string
  description?: string
  category: string
  status: string
  course_type: 'template' | 'tenant'
  bloom_level?: BloomLevel
  learning_objectives?: string[]
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
      bloom_level: input.bloom_level ?? null,
      learning_objectives: input.learning_objectives ?? [],
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
    bloom_level?: BloomLevel | null
    learning_objectives?: string[]
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
    .select(
      `*, el_quiz_questions(*, el_quiz_options(*)), el_scenario_branches(*), el_checklist_items(*)`
    )
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
        video_url: slide.video_url,
        estimated_seconds: slide.estimated_seconds,
      })
      .select()
      .single()
    if (slideError) throw slideError

    // クイズ問題のコピー
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

    // シナリオ分岐のコピー
    const branches = (slide.el_scenario_branches ?? []).map((b: any) => ({
      slide_id: newSlide.id,
      branch_order: b.branch_order,
      choice_text: b.choice_text,
      feedback_text: b.feedback_text,
      is_recommended: b.is_recommended,
    }))
    if (branches.length > 0) {
      const { error: branchError } = await supabase.from('el_scenario_branches').insert(branches)
      if (branchError) throw branchError
    }

    // チェックリスト項目のコピー
    const items = (slide.el_checklist_items ?? []).map((it: any) => ({
      slide_id: newSlide.id,
      item_order: it.item_order,
      item_text: it.item_text,
    }))
    if (items.length > 0) {
      const { error: itemError } = await supabase.from('el_checklist_items').insert(items)
      if (itemError) throw itemError
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
  video_url?: string
  estimated_seconds?: number
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

// シナリオスライドの選択肢を記録する
export async function recordScenarioAnswer(
  assignmentId: string,
  slideId: string,
  branchId: string,
  choiceText: string
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
      scenario_branch_id: branchId,
      selected_choice_text: choiceText,
    },
    { onConflict: 'assignment_id,slide_id' }
  )

  if (error) throw error
  revalidatePath(`/el-courses/${assignmentId}`)
}

// 現場チェックリスト項目のチェック状態をトグルする（後日チェックにも対応）
export async function toggleChecklistItem(
  assignmentId: string,
  checklistItemId: string,
  checked: boolean
) {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()

  if (checked) {
    const { error } = await supabase.from('el_checklist_completions').upsert(
      {
        tenant_id: user.tenant_id,
        assignment_id: assignmentId,
        checklist_item_id: checklistItemId,
        employee_id: user.employee_id,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,checklist_item_id' }
    )
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('el_checklist_completions')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('checklist_item_id', checklistItemId)
    if (error) throw error
  }

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
// シナリオ分岐 CRUD（管理者向け）
// ============================================================

export async function upsertScenarioBranch(input: {
  id?: string
  slide_id: string
  branch_order: number
  choice_text: string
  feedback_text?: string
  is_recommended?: boolean
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data, error } = input.id
    ? await supabase
        .from('el_scenario_branches')
        .update(input)
        .eq('id', input.id)
        .select()
        .single()
    : await supabase.from('el_scenario_branches').insert(input).select().single()

  if (error) throw error
  return data
}

export async function deleteScenarioBranch(branchId: string) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_scenario_branches').delete().eq('id', branchId)
  if (error) throw error
}

// ============================================================
// チェックリスト項目 CRUD（管理者向け）
// ============================================================

export async function upsertChecklistItem(input: {
  id?: string
  slide_id: string
  item_order: number
  item_text: string
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data, error } = input.id
    ? await supabase.from('el_checklist_items').update(input).eq('id', input.id).select().single()
    : await supabase.from('el_checklist_items').insert(input).select().single()

  if (error) throw error
  return data
}

export async function deleteChecklistItem(itemId: string) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('el_checklist_items').delete().eq('id', itemId)
  if (error) throw error
}

// ============================================================
// AI コース生成
// ============================================================

// マイクロラーニング＋シナリオ形式でコースを生成する（新標準）
export async function generateMicroCourseFromFile(
  formData: FormData
): Promise<AiGeneratedMicroCourse> {
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

  return generateMicroCourseFromText(rawText)
}

// 後方互換: 従来の text/quiz 形式でコースを生成する
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
  courseData: AiGeneratedCourse | AiGeneratedMicroCourse,
  courseType: 'template' | 'tenant'
) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const isMicro = 'bloom_level' in courseData

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
      bloom_level: isMicro ? (courseData as AiGeneratedMicroCourse).bloom_level : null,
      learning_objectives: isMicro
        ? (courseData as AiGeneratedMicroCourse).learning_objectives
        : [],
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

    // クイズスライド
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

    // シナリオスライド
    if (slide.slide_type === 'scenario' && slide.scenario) {
      const branches = slide.scenario.branches.map((b, idx) => ({
        slide_id: newSlide.id,
        branch_order: idx,
        choice_text: b.choice_text,
        feedback_text: b.feedback_text,
        is_recommended: b.is_recommended,
      }))
      if (branches.length > 0) {
        const { error: branchError } = await supabase
          .from('el_scenario_branches')
          .insert(branches)
        if (branchError) throw branchError
      }
    }

    // チェックリストスライド
    if (slide.slide_type === 'checklist' && slide.checklist) {
      const items = slide.checklist.items.map((it, idx) => ({
        slide_id: newSlide.id,
        item_order: idx,
        item_text: it.item_text,
      }))
      if (items.length > 0) {
        const { error: itemError } = await supabase.from('el_checklist_items').insert(items)
        if (itemError) throw itemError
      }
    }
  }

  revalidatePath('/adm/el-courses')
  revalidatePath('/saas_adm/el-templates')
  return course
}
