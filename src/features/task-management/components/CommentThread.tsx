'use client'

import { useEffect, useState, useTransition } from 'react'
import { getTaskCommentsAction, createComment } from '../actions'
import { buildCommentTree, type CommentNode } from '../comment-tree'
import { COMMENT_TYPES, type CommentType, type TaskComment } from '../types'

const COMMENT_TYPE_LABEL: Record<CommentType, string> = {
  report: '報告',
  advice: '助言',
  suggestion: '提案',
  general: '一般',
}

interface CommentThreadProps {
  target: { taskId: string } | { taskGroupId: string }
  /** このユーザーがトップレベルのコメントを投稿できるか（対象への投稿権限。RLSが最終防衛） */
  canPost: boolean
}

export function CommentThread({ target, canPost }: CommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reload() {
    setIsLoading(true)
    startTransition(async () => {
      try {
        const data = await getTaskCommentsAction(target)
        setComments(data)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'コメントの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    })
  }

  useEffect(() => {
    reload()
    // target は呼び出し元から固定値として渡される想定のため、マウント時のみ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tree = buildCommentTree(comments)

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!isLoading && tree.length === 0 && (
        <p className="text-xs text-slate-400">コメントはまだありません。</p>
      )}
      <ul className="space-y-2">
        {tree.map(node => (
          <CommentItem
            key={node.id}
            node={node}
            target={target}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            onPosted={reload}
          />
        ))}
      </ul>
      {canPost && (
        <CommentForm
          target={target}
          parentCommentId={null}
          onPosted={reload}
          submitLabel="投稿する"
        />
      )}
    </div>
  )
}

interface CommentItemProps {
  node: CommentNode
  target: { taskId: string } | { taskGroupId: string }
  replyingToId: string | null
  setReplyingToId: (id: string | null) => void
  onPosted: () => void
}

function CommentItem({ node, target, replyingToId, setReplyingToId, onPosted }: CommentItemProps) {
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-900">{node.employeeName}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
          {COMMENT_TYPE_LABEL[node.commentType]}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{node.body}</p>
      <button
        type="button"
        onClick={() => setReplyingToId(replyingToId === node.id ? null : node.id)}
        className="mt-1 text-[10px] text-[#FD7601]"
      >
        返信
      </button>
      {replyingToId === node.id && (
        <div className="mt-2">
          <CommentForm
            target={target}
            parentCommentId={node.id}
            onPosted={() => {
              setReplyingToId(null)
              onPosted()
            }}
            submitLabel="返信する"
          />
        </div>
      )}
      {node.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3">
          {node.replies.map(reply => (
            <CommentItem
              key={reply.id}
              node={reply}
              target={target}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onPosted={onPosted}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

interface CommentFormProps {
  target: { taskId: string } | { taskGroupId: string }
  parentCommentId: string | null
  onPosted: () => void
  submitLabel: string
}

function CommentForm({ target, parentCommentId, onPosted, submitLabel }: CommentFormProps) {
  const [commentType, setCommentType] = useState<CommentType>('general')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createComment({
          ...('taskId' in target ? { taskId: target.taskId } : { taskGroupId: target.taskGroupId }),
          parentCommentId: parentCommentId ?? undefined,
          commentType,
          body,
        })
        setBody('')
        onPosted()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={commentType}
          onChange={e => setCommentType(e.target.value as CommentType)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          {COMMENT_TYPES.map(type => (
            <option key={type} value={type}>
              {COMMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        required
        rows={2}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        placeholder="コメントを入力"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !body}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}
