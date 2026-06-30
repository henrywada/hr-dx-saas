import JSZip from 'jszip'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { EL_SCORM_PACKAGES_BUCKET, EL_SCORM_ZIP_MAX_BYTES } from '../constants'
import { parseScorm12LaunchPath } from './scorm-manifest'

async function ensureScormBucket(admin: ReturnType<typeof createAdminServiceClient>) {
  const { error: createErr } = await admin.storage.createBucket(EL_SCORM_PACKAGES_BUCKET, {
    public: false,
    fileSizeLimit: EL_SCORM_ZIP_MAX_BYTES,
  })
  if (createErr && !createErr.message.includes('already exists')) {
    throw new Error(createErr.message)
  }
}

/** SCORM ZIP を Storage に展開し、起動パスを返す */
export async function extractScormZipToStorage(input: {
  tenantId: string
  courseId: string
  zipBuffer: Buffer
  originalFilename: string
}): Promise<{ storagePrefix: string; launchPath: string }> {
  if (input.zipBuffer.byteLength > EL_SCORM_ZIP_MAX_BYTES) {
    throw new Error(`ZIP は ${EL_SCORM_ZIP_MAX_BYTES / 1024 / 1024}MB 以内にしてください`)
  }

  const zip = await JSZip.loadAsync(input.zipBuffer)
  const manifestEntry =
    zip.file(/imsmanifest\.xml$/i)?.[0] ?? zip.file('imsmanifest.xml')?.[0]
  if (!manifestEntry) throw new Error('imsmanifest.xml が見つかりません')

  const manifestXml = await manifestEntry.async('string')
  const launchPath = parseScorm12LaunchPath(manifestXml)
  if (!launchPath) throw new Error('manifest から起動ファイル (href) を特定できません')

  const storagePrefix = `${input.tenantId}/${input.courseId}`
  const admin = createAdminServiceClient()
  await ensureScormBucket(admin)

  const uploads: { path: string; body: Buffer; contentType: string }[] = []
  const entries = Object.values(zip.files).filter(f => !f.dir)

  for (const entry of entries) {
    const normalized = entry.name.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized || normalized.includes('..')) continue
    const buf = Buffer.from(await entry.async('arraybuffer'))
    const ext = normalized.split('.').pop()?.toLowerCase() ?? ''
    const contentType =
      ext === 'html' || ext === 'htm'
        ? 'text/html'
        : ext === 'js'
          ? 'application/javascript'
          : ext === 'css'
            ? 'text/css'
            : ext === 'json'
              ? 'application/json'
              : ext === 'xml'
                ? 'application/xml'
                : 'application/octet-stream'
    uploads.push({ path: `${storagePrefix}/${normalized}`, body: buf, contentType })
  }

  for (const file of uploads) {
    const { error } = await admin.storage.from(EL_SCORM_PACKAGES_BUCKET).upload(file.path, file.body, {
      contentType: file.contentType,
      upsert: true,
    })
    if (error) throw new Error(`Storage へのアップロードに失敗: ${error.message}`)
  }

  return { storagePrefix, launchPath }
}
