'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { extractScormZipToStorage } from './scorm/scorm-package-upload'
import { isScormLessonComplete } from './scorm/scorm12-api'
import { completeCourse } from './actions'

const XAPI_VERB_COMPLETED = 'http://adlnet.gov/expapi/verbs/completed'

async function assertHrUser() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return null
  if (!['hr', 'hr_manager', 'developer'].includes(user.appRole ?? '')) return null
  return user
}

/** SCORM ZIP をアップロードしてコースを scorm_12 形式にする */
export async function uploadScormPackage(input: {
  courseId: string
  formData: FormData
}): Promise<{ success: boolean; error?: string; launchPath?: string }> {
  const user = await assertHrUser()
  if (!user) return { success: false, error: '権限がありません' }

  const file = input.formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'ZIP ファイルを選択してください' }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { success: false, error: 'ZIP 形式のみ対応しています' }
  }

  const supabase = await createClient()
  const { data: course } = await supabase
    .from('el_courses')
    .select('id, tenant_id')
    .eq('id', input.courseId)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!course) return { success: false, error: 'コースが見つかりません' }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const { storagePrefix, launchPath } = await extractScormZipToStorage({
      tenantId: user.tenant_id,
      courseId: input.courseId,
      zipBuffer: buf,
      originalFilename: file.name,
    })

    const { error: pkgErr } = await (supabase as any).from('el_scorm_packages').upsert({
      course_id: input.courseId,
      tenant_id: user.tenant_id,
      package_type: 'scorm_12',
      storage_prefix: storagePrefix,
      launch_path: launchPath,
      original_filename: file.name,
      uploaded_by: user.employee_id,
      uploaded_at: new Date().toISOString(),
    })
    if (pkgErr) return { success: false, error: pkgErr.message }

    const { error: courseErr } = await supabase
      .from('el_courses')
      .update({ content_format: 'scorm_12' } as any)
      .eq('id', input.courseId)

    if (courseErr) return { success: false, error: courseErr.message }

    revalidatePath(APP_ROUTES.TENANT.ADMIN_EL_COURSE_DETAIL(input.courseId))
    return { success: true, launchPath }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'アップロードに失敗しました' }
  }
}

/** xAPI 外部起動 URL を登録 */
export async function saveXapiLaunchUrl(input: {
  courseId: string
  launchUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await assertHrUser()
  if (!user) return { success: false, error: '権限がありません' }

  const url = input.launchUrl.trim()
  if (!url.startsWith('https://')) return { success: false, error: 'https:// で始まる URL を入力してください' }

  const supabase = await createClient()
  const { error: pkgErr } = await (supabase as any).from('el_scorm_packages').upsert({
    course_id: input.courseId,
    tenant_id: user.tenant_id,
    package_type: 'xapi_launch',
    storage_prefix: null,
    launch_path: url,
    original_filename: null,
    uploaded_by: user.employee_id,
    uploaded_at: new Date().toISOString(),
  })
  if (pkgErr) return { success: false, error: pkgErr.message }

  const { error: courseErr } = await supabase
    .from('el_courses')
    .update({ content_format: 'xapi_launch' } as any)
    .eq('id', input.courseId)
  if (courseErr) return { success: false, error: courseErr.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_EL_COURSE_DETAIL(input.courseId))
  return { success: true }
}

/** コースをネイティブ形式に戻す */
export async function resetCourseContentFormat(courseId: string): Promise<{ success: boolean; error?: string }> {
  const user = await assertHrUser()
  if (!user) return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  await (supabase as any).from('el_scorm_packages').delete().eq('course_id', courseId)
  const { error } = await supabase
    .from('el_courses')
    .update({ content_format: 'native' } as any)
    .eq('id', courseId)
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_EL_COURSE_DETAIL(courseId))
  return { success: true }
}

