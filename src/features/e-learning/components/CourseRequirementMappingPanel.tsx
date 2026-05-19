'use client'

import { useState, useTransition } from 'react'
import { Trash2, Link2 } from 'lucide-react'
import { addCourseRequirementMapping, removeCourseRequirementMapping } from '../actions'

type Mapping = {
  id: string
  requirement_id: string
  requirement: { id: string; name: string; skill: { id: string; name: string } }
}

type Requirement = { id: string; name: string; skill_id: string; skill_name: string }

type Props = {
  courseId: string
  mappings: Mapping[]
  allRequirements: Requirement[]
}

export function CourseRequirementMappingPanel({ courseId, mappings, allRequirements }: Props) {
  const [selectedReqId, setSelectedReqId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const mappedIds = new Set(mappings.map(m => m.requirement_id))
  const available = allRequirements.filter(r => !mappedIds.has(r.id))

  function handleAdd() {
    if (!selectedReqId) {
      setError('要件を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addCourseRequirementMapping(courseId, selectedReqId)
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      setSelectedReqId('')
    })
  }

  function handleRemove(mappingId: string) {
    startTransition(async () => {
      await removeCourseRequirementMapping(mappingId, courseId)
    })
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-800">スキル要件との連携</h3>
      </div>
      <p className="mb-4 text-xs text-emerald-700">
        このコースを修了すると、以下のスキル要件が自動的に達成済みになります。
      </p>

      {/* 追加フォーム */}
      <div className="mb-4 flex gap-2">
        <select
          value={selectedReqId}
          onChange={e => {
            setSelectedReqId(e.target.value)
            setError(null)
          }}
          disabled={isPending || available.length === 0}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-50"
        >
          <option value="">
            {available.length === 0 ? '追加できる要件がありません' : '要件を選択'}
          </option>
          {available.map(r => (
            <option key={r.id} value={r.id}>
              {r.skill_name}　／　{r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !selectedReqId}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          追加
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {/* 登録済み一覧 */}
      {mappings.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">連携するスキル要件が未設定です</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-emerald-100">
              <th className="border-b border-emerald-200 px-3 py-2 text-left text-xs font-semibold text-emerald-800">
                職種
              </th>
              <th className="border-b border-emerald-200 px-3 py-2 text-left text-xs font-semibold text-emerald-800">
                スキル要件
              </th>
              <th className="border-b border-emerald-200 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr
                key={m.id}
                className={`border-b border-emerald-100 ${i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}`}
              >
                <td className="px-3 py-2 text-gray-700">{m.requirement.skill.name}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{m.requirement.name}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
