'use client'

import { useState, useTransition } from 'react'
import { JobPosting } from '../types'
import { exportJobsForHelloWork } from '../actions'
import { HelloWorkInstructionModal } from './HelloWorkInstructionModal'
import { DeleteJobButton } from './DeleteJobButton'
import { formatDateInJST } from '@/lib/datetime'
import { Lightbulb } from 'lucide-react'

interface Props {
  jobs: JobPosting[]
}

export function HelloWorkExportUI({ jobs }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(jobs.map(j => j.id)))
    }
  }

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleExport = () => {
    if (selectedIds.size === 0) {
      alert('エクスポートする求人を選択してください')
      return
    }

    startTransition(async () => {
      try {
        const ids = Array.from(selectedIds)
        const result = await exportJobsForHelloWork(ids)
        
        if (result.success && result.data) {
          // BOM付きのCSVをBlobに変換してダウンロード処理
          const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `hellowork_export_${new Date().toISOString().slice(0, 10)}.csv`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } else {
          alert('CSVの生成に失敗しました')
        }
      } catch (error) {
        console.error(error)
        alert('エクスポート中にエラーが発生しました')
      }
    })
  }

  return (
    <div className="space-y-6 mt-6">
      {/* 非常に目立つ手順解説ボタン */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 border border-amber-200 shadow-sm p-4 rounded-xl hover:-translate-y-1 hover:shadow-md transition-all duration-200 text-left group"
      >
        <div className="p-2 bg-amber-200 rounded-full group-hover:animate-bounce">
          <Lightbulb size={24} className="text-amber-700" />
        </div>
        <div>
          <h3 className="text-lg font-bold">💡 【必読】ダウンロード後のハローワーク登録手順はこちら</h3>
          <p className="text-sm text-amber-700/80 mt-1 font-medium">初めてCSV登録を行う方は、出力の前に必ずご確認ください。</p>
        </div>
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-gray-50 border rounded-lg gap-4">
        <div>
          <p className="text-base font-bold text-gray-800 mb-1">CSVで一括登録</p>
          <p className="text-sm text-gray-600">ハローワークに登録したい求人を選択し、ボタンを押してください。ブラウザ上で自動的にCSVファイルがダウンロードされます。</p>
        </div>
        <button
          onClick={handleExport}
          disabled={isPending || selectedIds.size === 0}
          className="bg-indigo-600 text-white px-5 py-2 rounded shadow shrink-0 hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
        >
          {isPending ? '生成中...' : `選択した求人をCSV出力 (${selectedIds.size}件)`}
        </button>
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={jobs.length > 0 && selectedIds.size === jobs.length}
                  onChange={toggleAll}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">募集タイトル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">雇用形態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終更新日</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  公開可能な求人がありません
                </td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleOne(job.id)}>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(job.id)}
                      onChange={() => toggleOne(job.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      job.status === 'published' ? 'bg-green-100 text-green-800' :
                      job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'published' ? '公開中' : job.status === 'draft' ? '下書き' : '終了'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 line-clamp-2 max-w-sm truncate font-medium">
                    {job.title || '(タイトル未設定)'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.employment_type === 'FULL_TIME' ? '正社員' : 
                     job.employment_type === 'PART_TIME' ? 'パート' : 
                     job.employment_type === 'CONTRACTOR' ? '契約社員' : 
                     job.employment_type ? 'その他' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateInJST(job.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <DeleteJobButton jobId={job.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <HelloWorkInstructionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}
