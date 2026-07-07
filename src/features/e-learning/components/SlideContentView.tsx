'use client'

import type { ElSlide } from '../types'

interface Props {
  slide: ElSlide
  audioEnabled: boolean
  /** 将来の VTT 字幕制御用。当面 UI では未使用 */
  captionsEnabled?: boolean
}

function isProbablyYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const m = u.pathname.match(/\/embed\/([^/?]+)/)
      if (m) return `https://www.youtube.com/embed/${m[1]}`
    }
  } catch {
    return null
  }
  return null
}

function SlideVideoPlayer({ url }: { url: string }) {
  const embed = isProbablyYoutubeUrl(url) ? getYoutubeEmbedUrl(url) : null
  if (embed) {
    return (
      <div className="aspect-video w-full max-w-3xl rounded-xl overflow-hidden border border-gray-200 bg-black">
        <iframe
          src={embed}
          title="スライド動画"
          className="w-full h-full min-h-[200px]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <video
      src={url}
      controls
      className="w-full max-w-3xl rounded-xl border border-gray-200 bg-black"
    />
  )
}

// 当面 transcript 列を「要点(ポイント)」として流用。将来 音声書き起こし(VTT)を
// 入れる際は summary 列を分離する（DBは未変更）。
function SlidePointsPanel({ text }: { text: string }) {
  if (!text) return null

  return (
    <details
      className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white overflow-hidden"
      open
    >
      <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer select-none list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
        <span>このスライドのポイント</span>
        <span className="text-xs text-gray-400 font-normal">タップで開閉</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words border-t border-gray-100">
        {text}
      </div>
    </details>
  )
}

function SlideMediaBlock({ slide, audioEnabled }: { slide: ElSlide; audioEnabled: boolean }) {
  const hasVideo = Boolean(slide.video_url)
  const hasAudio = Boolean(slide.audio_url)
  if (!hasVideo && !hasAudio) return null

  return (
    <div className="space-y-3 w-full">
      {hasVideo && slide.video_url && <SlideVideoPlayer url={slide.video_url} />}
      {hasAudio && slide.audio_url && audioEnabled && (
        <audio
          src={slide.audio_url}
          controls
          className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white"
        />
      )}
    </div>
  )
}

export function SlideContentView({ slide, audioEnabled }: Props) {
  const isImageSlide = slide.slide_type === 'image'
  const isMicro = slide.slide_type === 'micro_content'
  const pointsText = slide.transcript?.trim() ?? ''

  if (isMicro) {
    return (
      <div className="space-y-4">
        {slide.title && (
          <h2 className="text-xl font-bold text-gray-800 leading-snug">{slide.title}</h2>
        )}
        {slide.content && (
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {slide.content}
          </div>
        )}
        {slide.image_url && (
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-w-3xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image_url}
              alt={slide.title ?? 'スライド画像'}
              className="w-full object-contain max-h-[420px]"
            />
          </div>
        )}
        <SlideMediaBlock slide={slide} audioEnabled={audioEnabled} />
        <SlidePointsPanel text={pointsText} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800 leading-snug">{slide.title}</h2>
      )}

      {/* 画像スライド: 常に「左: 画像 / 右: 説明テキスト」2カラムレイアウト */}
      {isImageSlide ? (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          <div className="w-full sm:w-1/2 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
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
          <div className="flex-1 w-full prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {slide.content ?? ''}
          </div>
        </div>
      ) : (
        slide.content && (
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {slide.content}
          </div>
        )
      )}

      <SlideMediaBlock slide={slide} audioEnabled={audioEnabled} />
      <SlidePointsPanel text={pointsText} />
    </div>
  )
}