async function emitXapiCompletedStatement(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  tenantId: string
  assignmentId: string
  employeeId: string
  employeeName: string
  courseTitle: string
  courseId: string
  scoreRaw?: string | null
}) {
  const statement = {
    actor: { name: input.employeeName, mbox: `mailto:employee-${input.employeeId}@hr-dx.local` },
    verb: { id: XAPI_VERB_COMPLETED, display: { 'ja-JP': '完了した' } },
    object: {
      id: `https://app.hr-dx.jp/el/courses/${input.courseId}`,
      definition: { name: { 'ja-JP': input.courseTitle } },
    },
    result: input.scoreRaw ? { score: { raw: Number(input.scoreRaw) || undefined } } : undefined,
  }

  await (input.supabase as any).from('el_xapi_statements').insert({
    tenant_id: input.tenantId,
    assignment_id: input.assignmentId,
    employee_id: input.employeeId,
    verb_id: XAPI_VERB_COMPLETED,
    activity_id: statement.object.id,
    result_score: input.scoreRaw ? Number(input.scoreRaw) || null : null,
    statement,
  })
}

/** SCORM CMI データを保存し、修了時は割当完了 + xAPI 発行 */
export async function saveScormRuntime(input: {
  assignmentId: string
  cmiData: Record<string, string>
  finished?: boolean
}): Promise<{ success: boolean; error?: string; completed?: boolean }> {
  const user = await getServerUser()
  if (!user?.employee_id || !user.tenant_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const lessonStatus = input.cmiData['cmi.core.lesson_status']
  const scoreRaw = input.cmiData['cmi.core.score.raw'] ?? null
  const suspendData = input.cmiData['cmi.suspend_data'] ?? null

  const { error } = await (supabase as any).from('el_scorm_runtime').upsert({
    assignment_id: input.assignmentId,
    tenant_id: user.tenant_id,
    cmi_data: input.cmiData,
    lesson_status: lessonStatus ?? null,
    score_raw: scoreRaw,
    suspend_data: suspendData,
    updated_at: new Date().toISOString(),
  })
  if (error) return { success: false, error: error.message }

  const shouldComplete =
    input.finished || isScormLessonComplete(lessonStatus ?? undefined)

  if (shouldComplete) {
    const { data: assignment } = await supabase
      .from('el_assignments')
      .select('id, completed_at, course_id')
      .eq('id', input.assignmentId)
      .eq('employee_id', user.employee_id)
      .maybeSingle()

    if (assignment && !assignment.completed_at) {
      await completeCourse(input.assignmentId)
      const { data: courseRow } = await supabase
        .from('el_courses')
        .select('title')
        .eq('id', assignment.course_id)
        .maybeSingle()
      const courseTitle = courseRow?.title ?? 'コース'
      await emitXapiCompletedStatement({
        supabase,
        tenantId: user.tenant_id,
        assignmentId: input.assignmentId,
        employeeId: user.employee_id,
        employeeName: user.name ?? '従業員',
        courseTitle,
        courseId: assignment.course_id,
        scoreRaw,
      })
    }

    revalidatePath(APP_ROUTES.TENANT.EL_MY_COURSES)
    return { success: true, completed: true }
  }

  return { success: true, completed: false }
}

/** クライアントから xAPI ステートメントを記録（xapi_launch 用） */
export async function recordXapiStatement(input: {
  assignmentId: string
  statement: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.employee_id || !user.tenant_id) return { success: false, error: '権限がありません' }

  const verb = input.statement.verb as { id?: string } | undefined
  const verbId = verb?.id
  if (!verbId) return { success: false, error: 'verb.id が必要です' }

  const object = input.statement.object as { id?: string } | undefined
  const result = input.statement.result as { score?: { raw?: number } } | undefined

  const supabase = await createClient()
  const { error } = await (supabase as any).from('el_xapi_statements').insert({
    tenant_id: user.tenant_id,
    assignment_id: input.assignmentId,
    employee_id: user.employee_id,
    verb_id: verbId,
    activity_id: object?.id ?? null,
    result_score: result?.score?.raw ?? null,
    statement: input.statement,
  })
  if (error) return { success: false, error: error.message }

  if (verbId === XAPI_VERB_COMPLETED) {
    const { data: assignment } = await supabase
      .from('el_assignments')
      .select('completed_at')
      .eq('id', input.assignmentId)
      .eq('employee_id', user.employee_id)
      .maybeSingle()
    if (assignment && !assignment.completed_at) {
      await completeCourse(input.assignmentId)
    }
  }

  return { success: true }
}
