'use client'

import type { ElSlide } from '../types'

interface Props {
  slide: ElSlide
}

export function SlideContentView({ slide }: Props) {
  return (
    <div className="space-y-4">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800 leading-snug">{slide.title}</h2>
      )}

      {slide.slide_type === 'image' && slide.image_url ? (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image_url} alt={slide.title ?? 'スライド画像'} className="w-full" />
        </div>
      ) : null}

      {slide.content && (
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
          {slide.content}
        </div>
      )}
    </div>
  )
}
