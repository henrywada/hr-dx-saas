import { CheckCircle } from 'lucide-react'
import type { ElCourse, ElSlide } from '../types'
import { BloomLevelBadge } from './BloomLevelBadge'

interface Props {
  slide: ElSlide
  course: Pick<ElCourse, 'bloom_level' | 'learning_objectives'>
}

// [Phase 1] 学習目標スライド
// Bloom's Taxonomy レベルバッジと学習目標リストを表示する
export function LearningObjectiveView({ slide, course }: Props) {
  const objectives = course.learning_objectives ?? []

  return (
    <div className="space-y-6">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>
      )}

      {course.bloom_level && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">認知レベル</span>
          <BloomLevelBadge level={course.bloom_level} />
        </div>
      )}

      {slide.content && (
        <p className="text-sm text-gray-600 leading-relaxed">{slide.content}</p>
      )}

      {objectives.length > 0 && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            この講座で学ぶこと
          </p>
          <ul className="space-y-2">
            {objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                <span className="leading-snug">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">準備ができたら「次へ」を押してください</p>
    </div>
  )
}
