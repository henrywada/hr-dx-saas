import { BookOpen } from 'lucide-react'
import type { ElSlide } from '../types'

interface Props {
  slide: ElSlide
}

// [Phase 4] 振り返り＋解説スライド
// シナリオ問題の模範解答の根拠と学習ポイントを提示する
export function ReflectionView({ slide }: Props) {
  return (
    <div className="space-y-5">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>
      )}

      {slide.content && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5 space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
            <BookOpen className="w-4 h-4 shrink-0" />
            振り返り・解説
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.content}
          </p>
        </div>
      )}

      {slide.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.image_url}
          alt="解説画像"
          className="w-full rounded-xl object-contain max-h-64"
        />
      )}

      <p className="text-xs text-gray-400 text-center">内容を確認したら「次へ」を押してください</p>
    </div>
  )
}
