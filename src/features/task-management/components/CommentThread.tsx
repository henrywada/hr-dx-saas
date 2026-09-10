'use client'

import { useEffect, useState, useTransition } from 'react'
import { getTaskCommentsAction, createComment, updateComment, deleteComment } from '../actions'
import { buildCommentTree, type CommentNode } from '../comment-tree'
import { COMMENT_TYPES, type CommentType, type TaskComment } from '../types'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

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
  /** 閲覧者本人の従業員ID（編集可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerate: boolean
  /** 閲覧者が「助言」コメントを送信できる相手（責任者ならグループのマネージャー、
   * マネージャーならグループのメンバー）。空配列なら助言の選択肢自体を表示しない */
  adviceTargets: EmployeeOption[]
}

export function CommentThread({
  target,
  canPost,
  currentEmployeeId,
  canModerate,
  adviceTargets,
}: CommentThreadProps) {
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
            currentEmployeeId={currentEmployeeId}
            canModerate={canModerate}
            canPost={canPost}
            adviceTargets={adviceTargets}
          />
        ))}
      </ul>
      {canPost && (
        <CommentForm
          target={target}
          parentCommentId={null}
          onPosted={reload}
          submitLabel="投稿する"
          adviceTargets={adviceTargets}
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
  /** 閲覧者本人の従業員ID（編集可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerate: boolean
  /** このユーザーが返信を投稿できるか（対象への投稿権限。RLSが最終防衛） */
  canPost: boolean
  adviceTargets: EmployeeOption[]
}

function CommentItem({
  node,
  target,
  replyingToId,
  setReplyingToId,
  onPosted,
  currentEmployeeId,
  canModerate,
  canPost,
  adviceTargets,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(node.body)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwnComment = currentEmployeeId !== null && node.employeeId === currentEmployeeId
  const canEdit = isOwnComment
  const canDelete = isOwnComment || canModerate

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setActionError(null)
    startTransition(async () => {
      try {
        await updateComment({ commentId: node.id, body: editBody })
        setIsEditing(false)
        onPosted()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'コメントの編集に失敗しました')
      }
    })
  }

  function handleDelete() {
    // 最終レビュー Finding I3: parent_comment_id は ON DELETE SET NULL のため
    // 返信自体が消えることはないが、削除は取り消せない操作であるため確認を挟む
    // （他の削除ボタンと同様、コードベースの既存パターン: window.confirm）。
    if (!window.confirm('このコメントを削除しますか？')) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteComment({ commentId: node.id })
        onPosted()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'コメントの削除に失敗しました')
      }
    })
  }

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-900">{node.employeeName}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
          {COMMENT_TYPE_LABEL[node.commentType]}
        </span>
      </div>

      {node.commentType === 'advice' && node.targetEmployeeName && (
        <p className="mt-0.5 text-[10px] font-medium text-[#FD7601]">
          → {node.targetEmployeeName}さんへ
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="mt-1 space-y-1">
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            required
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !editBody}
              className="rounded-lg bg-[#FD7601] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setEditBody(node.body)
              }}
              className="text-[10px] text-slate-500"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{node.body}</p>
      )}

      {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}

      <div className="mt-1 flex gap-2">
        {canPost && (
          <button
            type="button"
            onClick={() => setReplyingToId(replyingToId === node.id ? null : node.id)}
            className="text-[10px] text-[#FD7601]"
          >
            返信
          </button>
        )}
        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[10px] text-slate-500"
          >
            編集
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-[10px] text-red-500 disabled:opacity-50"
          >
            削除
          </button>
        )}
      </div>

      {canPost && replyingToId === node.id && (
        <div className="mt-2">
          <CommentForm
            target={target}
            parentCommentId={node.id}
            onPosted={() => {
              setReplyingToId(null)
              onPosted()
            }}
            submitLabel="返信する"
            adviceTargets={adviceTargets}
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
              currentEmployeeId={currentEmployeeId}
              canModerate={canModerate}
              canPost={canPost}
              adviceTargets={adviceTargets}
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
  adviceTargets: EmployeeOption[]
}

function CommentForm({
  target,
  parentCommentId,
  onPosted,
  submitLabel,
  adviceTargets,
}: CommentFormProps) {
  const [commentType, setCommentType] = useState<CommentType>('general')
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 宛先が1人もいない閲覧者には「助言」の選択肢自体を出さない
  const availableTypes =
    adviceTargets.length > 0 ? COMMENT_TYPES : COMMENT_TYPES.filter(t => t !== 'advice')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createComment({
          ...('taskId' in target ? { taskId: target.taskId } : { taskGroupId: target.taskGroupId }),
          parentCommentId: parentCommentId ?? undefined,
          commentType,
          targetEmployeeId: commentType === 'advice' ? targetEmployeeId : undefined,
          body,
        })
        setBody('')
        setTargetEmployeeId('')
        setCommentType('general')
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
          onChange={e => {
            setCommentType(e.target.value as CommentType)
            setTargetEmployeeId('')
          }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          {availableTypes.map(type => (
            <option key={type} value={type}>
              {COMMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        {commentType === 'advice' && (
          <div className="w-40">
            <EmployeePicker
              employees={adviceTargets}
              value={targetEmployeeId}
              onChange={setTargetEmployeeId}
              placeholder="宛先を選択"
            />
          </div>
        )}
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
        disabled={isPending || !body || (commentType === 'advice' && !targetEmployeeId)}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}
