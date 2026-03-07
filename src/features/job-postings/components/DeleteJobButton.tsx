'use client'

import { useTransition } from 'react'
import { deleteJobPosting } from '../actions'

interface Props {
  jobId: string
}

export function DeleteJobButton({ jobId }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!window.confirm('本当にこの求人票を削除しますか？この操作は取り消せません。')) {
      return
    }

    startTransition(async () => {
      try {
        const result = await deleteJobPosting(jobId)
        if (result.success) {
          // Success, path is automatically revalidated
        }
      } catch (error) {
        console.error(error)
        alert('削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-800 hover:underline text-sm font-medium disabled:opacity-50 transition"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
