'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { extractTextFromUploadedFile } from '@/features/inquiry-chat/extractors/files'
import { generateCourseFromText, generateMicroCourseFromText } from './ai-generator'
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types'
import {
  EL_SLIDE_IMAGE_MAX_BYTES,
  EL_SLIDE_IMAGE_MAX_MB,
  EL_SLIDE_VIDEO_MAX_BYTES,
  EL_SLIDE_VIDEO_MAX_MB,
} from './constants'
import type { AiGeneratedCourse, AiGeneratedMicroCourse, BloomLevel, SlideType } from './types'

const EL_SLIDE_IMAGES_BUCKET = 'el-slide-images'
const EL_SLIDE_VIDEOS_BUCKET = 'el-slide-videos'

/** Server Action からクライアントへ返すため、常にシリアライズ可能な Error にする */
function toActionError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: string }).message
    if (typeof m === 'string' && m.length > 0) return new Error(m)
  }
  return new Error(fallback)
}

function supabaseToError(
  err: { message?: string; code?: string; details?: string | null } | null,
  fallback: string
): Error {
  if (!err) return new Error(fallback)
  const parts = [err.message, err.details].filter((p): p is string => !!p && p.length > 0)
  return new Error(parts.length > 0 ? parts.join(' — ') : fallback)
}

const SLIDE_IMAGE_BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: EL_SLIDE_IMAGE_MAX_BYTES,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as string[],
}

function isBucketAlreadyExistsError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already exists') ||
    m.includes('already been registered') ||
    m.includes('resource already exists') ||
    m.includes('duplicate')
  )
}

/** バケット新規作成。既に 5MB 等の古い上限の場合は updateBucket でアプリ上限に追従させる */
async function ensureSlideImagesBucket() {
  const admin = createAdminServiceClient()
  const { error: createErr } = await admin.storage.createBucket(
    EL_SLIDE_IMAGES_BUCKET,
    SLIDE_IMAGE_BUCKET_OPTIONS
  )
  if (!createErr) return

  if (!isBucketAlreadyExistsError(createErr.message)) {
    throw new Error(`バケット作成に失敗しました: ${createErr.message}`)
  }

  const { error: updateErr } = await admin.storage.updateBucket(
    EL_SLIDE_IMAGES_BUCKET,
    SLIDE_IMAGE_BUCKET_OPTIONS
  )
  if (updateErr) {
    throw new Error(
      `画像ストレージの上限を ${EL_SLIDE_IMAGE_MAX_MB}MB に更新できませんでした（Supabase ダッシュボードで el-slide-images の file size limit を確認してください）: ${updateErr.message}`
    )
  }
}

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
  revalidatePath('/adm/el-assignments')
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

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}

export async function upsertSlide(input: {
  id?: string
  course_id: string
  slide_order: number
  slide_type: SlideType
  title?: string
  content?: string
  image_url?: string | null
  video_url?: string | null
  estimated_seconds?: number
}) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  let result
  if (input.id) {
    const { id, ...rest } = input
    const payload = omitUndefined(rest as Record<string, unknown>) as TablesUpdate<'el_slides'>
    result = await supabase.from('el_slides').update(payload).eq('id', id).select().single()
  } else {
    const payload = omitUndefined(input as Record<string, unknown>) as TablesInsert<'el_slides'>
    result = await supabase.from('el_slides').insert(payload).select().single()
  }

  if (result.error) throw result.error
  revalidatePath(`/adm/el-courses/${input.course_id}`)
  revalidatePath(`/saas_adm/el-templates/${input.course_id}`)
  return result.data
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
// スライド画像アップロード
// ============================================================

