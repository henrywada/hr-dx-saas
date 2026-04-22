'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { completeCourse, recordSlideProgress } from '../actions'
import { SlideProgressBar } from './SlideProgressBar'
import { SlideContentView } from './SlideContentView'
import { QuizSlideView } from './QuizSlideView'
import { LearningObjectiveView } from './LearningObjectiveView'
import { ScenarioView } from './ScenarioView'
import { ReflectionView } from './ReflectionView'
import { ChecklistView } from './ChecklistView'
import { CourseCompletionBanner } from './CourseCompletionBanner'
import { SLIDE_TYPE_LABELS } from '../constants'
import type { ElCourseViewerData, ElChecklistCompletion } from '../types'

interface Props {
  data: ElCourseViewerData
}

export function CourseViewerClient({ data }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCompletion, setShowCompletion] = useState(false)

  const {
    slides,
    assignment,
    progress,
    checklistCompletions,
    title,
    bloom_level,
    learning_objectives,
  } = data

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

  // シナリオスライドの選択済みブランチ ID
  const scenarioProgress = progress.find(p => p.slide_id === currentSlide.id)
  const selectedBranchId = scenarioProgress?.scenario_branch_id ?? null

  // 現在スライドのチェックリスト完了記録
  const currentChecklistCompletions: ElChecklistCompletion[] = checklistCompletions.filter(
    c => currentSlide.checklist_items?.some(it => it.id === c.checklist_item_id) ?? false
  )

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

  // 現在スライド種別に応じてコンポーネントを切り替える
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
        return <SlideContentView slide={currentSlide} />
      case 'scenario':
        return (
          <ScenarioView
            slide={currentSlide}
            assignmentId={assignment.id}
            isCompleted={isCurrentCompleted}
            selectedBranchId={selectedBranchId}
            onCompleted={() => markCompleted(currentSlide.id)}
          />
        )
      case 'reflection':
        return <ReflectionView slide={currentSlide} />
      case 'checklist':
        return (
          <ChecklistView
            slide={currentSlide}
            assignmentId={assignment.id}
            completions={currentChecklistCompletions}
            onAllChecked={() => markCompleted(currentSlide.id)}
          />
        )
      // 既存スライド（後方互換）
      case 'quiz':
        return (
          <QuizSlideView
            key={currentSlide.id}
            slide={currentSlide}
            assignmentId={assignment.id}
            isCompleted={isCurrentCompleted}
            onCompleted={() => markCompleted(currentSlide.id)}
          />
        )
      case 'text':
      case 'image':
      default:
        return <SlideContentView slide={currentSlide} />
    }
  }

  // 「次へ」ボタンの活性条件
  const canAdvance = () => {
    switch (currentSlide.slide_type) {
      case 'quiz':
      case 'scenario':
        return isCurrentCompleted
      case 'checklist':
        return true  // 未完了でも「後でチェックする」として先へ進める
      default:
        return true
    }
  }

  // 「次へ」ボタンのラベル
  const nextLabel = () => {
    if (isPending) return '記録中...'
    if (isLastSlide) return '完了する'
    if (currentSlide.slide_type === 'checklist' && !isCurrentCompleted) return '後でチェックする'
    return null  // デフォルトは「次へ」アイコン付き
  }

  // 「次へ」クリックハンドラ
  const handleNext = () => {
    if (isPending || !canAdvance()) return

    if (
      currentSlide.slide_type === 'quiz' ||
      currentSlide.slide_type === 'scenario'
    ) {
      // これらは子コンポーネント内で進捗記録済み → advanceOrFinish のみ
      advanceOrFinish()
    } else {
      // objective / micro_content / reflection / checklist / text / image
      handleTextNext()
    }
  }

  const label = nextLabel()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-semibold text-gray-700 line-clamp-1">{title}</h1>
            {currentSlide.slide_type !== 'text' &&
              currentSlide.slide_type !== 'image' &&
              currentSlide.slide_type !== 'quiz' && (
                <span className="ml-2 shrink-0 text-xs text-gray-400">
                  {SLIDE_TYPE_LABELS[currentSlide.slide_type]}
                </span>
              )}
          </div>
          <SlideProgressBar
            total={slides.length}
            current={currentIndex}
            completedIds={completedIds}
            slideIds={slideIds}
          />
        </div>
      </header>

      {/* スライドコンテンツ */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">{renderSlide()}</main>

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

          <div className="flex-1 min-w-0">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || isPending}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {label ?? (
                <>
                  次へ <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <Link
            href="/el-courses"
            className="shrink-0 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            中断
          </Link>
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
