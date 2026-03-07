'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJobPostingDraft } from '@/features/job-postings/actions'

export function CreateJobDraftButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleCreateDraft = () => {
    startTransition(async () => {
      try {
        // まずは空のメモで下書きを作成
        const result = await createJobPostingDraft({ raw_memo: '' })
        if (result.success) {
          // 作成した求人の編集画面へ遷移
          router.push(`/adm/job-positions/${result.id}`)
        }
      } catch (error) {
        console.error(error)
        alert('エラーが発生しました: ' + (error instanceof Error ? error.message : String(error)))
      }
    })
  }

  return (
    <button 
      onClick={handleCreateDraft} 
      disabled={isPending}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded shadow-sm disabled:opacity-50 transition"
    >
      {isPending ? '作成中...' : '+ 新規求人を作成'}
    </button>
  )
}
