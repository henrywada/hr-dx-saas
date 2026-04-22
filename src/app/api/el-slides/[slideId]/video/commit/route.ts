import { NextResponse } from 'next/server'
import { commitSlideVideoAfterDirectUpload } from '@/features/e-learning/slide-media-upload'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slideId: string }> }
) {
  const { slideId } = await ctx.params
  let body: { courseId?: unknown; storagePath?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON が不正です' }, { status: 400 })
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId : ''
  const storagePath = typeof body.storagePath === 'string' ? body.storagePath : ''
  if (!courseId || !storagePath) {
    return NextResponse.json(
      { ok: false, error: 'courseId と storagePath が必要です' },
      { status: 400 }
    )
  }

  try {
    const url = await commitSlideVideoAfterDirectUpload({ slideId, courseId, storagePath })
    return NextResponse.json({ ok: true, url })
  } catch (err) {
    const message = err instanceof Error ? err.message : '動画の保存に失敗しました'
    if (message === 'Unauthorized') {
      return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
