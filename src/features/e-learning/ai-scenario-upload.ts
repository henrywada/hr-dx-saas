/**
 * AIシナリオ生成用の参考資料・参考動画の一時アップロード（Server Action / API）
 * Vercel Functions のリクエストボディ上限（4.5MB）を避けるため、
 * クライアントは signed-upload → Storage 直 PUT → Server Action にはパスのみ渡す流れを使う。
 * アップロードされたファイルは AI 生成に使われた後、一時ファイルとして削除する。
 */
import { getServerUser } from '@/lib/auth/server-user'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import {
  EL_AI_SCENARIO_UPLOADS_BUCKET,
  EL_AI_RESOURCE_MAX_BYTES,
  EL_AI_RESOURCE_MAX_MB,
  EL_SLIDE_VIDEO_MAX_BYTES,
  EL_SLIDE_VIDEO_MAX_MB,
} from './constants'

export type AiScenarioUploadKind = 'video' | 'resource'

const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const RESOURCE_ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const AI_SCENARIO_UPLOADS_BUCKET_OPTIONS = {
  public: false,
  fileSizeLimit: EL_SLIDE_VIDEO_MAX_BYTES,
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

async function ensureAiScenarioUploadsBucket() {
  const admin = createAdminServiceClient()
  const { error: createErr } = await admin.storage.createBucket(
    EL_AI_SCENARIO_UPLOADS_BUCKET,
    AI_SCENARIO_UPLOADS_BUCKET_OPTIONS
  )
  if (!createErr) return
  if (!isBucketAlreadyExistsError(createErr.message)) {
    throw new Error(`バケット作成に失敗しました: ${createErr.message}`)
  }
}

function tenantPrefix(kind: AiScenarioUploadKind, tenantId: string | null): string {
  return `${kind}/${tenantId ?? 'template'}/`
}

function assertAiScenarioPath(
  kind: AiScenarioUploadKind,
  tenantId: string | null,
  storagePath: string
): void {
  if (!storagePath.startsWith(tenantPrefix(kind, tenantId))) {
    throw new Error('一時ファイルのパスが不正です')
  }
}

/** ブラウザから Supabase へ直アップロードするための署名情報 */
export async function prepareAiScenarioSignedUpload(input: {
  kind: AiScenarioUploadKind
  fileName: string
  contentType: string
  fileSize: number
}): Promise<{ bucket: string; path: string; token: string; signedUrl: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const { kind, fileName, contentType, fileSize } = input

  if (kind === 'video') {
    if (!VIDEO_ALLOWED_TYPES.includes(contentType)) {
      throw new Error('MP4・WebM・QuickTime のみアップロードできます')
    }
    if (fileSize > EL_SLIDE_VIDEO_MAX_BYTES) {
      throw new Error(`動画ファイルは ${EL_SLIDE_VIDEO_MAX_MB}MB 以下にしてください`)
    }
  } else {
    if (!RESOURCE_ALLOWED_TYPES.includes(contentType)) {
      throw new Error('PDF・DOCX・TXT のみアップロードできます')
    }
    if (fileSize > EL_AI_RESOURCE_MAX_BYTES) {
      throw new Error(`資料ファイルは ${EL_AI_RESOURCE_MAX_MB}MB 以下にしてください`)
    }
  }

  await ensureAiScenarioUploadsBucket()
  const admin = createAdminServiceClient()

  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  const storagePath = `${tenantPrefix(kind, user.tenant_id)}${crypto.randomUUID()}.${ext}`

  const { data, error } = await admin.storage
    .from(EL_AI_SCENARIO_UPLOADS_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    throw new Error(error?.message ?? '署名付きアップロード URL の取得に失敗しました')
  }

  return {
    bucket: EL_AI_SCENARIO_UPLOADS_BUCKET,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  }
}

/** アップロード済みの一時ファイルをダウンロードする（呼び出し元のテナントの領域か検証する） */
export async function downloadAiScenarioUpload(input: {
  kind: AiScenarioUploadKind
  tenantId: string | null
  storagePath: string
}): Promise<Buffer> {
  assertAiScenarioPath(input.kind, input.tenantId, input.storagePath)

  const admin = createAdminServiceClient()
  const { data, error } = await admin.storage
    .from(EL_AI_SCENARIO_UPLOADS_BUCKET)
    .download(input.storagePath)
  if (error || !data) {
    throw new Error(error?.message ?? '一時ファイルのダウンロードに失敗しました')
  }
  return Buffer.from(await data.arrayBuffer())
}

/** 一時ファイルを削除する（AI 生成完了後のクリーンアップ） */
export async function deleteAiScenarioUpload(storagePath: string): Promise<void> {
  const admin = createAdminServiceClient()
  await admin.storage.from(EL_AI_SCENARIO_UPLOADS_BUCKET).remove([storagePath])
}
