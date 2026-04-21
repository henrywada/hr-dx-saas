'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { completeCourse, recordSlideProgress } from '../actions'
import { SlideProgressBar } from './SlideProgressBar'
import { SlideContentView } from './SlideContentView'
import { QuizSlideView } from './QuizSlideView'
import { CourseCompletionBanner } from './CourseCompletionBanner'
import type { ElCourseViewerData } from '../types'

interface Props {
  data: ElCourseViewerData
}

export function CourseViewerClient({ data }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCompletion, setShowCompletion] = useState(false)

  const { slides, assignment, progress, title } = data

  const serverCompletedIds = new Set(
    progress.filter(p => p.status === 'completed').map(p => p.slide_id)
  )

  const firstIncomplete = slides.findIndex(s => !serverCompletedIds.has(s.id))
  const initialIndex = firstIncomplete === -1 ? slides.length - 1 : firstIncomplete

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(serverCompletedIds))

  const currentSlide = slides[currentIndex]
  if (!currentSlide) return null

  const isLastSlide = currentIndex === slides.length - 1
  const isCourseAlreadyCompleted = assignment.completed_at !== null
  const isCurrentCompleted = completedIds.has(currentSlide.id)
  const slideIds = slides.map(s => s.id)

  const markCompleted = (slideId: string) => {
    setCompletedIds(prev => new Set([...prev, slideId]))
  }

  const advanceOrFinish = () => {
    if (isLastSlide) {
      startTransition(async () => {
        if (!isCourseAlreadyCompleted) {
          await completeCourse(assignment.id)
        }
        setShowCompletion(true)
      })
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleTextNext = () => {
    if (isPending) return
    if (!isCurrentCompleted) {
      startTransition(async () => {
        await recordSlideProgress(assignment.id, currentSlide.id)
        markCompleted(currentSlide.id)
        advanceOrFinish()
      })
    } else {
      advanceOrFinish()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-sm font-semibold text-gray-700 line-clamp-1 mb-2">{title}</h1>
          <SlideProgressBar
            total={slides.length}
            current={currentIndex}
            completedIds={completedIds}
            slideIds={slideIds}
          />
        </div>
      </header>

      {/* スライドコンテンツ */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {currentSlide.slide_type === 'quiz' ? (
          <QuizSlideView
            key={currentSlide.id}
            slide={currentSlide}
            assignmentId={assignment.id}
            isCompleted={isCurrentCompleted}
            onCompleted={() => markCompleted(currentSlide.id)}
          />
        ) : (
          <SlideContentView slide={currentSlide} />
        )}
      </main>

      {/* 下部ナビゲーション */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            前へ
          </button>

          <div className="flex-1">
            {currentSlide.slide_type === 'quiz' ? (
              <button
                onClick={advanceOrFinish}
                disabled={!isCurrentCompleted || isPending}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {isLastSlide ? (
                  '完了する'
                ) : (
                  <>
                    次へ <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleTextNext}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {isPending ? (
                  '記録中...'
                ) : isLastSlide ? (
                  '完了する'
                ) : (
                  <>
                    次へ <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>

      {showCompletion && (
        <CourseCompletionBanner
          courseTitle={title}
          onClose={() => {
            setShowCompletion(false)
            router.push('/el-courses')
          }}
        />
      )}
    </div>
  )
}
