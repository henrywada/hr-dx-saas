'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { CoursePreviewPlayer } from './CoursePreviewPlayer'
import type { ElCourseWithSlides } from '../types'

interface Props {
  course: ElCourseWithSlides
}

export function CoursePreviewButton({ course }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={course.slides.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#FD7601] px-3 py-1.5 text-xs font-medium text-[#FD7601] hover:bg-[#FD7601]/5 disabled:opacity-40"
      >
        <Play className="h-3.5 w-3.5" />
        シミュレーションプレイ
      </button>
      {isOpen && <CoursePreviewPlayer course={course} onClose={() => setIsOpen(false)} />}
    </>
  )
}