export async function uploadSlideImage(
  slideId: string,
  courseId: string,
  formData: FormData
): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('ファイルが選択されていません')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('JPEG・PNG・GIF・WebP のみアップロードできます')
  }
  if (file.size > EL_SLIDE_IMAGE_MAX_BYTES) {
    throw new Error(`ファイルサイズは ${EL_SLIDE_IMAGE_MAX_MB}MB 以下にしてください`)
  }

  await ensureSlideImagesBucket()
  const admin = createAdminServiceClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `slides/${slideId}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from(EL_SLIDE_IMAGES_BUCKET)
    .upload(storagePath, buf, { contentType: file.type, upsert: true })

  if (upErr) throw new Error(`画像のアップロードに失敗しました: ${upErr.message}`)

  const { data: urlData } = admin.storage.from(EL_SLIDE_IMAGES_BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  const supabase = await createClient()
  const { data: updatedRow, error: updateErr } = await supabase
    .from('el_slides')
    .update({ image_url: publicUrl })
    .eq('id', slideId)
    .select('image_url')
    .single()
  if (updateErr) throw updateErr
  if (!updatedRow?.image_url) {
    throw new Error(
      '画像URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}

export async function deleteSlideImage(slideId: string, courseId: string): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data: slide } = await supabase
    .from('el_slides')
    .select('image_url')
    .eq('id', slideId)
    .single()

  if (slide?.image_url) {
    const path = slide.image_url.split(`/${EL_SLIDE_IMAGES_BUCKET}/`).at(-1)
    if (path) {
      const admin = createAdminServiceClient()
      await admin.storage.from(EL_SLIDE_IMAGES_BUCKET).remove([path])
    }
  }

  const { error } = await supabase.from('el_slides').update({ image_url: null }).eq('id', slideId)
  if (error) throw error

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
}

// ============================================================
// ミニ講座スライド動画アップロード
// ============================================================

const SLIDE_VIDEO_BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: EL_SLIDE_VIDEO_MAX_BYTES,
  allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'] as string[],
}

async function ensureSlideVideosBucket() {
  const admin = createAdminServiceClient()
  const { error: createErr } = await admin.storage.createBucket(
    EL_SLIDE_VIDEOS_BUCKET,
    SLIDE_VIDEO_BUCKET_OPTIONS
  )
  if (!createErr) return

  if (!isBucketAlreadyExistsError(createErr.message)) {
    throw new Error(`バケット作成に失敗しました: ${createErr.message}`)
  }

  const { error: updateErr } = await admin.storage.updateBucket(
    EL_SLIDE_VIDEOS_BUCKET,
    SLIDE_VIDEO_BUCKET_OPTIONS
  )
  if (updateErr) {
    throw new Error(
      `動画ストレージの設定を更新できませんでした: ${updateErr.message}`
    )
  }
}

export async function uploadSlideVideo(
  slideId: string,
  courseId: string,
  formData: FormData
): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File | null
  if (!file) throw new Error('ファイルが選択されていません')

  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('MP4・WebM・QuickTime のみアップロードできます')
  }
  if (file.size > EL_SLIDE_VIDEO_MAX_BYTES) {
    throw new Error(`ファイルサイズは ${EL_SLIDE_VIDEO_MAX_MB}MB 以下にしてください`)
  }

  await ensureSlideVideosBucket()
  const admin = createAdminServiceClient()

  const { data: existingFiles } = await admin.storage
    .from(EL_SLIDE_VIDEOS_BUCKET)
    .list('slides', { search: slideId })
  if (existingFiles && existingFiles.length > 0) {
    await admin.storage
      .from(EL_SLIDE_VIDEOS_BUCKET)
      .remove(existingFiles.map(f => `slides/${f.name}`))
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  const safeExt =
    ext === 'webm' ? 'webm' : ext === 'mov' ? 'mov' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
  const storagePath = `slides/${slideId}-${Date.now()}.${safeExt}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from(EL_SLIDE_VIDEOS_BUCKET)
    .upload(storagePath, buf, { contentType: file.type, upsert: false })

  if (upErr) throw new Error(`動画のアップロードに失敗しました: ${upErr.message}`)

  const { data: urlData } = admin.storage.from(EL_SLIDE_VIDEOS_BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  const supabase = await createClient()
  const { data: updatedRow, error: updateErr } = await supabase
    .from('el_slides')
    .update({ video_url: publicUrl })
    .eq('id', slideId)
    .select('video_url')
    .single()
  if (updateErr) throw updateErr
  if (!updatedRow?.video_url) {
    throw new Error(
      '動画URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}

export async function deleteSlideVideo(slideId: string, courseId: string): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data: slide } = await supabase
    .from('el_slides')
    .select('video_url')
    .eq('id', slideId)
    .single()

  if (slide?.video_url?.includes(EL_SLIDE_VIDEOS_BUCKET)) {
    const path = slide.video_url.split(`/${EL_SLIDE_VIDEOS_BUCKET}/`).at(-1)
    if (path) {
      const admin = createAdminServiceClient()
      await admin.storage.from(EL_SLIDE_VIDEOS_BUCKET).remove([path])
    }
  }

  const { error } = await supabase.from('el_slides').update({ video_url: null }).eq('id', slideId)
  if (error) throw error

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
// コース作成 + AI シナリオ自動生成（フォームから直接呼ぶ）
// ============================================================

/** 本番では throw した Server Action のメッセージがマスクされるため、結果は常にこの型で返す */
export type CreateCourseWithAiScenarioResult =
  | { ok: true; courseId: string }
  | { ok: false; error: string }

export async function createCourseWithAiScenario(input: {
  title: string
  description: string
  category: string
  course_type: 'template' | 'tenant'
  bloom_level?: BloomLevel
  learning_objectives: string[]
}): Promise<CreateCourseWithAiScenarioResult> {
  const user = await getServerUser()
  if (!user) return { ok: false, error: 'ログインが必要です' }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      ok: false,
      error:
        'AIシナリオ生成には OpenAI API キーが必要です。Vercel の Project → Settings → Environment Variables に OPENAI_API_KEY を設定し、再デプロイしてください。',
    }
  }

  const supabase = await createClient()
  let courseId: string | null = null

  try {
    const { data: course, error: courseError } = await supabase
      .from('el_courses')
      .insert({
        tenant_id: input.course_type === 'tenant' ? user.tenant_id : null,
        title: input.title,
        description: input.description || null,
        category: input.category,
        status: 'draft',
        course_type: input.course_type,
        bloom_level: input.bloom_level ?? null,
        learning_objectives: input.learning_objectives,
        created_by_employee_id: user.employee_id ?? null,
      })
      .select()
      .single()

    if (courseError) throw supabaseToError(courseError, 'コースの作成に失敗しました')
    courseId = course.id

    const rawText = [
      `コースタイトル：${input.title}`,
      input.description ? `概要：${input.description}` : '',
      input.learning_objectives.length > 0
        ? `学習目標：\n${input.learning_objectives.map(o => `・${o}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const generated = await generateMicroCourseFromText(rawText)

    for (let i = 0; i < generated.slides.length; i++) {
      const slide = generated.slides[i]

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

      if (slideError) throw supabaseToError(slideError, 'スライドの保存に失敗しました')

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
          if (branchError) throw supabaseToError(branchError, 'シナリオ分岐の保存に失敗しました')
        }
      }

      if (slide.slide_type === 'checklist' && slide.checklist) {
        const items = slide.checklist.items.map((it, idx) => ({
          slide_id: newSlide.id,
          item_order: idx,
          item_text: it.item_text,
        }))
        if (items.length > 0) {
          const { error: itemError } = await supabase.from('el_checklist_items').insert(items)
          if (itemError) throw supabaseToError(itemError, 'チェックリストの保存に失敗しました')
        }
      }
    }

    revalidatePath('/adm/el-courses')
    revalidatePath('/saas_adm/el-templates')
    return { ok: true, courseId: course.id }
  } catch (err) {
    if (courseId) {
      await supabase.from('el_courses').delete().eq('id', courseId)
    }
    const e = toActionError(err, 'AIシナリオの作成に失敗しました')
    return { ok: false, error: e.message }
  }
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
