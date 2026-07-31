'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SlideProgressBar } from './SlideProgressBar'
import { SlideContentView } from './SlideContentView'
import { QuizSlideView } from './QuizSlideView'
import { LearningObjectiveView } from './LearningObjectiveView'
import { ScenarioView } from './ScenarioView'
import { ReflectionView } from './ReflectionView'
import { ChecklistView } from './ChecklistView'
import type { ElCourseWithSlides } from '../types'

interface Props {
  course: ElCourseWithSlides
  onClose: () => void
}

/**
 * 管理者向け「シミュレーションプレイ」。
 * 受講者向け CourseViewerClient と異なり、進捗はDBに保存せずメモリ上のみで管理する。
 */
export function CoursePreviewPlayer({ course, onClose }: Props) {
  const { slides, title, bloom_level, learning_objectives } = course
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const currentSlide = slides[currentIndex]

  if (!currentSlide) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">プレビューできるスライドがありません</p>
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-[#FD7601] text-white">
          閉じる
        </button>
      </div>
    )
  }

  const isLastSlide = currentIndex === slides.length - 1
  const isCurrentCompleted = completedIds.has(currentSlide.id)
  const slideIds = slides.map(s => s.id)

  const markCompleted = (slideId: string) => {
    setCompletedIds(prev => new Set([...prev, slideId]))
  }

  const canAdvance = () => {
    switch (currentSlide.slide_type) {
      case 'quiz':
      case 'scenario':
        return isCurrentCompleted
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!canAdvance()) return
    if (currentSlide.slide_type !== 'quiz' && currentSlide.slide_type !== 'scenario') {
      markCompleted(currentSlide.id)
    }
    if (isLastSlide) {
      onClose()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const renderSlide = () => {
    switch (currentSlide.slide_type) {
      case 'objective':
        return (
          <LearningObjectiveView
            slide={currentSlide}
            course={{
              bloom_level: bloom_level ?? null,
              learning_objectives: learning_objectives ?? [],
            }}
          />
        )
      case 'micro_content':
        return <SlideContentView slide={currentSlide} audioEnabled />
      case 'scenario':
        return (
          <ScenarioView
            slide={currentSlide}
            isCompleted={isCurrentCompleted}
            onCompleted={() => markCompleted(currentSlide.id)}
          />
        )
      case 'reflection':
        return <ReflectionView slide={currentSlide} />
      case 'checklist':
        return (
          <ChecklistView
            slide={currentSlide}
            completions={[]}
            onAllChecked={() => markCompleted(currentSlide.id)}
          />
        )
      case 'quiz':
        return (
          <QuizSlideView
            key={currentSlide.id}
            slide={currentSlide}
            isCompleted={isCurrentCompleted}
            onCompleted={() => markCompleted(currentSlide.id)}
          />
        )
      case 'text':
      case 'image':
      default:
        return <SlideContentView slide={currentSlide} audioEnabled />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <header className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-[#FD7601]/10 px-2 py-0.5 text-[10px] font-bold text-[#FD7601]">
                プレビュー
              </span>
              <h1 className="truncate text-sm font-semibold text-gray-700">{title}</h1>
            </div>
            <SlideProgressBar
              total={slides.length}
              current={currentIndex}
              completedIds={completedIds}
              slideIds={slideIds}
            />
          </div>
          <button
            onClick={onClose}
            aria-label="プレビューを閉じる"
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">{renderSlide()}</div>
      </main>

      <footer className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            前へ
          </button>

          <div className="min-w-0 flex-1">
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#FD7601] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isLastSlide ? (
                'プレビューを終了'
              ) : (
                <>
                  次へ <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            中断
          </button>
        </div>
      </footer>
    </div>
  )
}
