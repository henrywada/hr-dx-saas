/**
 * スライド画像・動画のアップロード（Server Action / API）
 * - 本番では Vercel のボディ上限（413）を避けるため、クライアントは signed-upload → Storage 直 PUT → commit の流れを使う。
 */
import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth/server-user'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { createClient } from '@/lib/supabase/server'
import {
  EL_SLIDE_IMAGE_MAX_BYTES,
  EL_SLIDE_IMAGE_MAX_MB,
  EL_SLIDE_IMAGES_BUCKET,
  EL_SLIDE_VIDEO_MAX_BYTES,
  EL_SLIDE_VIDEO_MAX_MB,
  EL_SLIDE_VIDEOS_BUCKET,
} from './constants'

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

const SLIDE_VIDEO_BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: EL_SLIDE_VIDEO_MAX_BYTES,
  allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'] as string[],
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
    throw new Error(`動画ストレージの設定を更新できませんでした: ${updateErr.message}`)
  }
}

export async function runSlideImageUpload(input: {
  slideId: string
  courseId: string
  file: File
}): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, courseId, file } = input

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
  if (updateErr) {
    throw supabaseToError(updateErr, '画像URLをスライドに保存できませんでした')
  }
  if (!updatedRow?.image_url) {
    throw new Error(
      '画像URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}

export async function runSlideVideoUpload(input: {
  slideId: string
  courseId: string
  file: File
}): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, courseId, file } = input

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
  if (updateErr) {
    throw supabaseToError(updateErr, '動画URLをスライドに保存できませんでした')
  }
  if (!updatedRow?.video_url) {
    throw new Error(
      '動画URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function imageExtFromMeta(fileName: string, contentType: string): string {
  const raw = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(raw)) {
    return raw === 'jpeg' ? 'jpg' : raw
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return map[contentType] ?? 'jpg'
}

function assertImagePathForSlide(slideId: string, storagePath: string): void {
  const expectedPrefix = `slides/${slideId}.`
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new Error('画像の保存パスが不正です')
  }
  const rest = storagePath.slice(expectedPrefix.length)
  if (!rest || rest.includes('/') || !/^[a-z0-9]+$/i.test(rest)) {
    throw new Error('画像の保存パスが不正です')
  }
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rest.toLowerCase())) {
    throw new Error('画像の保存パスが不正です')
  }
}

function assertVideoPathForSlide(slideId: string, storagePath: string): void {
  const re = new RegExp(`^slides/${escapeRegExp(slideId)}-\\d+\\.(mp4|webm|mov)$`)
  if (!re.test(storagePath)) {
    throw new Error('動画の保存パスが不正です')
  }
}

/** ブラウザから Supabase へ直アップロードするための署名情報（JSON API のみ・ボディ小） */
export async function prepareSlideImageSignedUpload(input: {
  slideId: string
  fileName: string
  contentType: string
  fileSize: number
}): Promise<{ bucket: string; path: string; token: string; signedUrl: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, fileName, contentType, fileSize } = input

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(contentType)) {
    throw new Error('JPEG・PNG・GIF・WebP のみアップロードできます')
  }
  if (fileSize > EL_SLIDE_IMAGE_MAX_BYTES) {
    throw new Error(`ファイルサイズは ${EL_SLIDE_IMAGE_MAX_MB}MB 以下にしてください`)
  }

  await ensureSlideImagesBucket()
  const ext = imageExtFromMeta(fileName, contentType)
  const storagePath = `slides/${slideId}.${ext}`

  const admin = createAdminServiceClient()
  const { data, error } = await admin.storage
    .from(EL_SLIDE_IMAGES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true })

  if (error || !data) {
    throw new Error(error?.message ?? '署名付きアップロード URL の取得に失敗しました')
  }

  return {
    bucket: EL_SLIDE_IMAGES_BUCKET,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  }
}

export async function prepareSlideVideoSignedUpload(input: {
  slideId: string
  fileName: string
  contentType: string
  fileSize: number
}): Promise<{ bucket: string; path: string; token: string; signedUrl: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, fileName, contentType, fileSize } = input

  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  if (!allowedTypes.includes(contentType)) {
    throw new Error('MP4・WebM・QuickTime のみアップロードできます')
  }
  if (fileSize > EL_SLIDE_VIDEO_MAX_BYTES) {
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

  const ext = fileName.split('.').pop()?.toLowerCase()
  const safeExt =
    ext === 'webm' ? 'webm' : ext === 'mov' ? 'mov' : contentType === 'video/quicktime' ? 'mov' : 'mp4'
  const storagePath = `slides/${slideId}-${Date.now()}.${safeExt}`

  const { data, error } = await admin.storage
    .from(EL_SLIDE_VIDEOS_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    throw new Error(error?.message ?? '署名付きアップロード URL の取得に失敗しました')
  }

  return {
    bucket: EL_SLIDE_VIDEOS_BUCKET,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  }
}

export async function commitSlideImageAfterDirectUpload(input: {
  slideId: string
  courseId: string
  storagePath: string
}): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, courseId, storagePath } = input
  assertImagePathForSlide(slideId, storagePath)

  const admin = createAdminServiceClient()
  const { data: urlData } = admin.storage.from(EL_SLIDE_IMAGES_BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  const supabase = await createClient()
  const { data: updatedRow, error: updateErr } = await supabase
    .from('el_slides')
    .update({ image_url: publicUrl })
    .eq('id', slideId)
    .select('image_url')
    .single()
  if (updateErr) {
    throw supabaseToError(updateErr, '画像URLをスライドに保存できませんでした')
  }
  if (!updatedRow?.image_url) {
    throw new Error(
      '画像URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}

export async function commitSlideVideoAfterDirectUpload(input: {
  slideId: string
  courseId: string
  storagePath: string
}): Promise<string> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { slideId, courseId, storagePath } = input
  assertVideoPathForSlide(slideId, storagePath)

  const admin = createAdminServiceClient()
  const { data: urlData } = admin.storage.from(EL_SLIDE_VIDEOS_BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  const supabase = await createClient()
  const { data: updatedRow, error: updateErr } = await supabase
    .from('el_slides')
    .update({ video_url: publicUrl })
    .eq('id', slideId)
    .select('video_url')
    .single()
  if (updateErr) {
    throw supabaseToError(updateErr, '動画URLをスライドに保存できませんでした')
  }
  if (!updatedRow?.video_url) {
    throw new Error(
      '動画URLをスライドに保存できませんでした（権限またはスライドIDを確認してください）'
    )
  }

  revalidatePath(`/adm/el-courses/${courseId}`)
  revalidatePath(`/saas_adm/el-templates/${courseId}`)
  return publicUrl
}
