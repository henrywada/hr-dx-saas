import { NextResponse } from 'next/server'
import { runSlideImageUpload } from '@/features/e-learning/slide-media-upload'

/** 大きい multipart を Server Action に載せない（本番で RSC 応答エラー回避） */
export const maxDuration = 120

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slideId: string }> }
) {
  const { slideId } = await ctx.params
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'フォームデータの読み込みに失敗しました' },
      { status: 400 }
    )
  }

  const courseId = formData.get('courseId')
  const file = formData.get('file')
  if (typeof courseId !== 'string' || courseId.length === 0) {
    return NextResponse.json({ ok: false, error: 'courseId が必要です' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'ファイルが選択されていません' }, { status: 400 })
  }

  try {
    const url = await runSlideImageUpload({ slideId, courseId, file })
    return NextResponse.json({ ok: true, url })
  } catch (err) {
    const message = err instanceof Error ? err.message : '画像のアップロードに失敗しました'
    if (message === 'Unauthorized') {
      return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
