'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createCourse, updateCourse } from '../actions'
import { COURSE_STATUS_LABELS, BLOOM_LEVELS, BLOOM_LEVEL_LABELS } from '../constants'
import type { BloomLevel, ElCourse, CourseType, CourseStatus } from '../types'

interface Props {
  course?: ElCourse
  courseType: CourseType
  onClose: () => void
}

export function CourseFormModal({ course, courseType, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(course?.title ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [category, setCategory] = useState(course?.category ?? '初級')
  const [status, setStatus] = useState(course?.status ?? 'draft')
  const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>(course?.bloom_level ?? '')
  const [objectivesText, setObjectivesText] = useState(
    (course?.learning_objectives ?? []).join('\n')
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const objectives = objectivesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    startTransition(async () => {
      try {
        if (course) {
          await updateCourse(course.id, {
            title,
            description,
            category,
            status,
            bloom_level: bloomLevel || null,
            learning_objectives: objectives,
          })
        } else {
          await createCourse({
            title,
            description,
            category,
            status,
            course_type: courseType,
            bloom_level: bloomLevel || undefined,
            learning_objectives: objectives,
          })
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {course ? 'コースを編集' : 'コースを作成'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="コースタイトルを入力"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="コースの概要を入力"
            />
          </div>

          {/* Bloom レベル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              認知レベル（Bloom's Taxonomy）
            </label>
            <select
              value={bloomLevel}
              onChange={e => setBloomLevel(e.target.value as BloomLevel | '')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">未設定</option>
              {BLOOM_LEVELS.map(level => (
                <option key={level} value={level}>
                  {BLOOM_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          {/* 学習目標 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学習目標
              <span className="ml-1 text-xs text-gray-400">（1行1目標）</span>
            </label>
            <textarea
              value={objectivesText}
              onChange={e => setObjectivesText(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={'ハラスメントの定義と種類を説明できる\n適切な対処法を選択できる\n相談窓口への案内ができる'}
            />
          </div>

          {/* カテゴリ＋ステータス */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：初級、コンプライアンス"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CourseStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(COURSE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
