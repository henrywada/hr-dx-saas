'use client'

import { useState, useTransition } from 'react'
import {
  createGlobalEvaluationTemplateItem,
  updateGlobalEvaluationTemplateItem,
  deleteGlobalEvaluationTemplateItem,
} from '@/features/global-evaluation-templates/actions'
import {
  AXIS_LABELS,
  AXIS_SUBTITLES,
  type GlobalEvaluationTemplateWithItems,
  type GlobalEvaluationTemplateItem,
  type EvaluationAxis,
  type MboCategory,
} from '@/features/global-evaluation-templates/types'

interface Props {
  template: GlobalEvaluationTemplateWithItems
}

const AXES: EvaluationAxis[] = ['performance', 'ability', 'attitude', 'mbo']
const MBO_CATEGORIES: MboCategory[] = ['A', 'B', 'C', 'D']

const AXIS_BG: Record<EvaluationAxis, string> = {
  performance: 'bg-blue-50',
  ability: 'bg-purple-50',
  attitude: 'bg-green-50',
  mbo: 'bg-orange-50',
}

export function GlobalEvalTemplateItemsClient({ template }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 新規追加フォーム
  const [showAddForm, setShowAddForm] = useState(false)
  const [addAxis, setAddAxis] = useState<EvaluationAxis>('performance')
  const [addMboCategory, setAddMboCategory] = useState<MboCategory | ''>('')
  const [addName, setAddName] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addEvalFocus, setAddEvalFocus] = useState('')
  const [addMeasurementMethod, setAddMeasurementMethod] = useState('')
  const [addTargetGradeNote, setAddTargetGradeNote] = useState('')
  const [addWeight, setAddWeight] = useState<number>(0)

  // 編集中の項目ID
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editEvalFocus, setEditEvalFocus] = useState('')
  const [editMeasurementMethod, setEditMeasurementMethod] = useState('')
  const [editTargetGradeNote, setEditTargetGradeNote] = useState('')
  const [editWeight, setEditWeight] = useState<number>(0)

  // 軸ごとに項目をグループ化
  const groupedItems = AXES.reduce<Record<EvaluationAxis, GlobalEvaluationTemplateItem[]>>(
    (acc, axis) => {
      acc[axis] = template.items
        .filter(i => i.axis === axis)
        .sort((a, b) => a.sort_order - b.sort_order)
      return acc
    },
    { performance: [], ability: [], attitude: [], mbo: [] }
  )

  const totalWeight = template.items.reduce((sum, i) => sum + Number(i.weight), 0)

  function startEdit(item: GlobalEvaluationTemplateItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditDesc(item.description ?? '')
    setEditEvalFocus(item.evaluation_focus ?? '')
    setEditMeasurementMethod(item.measurement_method ?? '')
    setEditTargetGradeNote(item.target_grade_note ?? '')
    setEditWeight(Number(item.weight))
  }

  function handleAdd() {
    if (!addName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createGlobalEvaluationTemplateItem({
        template_id: template.id,
        axis: addAxis,
        mbo_category: addAxis === 'mbo' && addMboCategory ? addMboCategory : null,
        name: addName,
        description: addDesc || undefined,
        evaluation_focus: addEvalFocus || null,
        measurement_method: addMeasurementMethod || null,
        target_grade_note: addTargetGradeNote || null,
        weight: addWeight,
        sort_order: template.items.filter(i => i.axis === addAxis).length,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setShowAddForm(false)
      setAddName('')
      setAddDesc('')
      setAddEvalFocus('')
      setAddMeasurementMethod('')
      setAddTargetGradeNote('')
      setAddWeight(0)
      window.location.reload()
    })
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await updateGlobalEvaluationTemplateItem({
        id,
        template_id: template.id,
        name: editName,
        description: editDesc || null,
        evaluation_focus: editEvalFocus || null,
        measurement_method: editMeasurementMethod || null,
        target_grade_note: editTargetGradeNote || null,
        weight: editWeight,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setEditingId(null)
      window.location.reload()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteGlobalEvaluationTemplateItem({ id, template_id: template.id })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 合計比重インジケーター */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">評価項目の管理と比重設定</p>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            Math.abs(totalWeight - 100) < 0.01
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          合計比重: {totalWeight}%
          {Math.abs(totalWeight - 100) < 0.01 ? ' ✓' : ' ← 100%に調整してください'}
        </span>
      </div>

      {/* 軸ごとの項目テーブル */}
      {AXES.map(axis => {
        const items = groupedItems[axis]
        const axisWeight = items.reduce((s, i) => s + Number(i.weight), 0)
        return (
          <div key={axis} className="overflow-hidden rounded-lg border border-gray-200">
            <div className={`px-4 py-3 ${AXIS_BG[axis]}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{AXIS_LABELS[axis]}軸</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{AXIS_SUBTITLES[axis]}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {items.length}項目 / {axisWeight}%
                </span>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">項目なし</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      項目名
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 lg:table-cell">
                      説明
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 xl:table-cell">
                      評価の着眼点
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium text-gray-500 xl:table-cell">
                      測定方法・指標例
                    </th>
                    <th className="hidden w-20 px-4 py-2 text-center text-xs font-medium text-gray-500 md:table-cell">
                      対象
                    </th>
                    <th className="w-20 px-4 py-2 text-center text-xs font-medium text-gray-500">
                      比重(%)
                    </th>
                    <th className="w-24 px-4 py-2 text-right text-xs font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-800">
                            {item.name}
                            {item.mbo_category && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({item.mbo_category})
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">{item.description ?? '—'}</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 xl:table-cell">
                        {editingId === item.id ? (
                          <textarea
                            value={editEvalFocus}
                            onChange={e => setEditEvalFocus(e.target.value)}
                            rows={2}
                            placeholder="評価の着眼点"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">
                            {item.evaluation_focus ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 xl:table-cell">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editMeasurementMethod}
                            onChange={e => setEditMeasurementMethod(e.target.value)}
                            placeholder="カンマ区切りでタグ入力"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                          />
                        ) : item.measurement_method ? (
                          <div className="flex flex-wrap gap-1">
                            {item.measurement_method.split(',').map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 text-center md:table-cell">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editTargetGradeNote}
                            onChange={e => setEditTargetGradeNote(e.target.value)}
                            placeholder="全等級"
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary focus:outline-none"
                          />
                        ) : item.target_grade_note ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                            {item.target_grade_note}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            value={editWeight}
                            onChange={e => setEditWeight(Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{item.weight}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                              disabled={isPending}
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleUpdate(item.id)}
                              disabled={isPending || !editName.trim()}
                              className="text-xs font-medium text-primary disabled:opacity-50"
                            >
                              保存
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                              disabled={isPending}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="text-xs text-red-400 hover:text-red-600"
                              disabled={isPending}
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      {/* 項目追加フォーム */}
      {showAddForm ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">評価項目を追加</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">軸 *</label>
              <select
                value={addAxis}
                onChange={e => setAddAxis(e.target.value as EvaluationAxis)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                {AXES.map(a => (
                  <option key={a} value={a}>
                    {AXIS_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
            {addAxis === 'mbo' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">MBOカテゴリ</label>
                <select
                  value={addMboCategory}
                  onChange={e => setAddMboCategory(e.target.value as MboCategory | '')}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">なし</option>
                  {MBO_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">項目名 *</label>
              <input
                type="text"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="例：目標達成度"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">比重(%)</label>
              <input
                type="number"
                value={addWeight}
                onChange={e => setAddWeight(Number(e.target.value))}
                min={0}
                max={100}
                step={0.5}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">対象等級</label>
              <input
                type="text"
                value={addTargetGradeNote}
                onChange={e => setAddTargetGradeNote(e.target.value)}
                placeholder="全等級"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">説明</label>
              <input
                type="text"
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
                placeholder="項目の説明（任意）"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">評価の着眼点</label>
              <textarea
                value={addEvalFocus}
                onChange={e => setAddEvalFocus(e.target.value)}
                rows={2}
                placeholder="何を見て評価するかの具体的な観点（任意）"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                測定方法・指標例
                <span className="ml-1 text-xs font-normal text-gray-400">
                  （カンマ区切りでタグ表示）
                </span>
              </label>
              <input
                type="text"
                value={addMeasurementMethod}
                onChange={e => setAddMeasurementMethod(e.target.value)}
                placeholder="例：達成率%, 処理件数/月, 上司定性評価（5段階）"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setAddName('')
                setAddDesc('')
                setAddEvalFocus('')
                setAddMeasurementMethod('')
                setAddTargetGradeNote('')
                setAddWeight(0)
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={isPending || !addName.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? '追加中...' : '追加'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            disabled={isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            評価項目を追加
          </button>
        </div>
      )}
    </div>
  )
}
