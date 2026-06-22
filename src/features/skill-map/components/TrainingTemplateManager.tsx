'use client'

// TrainingPlanView から import される。テンプレート管理サブタブ。

import { useState, useTransition } from 'react'
import {
  createTrainingPlanTemplate,
  deleteTrainingPlanTemplate,
  removeCourseFromTemplate,
} from '../training-plan-actions'
import { TrainingCoursePickerModal } from './TrainingCoursePickerModal'
import type { TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  templates: TrainingPlanTemplateRow[]
  availableCourses: { id: string; title: string; category: string }[]
  jobRoles: { id: string; name: string }[]
}

// コース一覧 + ピッカーモーダルを管理するサブコンポーネント
function CourseListSection({
  template,
  availableCourses,
  onRemove,
  isPending,
}: {
  template: TrainingPlanTemplateRow
  availableCourses: { id: string; title: string; category: string }[]
  onRemove: (templateId: string, courseId: string) => void
  isPending: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {template.courses.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">
              コースがありません。下のボタンから追加してください。
            </p>
          </div>
        ) : (
          template.courses.map((course, idx) => (
            <div
              key={course.id}
              className={`flex items-center justify-between border-b border-gray-100 px-4 py-2.5 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{course.title}</p>
                <p className="text-xs text-gray-400">{course.category}</p>
              </div>
              <button
                onClick={() => onRemove(template.id, course.id)}
                disabled={isPending}
                className="ml-3 flex-shrink-0 text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShowPicker(true)}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
      >
        ＋ コースを追加
      </button>

      {showPicker && (
        <TrainingCoursePickerModal
          templateId={template.id}
          templateName={template.name}
          availableCourses={availableCourses}
          alreadyAddedCourseIds={template.courses.map(c => c.id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

export function TrainingTemplateManager({ templates, availableCourses, jobRoles }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSkillId, setNewSkillId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setFormError('テンプレート名を入力してください')
      return
    }
    startTransition(async () => {
      const result = await createTrainingPlanTemplate({
        name: newName.trim(),
        skillId: newSkillId || undefined,
        description: newDescription.trim() || undefined,
      })
      if (!result.success) {
        setFormError(result.error ?? 'エラーが発生しました')
        return
      }
      setNewName('')
      setNewSkillId('')
      setNewDescription('')
      setShowCreateForm(false)
      setFormError(null)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTrainingPlanTemplate(id)
      if (selectedTemplateId === id) setSelectedTemplateId(null)
    })
  }

  const handleRemoveCourse = (templateId: string, courseId: string) => {
    startTransition(async () => {
      await removeCourseFromTemplate(templateId, courseId)
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* テンプレート一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">テンプレート一覧</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            ＋ 新規作成
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                テンプレート名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例: 営業職 新入社員研修"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                対象職種（任意）
              </label>
              <select
                value={newSkillId}
                onChange={e => setNewSkillId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">全職種共通</option>
                {jobRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">説明（任意）</label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="このテンプレートの目的"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormError(null)
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                作成
              </button>
            </div>
          </form>
        )}

        {templates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-400">テンプレートがありません</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {templates.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`flex cursor-pointer items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 transition-colors last:border-0 ${selectedTemplateId === t.id ? 'bg-[#f6f8fa]' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.skill_name ? `対象: ${t.skill_name}` : '全職種共通'}
                    {' · '}
                    {t.courses.length} コース
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(t.id)
                  }}
                  disabled={isPending}
                  className="flex-shrink-0 text-xs text-red-400 hover:underline disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択テンプレートのコース管理 */}
      <div>
        {selectedTemplate ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              「{selectedTemplate.name}」のコース
            </h3>
            <CourseListSection
              template={selectedTemplate}
              availableCourses={availableCourses}
              onRemove={handleRemoveCourse}
              isPending={isPending}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-300 p-12">
            <p className="text-sm text-gray-400">左のテンプレートを選択してコースを管理</p>
          </div>
        )}
      </div>
    </div>
  )
}
