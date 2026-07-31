import { NextResponse } from 'next/server'
import { prepareAiScenarioSignedUpload } from '@/features/e-learning/ai-scenario-upload'
import type { AiScenarioUploadKind } from '@/features/e-learning/ai-scenario-upload'

export async function POST(req: Request) {
  let body: {
    kind?: unknown
    fileName?: unknown
    contentType?: unknown
    fileSize?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON が不正です' }, { status: 400 })
  }

  const kind = body.kind === 'video' || body.kind === 'resource' ? body.kind : null
  const fileName = typeof body.fileName === 'string' ? body.fileName : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : ''
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : -1

  if (!kind) {
    return NextResponse.json({ ok: false, error: 'kind が不正です' }, { status: 400 })
  }

  try {
    const data = await prepareAiScenarioSignedUpload({
      kind: kind as AiScenarioUploadKind,
      fileName,
      contentType,
      fileSize,
    })
    return NextResponse.json({
      ok: true,
      bucket: data.bucket,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '署名 URL の取得に失敗しました'
    if (message === 'Unauthorized') {
      return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
