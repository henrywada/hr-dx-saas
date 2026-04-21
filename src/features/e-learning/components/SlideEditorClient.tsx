'use client'

import { useState, useTransition } from 'react'
import { Plus, ChevronUp, ChevronDown, Trash2, FileText, Image, HelpCircle } from 'lucide-react'
import { upsertSlide, deleteSlide, reorderSlides } from '../actions'
import { SLIDE_TYPE_LABELS } from '../constants'
import { SlideFormPanel } from './SlideFormPanel'
import type { ElCourseWithSlides, ElSlide, SlideType } from '../types'

interface Props {
  course: ElCourseWithSlides
}

const SLIDE_ICONS: Record<SlideType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
}

export function SlideEditorClient({ course }: Props) {
  const [isPending, startTransition] = useTransition()
  const [slides, setSlides] = useState<ElSlide[]>(course.slides)
  const [selectedId, setSelectedId] = useState<string | null>(slides[0]?.id ?? null)

  const selectedSlide = slides.find(s => s.id === selectedId)

  const addSlide = (type: SlideType) => {
    startTransition(async () => {
      const newSlide = await upsertSlide({
        course_id: course.id,
        slide_order: slides.length,
        slide_type: type,
        title: `新しい${SLIDE_TYPE_LABELS[type]}`,
      })
      const s = { ...newSlide, quiz_questions: [] } as ElSlide
      setSlides(prev => [...prev, s])
      setSelectedId(newSlide.id)
    })
  }

  const removeSlide = (id: string) => {
    if (!confirm('このスライドを削除しますか？')) return
    startTransition(async () => {
      await deleteSlide(id, course.id)
      setSlides(prev => {
        const next = prev.filter(s => s.id !== id)
        if (selectedId === id) setSelectedId(next[0]?.id ?? null)
        return next
      })
    })
  }

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newSlides.length) return
    ;[newSlides[index], newSlides[swapIndex]] = [newSlides[swapIndex], newSlides[index]]
    setSlides(newSlides)
    startTransition(() =>
      reorderSlides(
        course.id,
        newSlides.map(s => s.id)
      )
    )
  }

  const handleSlideUpdate = (updated: ElSlide) => {
    setSlides(prev => prev.map(s => (s.id === updated.id ? updated : s)))
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[500px]">
      {/* スライド一覧パネル */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="flex-1 overflow-y-auto space-y-1">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => setSelectedId(slide.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedId === slide.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <span className="text-gray-400 w-5 text-center text-xs font-mono">{i + 1}</span>
              <span
                className={`flex-shrink-0 ${selectedId === slide.id ? 'text-blue-500' : 'text-gray-400'}`}
              >
                {SLIDE_ICONS[slide.slide_type]}
              </span>
              <span className="text-sm text-gray-700 truncate flex-1">
                {slide.title ?? '（タイトルなし）'}
              </span>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    moveSlide(i, 'up')
                  }}
                  disabled={i === 0 || isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    moveSlide(i, 'down')
                  }}
                  disabled={i === slides.length - 1 || isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  removeSlide(slide.id)
                }}
                disabled={isPending}
                className="text-red-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200">
          {(['text', 'image', 'quiz'] as SlideType[]).map(type => (
            <button
              key={type}
              onClick={() => addSlide(type)}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-gray-400" />
              {SLIDE_TYPE_LABELS[type]}を追加
            </button>
          ))}
        </div>
      </div>

      {/* スライド編集エリア */}
      <div className="flex-1 overflow-y-auto">
        {selectedSlide ? (
          <SlideFormPanel slide={selectedSlide} courseId={course.id} onUpdate={handleSlideUpdate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="w-10 h-10 mb-3" />
            <p className="text-sm">左のパネルからスライドを選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
