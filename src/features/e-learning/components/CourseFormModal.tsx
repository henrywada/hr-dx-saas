'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, CheckCircle } from 'lucide-react'
import { createCourse, updateCourse, createCourseWithAiScenario } from '../actions'
import { BLOOM_LEVELS, BLOOM_LEVEL_LABELS } from '../constants'
import type { BloomLevel, ElCourse, CourseType } from '../types'

interface Props {
  course?: ElCourse
  courseType: CourseType
  onClose: () => void
}

export function CourseFormModal({ course, courseType, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(course?.title ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [category, setCategory] = useState(course?.category ?? '初級')
  const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>(course?.bloom_level ?? '')
  const [objectivesText, setObjectivesText] = useState(
    (course?.learning_objectives ?? []).join('\n')
  )
  const [useAiScenario, setUseAiScenario] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiDone, setAiDone] = useState(false)
  const [pubStart, setPubStart] = useState(course?.published_start_date ?? '')
  const [pubEnd, setPubEnd] = useState(course?.published_end_date ?? '')

  const isNew = !course

  useEffect(() => {
    if (!course) return
    setPubStart(course.published_start_date ?? '')
    setPubEnd(course.published_end_date ?? '')
  }, [course?.id, course?.published_start_date, course?.published_end_date])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const objectives = objectivesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    const startYmd = pubStart.trim() || null
    const endYmd = pubEnd.trim() || null
    if (startYmd && endYmd && endYmd < startYmd) {
      setError('公開終了日は開始日以降にしてください')
      return
    }

    startTransition(async () => {
      try {
        if (!isNew) {
          await updateCourse(course.id, {
            title,
            description,
            category,
            bloom_level: bloomLevel || null,
            learning_objectives: objectives,
            published_start_date: startYmd,
            published_end_date: endYmd,
          })
          router.refresh()
          onClose()
          return
        }

        if (useAiScenario) {
          const aiResult = await createCourseWithAiScenario({
            title,
            description,
            category,
            course_type: courseType,
            bloom_level: bloomLevel || undefined,
            learning_objectives: objectives,
          })
          if (aiResult.ok === false) {
            setError(aiResult.error)
          } else {
            setAiDone(true)
          }
        } else {
          await createCourse({
            title,
            description,
            category,
            status: 'draft',
            course_type: courseType,
            bloom_level: bloomLevel || undefined,
            learning_objectives: objectives,
          })
          router.refresh()
          onClose()
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : err &&
                typeof err === 'object' &&
                'message' in err &&
                typeof (err as { message: unknown }).message === 'string'
              ? (err as { message: string }).message
              : '保存に失敗しました'
        setError(msg)
      }
    })
  }

  if (aiDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 flex flex-col items-center gap-4">
          <CheckCircle className="w-14 h-14 text-green-500" />
          <h2 className="text-lg font-bold text-gray-800">AIシナリオの作成が完了しました</h2>
          <p className="text-sm text-gray-500 text-center">
            学習目標・学習スライド・シナリオ問題・振り返り・チェックリストが自動生成されました。
            <br />
            コース一覧から内容を確認・編集できます。
          </p>
          <button
            onClick={() => {
              router.refresh()
              onClose()
            }}
            className="mt-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            閉じる
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {isNew ? 'コースを作成' : 'コースを編集'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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

          {!isNew && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <p className="text-sm font-medium text-gray-800">公開期間（任意）</p>
              <p className="text-xs text-gray-500">
                未入力のときは、公開中でも受講可能期間による制限はかけません。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">開始日</label>
                  <input
                    type="date"
                    value={pubStart}
                    onChange={e => setPubStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">終了日</label>
                  <input
                    type="date"
                    value={pubEnd}
                    onChange={e => setPubEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI シナリオ作成チェックボックス（新規作成時のみ） */}
          {isNew && (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors">
              <input
                type="checkbox"
                checked={useAiScenario}
                onChange={e => setUseAiScenario(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
                  <Sparkles className="w-4 h-4" />
                  AIで学習シナリオを作成
                </div>
                <p className="text-xs text-blue-600 mt-0.5">
                  学習目標 → 学習スライド → シナリオ問題 → 振り返り → チェックリストを自動生成します
                </p>
              </div>
            </label>
          )}

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
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {isPending && isNew && useAiScenario && (
                <Sparkles className="w-4 h-4 animate-pulse" />
              )}
              {isPending
                ? isNew && useAiScenario
                  ? 'AIシナリオ生成中...'
                  : '保存中...'
                : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
