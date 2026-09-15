'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
  sendPictureSchema,
  updateSendBodySchema,
  deleteSendSchema,
  type PictureReportActionResult,
} from './types'

const PICTURE_SENDS_BUCKET = 'picture-sends'

/** 件名マスタを追加する（is_managerのみ許可。RLSでも二重に保護される） */
export async function createSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }
  if (!user.division_id) return { success: false, error: '所属部署が未設定です' }

  const parsed = createSubjectSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()
  const { error } = await supabase.from('picture_send_subjects').insert({
    tenant_id: user.tenant_id,
    division_id: user.division_id,
    label: parsed.data.label,
    created_by: user.employee_id,
  })

  if (error) {
    console.error('[picture-report] createSubject: 件名マスタの追加に失敗', error)
    return { success: false, error: '件名の追加に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/** 件名マスタを更新する（is_managerのみ許可） */
export async function updateSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }

  const parsed = updateSubjectSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('picture_send_subjects')
    .update({ label: parsed.data.label, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id)

  if (error) {
    console.error('[picture-report] updateSubject: 件名マスタの更新に失敗', error)
    return { success: false, error: '件名の更新に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/** 件名マスタを削除する（is_managerのみ許可） */
export async function deleteSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }

  const parsed = deleteSubjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正なIDです' }

  const supabase = await createClient()
  const { error } = await supabase.from('picture_send_subjects').delete().eq('id', parsed.data.id)

  if (error) {
    console.error('[picture-report] deleteSubject: 件名マスタの削除に失敗', error)
    return { success: false, error: '件名の削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/**
 * 撮影画像を送信する。Client側でカメラ撮影したBlobをFormDataに詰めて渡す。
 * FormData: image(File), subjectId(string|""), subjectText(string), bodyText(string), priority(string)
 */
export async function sendPicture(formData: FormData): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id || !user.division_id) {
    return { success: false, error: '認証エラー' }
  }

  const image = formData.get('image')
  if (!(image instanceof File) || image.size === 0) {
    return { success: false, error: '送信する画像がありません。撮影してください。' }
  }

  const rawSubjectId = formData.get('subjectId')
  const parsed = sendPictureSchema.safeParse({
    subjectId: typeof rawSubjectId === 'string' && rawSubjectId ? rawSubjectId : null,
    subjectText: formData.get('subjectText'),
    bodyText: formData.get('bodyText') ?? '',
    priority: formData.get('priority'),
  })
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()

  // Asia/Tokyoの日付でストレージのパスを区切る
  const dateSegment = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(
    new Date()
  )
  const storagePath = `${user.id}/${dateSegment}/${crypto.randomUUID()}.jpg`

  const arrayBuffer = await image.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(PICTURE_SENDS_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: image.type || 'image/jpeg' })

  if (uploadError) {
    console.error('[picture-report] sendPicture: 画像のアップロードに失敗', uploadError)
    return { success: false, error: '画像のアップロードに失敗しました' }
  }

  const { error: insertError } = await supabase.from('picture_sends').insert({
    tenant_id: user.tenant_id,
    user_id: user.id,
    division_id: user.division_id,
    user_email: user.email ?? '',
    subject_id: parsed.data.subjectId,
    subject_text: parsed.data.subjectText,
    body_text: parsed.data.bodyText,
    priority: parsed.data.priority,
    storage_path: storagePath,
  })

  if (insertError) {
    // INSERT失敗時はアップロード済みの画像を掃除する
    console.error('[picture-report] sendPicture: picture_sends テーブルへの挿入に失敗', insertError)
    await supabase.storage.from(PICTURE_SENDS_BUCKET).remove([storagePath])
    return { success: false, error: '送信に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}

/** 本文を編集する（本人のみ。RLSでも二重に保護される） */
export async function updateSendBody(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.id) return { success: false, error: '認証エラー' }

  const parsed = updateSendBodySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正な入力です' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('picture_sends')
    .update({ body_text: parsed.data.bodyText })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[picture-report] updateSendBody: 本文の更新に失敗', error)
    return { success: false, error: '本文の保存に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}

/** 投稿を削除する（本人のみ） */
export async function deleteSend(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.id) return { success: false, error: '認証エラー' }

  const parsed = deleteSendSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正なIDです' }

  const supabase = await createClient()

  const { data: target, error: fetchError } = await supabase
    .from('picture_sends')
    .select('storage_path')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !target) return { success: false, error: '対象の投稿が見つかりません' }

  const { error: storageError } = await supabase.storage
    .from(PICTURE_SENDS_BUCKET)
    .remove([target.storage_path])
  if (storageError) {
    console.error('[picture-report] deleteSend: ストレージから画像の削除に失敗', storageError)
    return { success: false, error: '画像の削除に失敗しました' }
  }

  const { error: deleteError } = await supabase
    .from('picture_sends')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[picture-report] deleteSend: picture_sends レコードの削除に失敗', deleteError)
    return { success: false, error: '投稿の削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}
