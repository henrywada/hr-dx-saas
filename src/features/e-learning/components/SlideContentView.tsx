'use client'

import type { ElSlide } from '../types'

interface Props {
  slide: ElSlide
}

export function SlideContentView({ slide }: Props) {
  const isImageSlide = slide.slide_type === 'image'

  return (
    <div className="space-y-4">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800 leading-snug">{slide.title}</h2>
      )}

      {/* 画像スライド: 常に「左: 画像 / 右: 説明テキスト」2カラムレイアウト */}
      {isImageSlide ? (
        <div className="flex gap-6 items-start">
          <div className="w-1/2 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            {slide.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image_url}
                alt={slide.title ?? 'スライド画像'}
                className="w-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
                画像未設定
              </div>
            )}
          </div>
          <div className="flex-1 prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.content ?? ''}
          </div>
        </div>
      ) : (
        slide.content && (
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.content}
          </div>
        )
      )}
    </div>
  )
}
