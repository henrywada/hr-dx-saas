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
  general: 'コメント',
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
  /**
   * 閲覧者が「提案」を送信できる相手（メンバーなら責任者、責任者ならオーナー）。
   * 空配列（または省略）なら提案の選択肢自体を表示しない。
   * KanbanBoard（/tasks/groups/[id]、Phase5対象外）は未配線のため省略可。
   */
  suggestionTargets?: EmployeeOption[]
  /**
   * 閲覧者が「報告」を送信できる相手（責任者ならオーナーのみ）。
   * 空配列（または省略）なら報告の選択肢自体を表示しない。
   * KanbanBoard（/tasks/groups/[id]、Phase5対象外）は未配線のため省略可。
   */
  reportTargets?: EmployeeOption[]
  /**
   * 閲覧者が「コメント」を送信できる相手（目標責任者・タスクメンバー）。
   * 空配列（または省略）ならコメントの選択肢自体を表示しない。
   */
  generalTargets?: EmployeeOption[]
  /** マウント時にこのコメントIDへの返信フォームを開く（あなた宛ての投稿からの遷移用） */
  initialReplyToCommentId?: string | null
}

export function CommentThread({
  target,
  canPost,
  currentEmployeeId,
  canModerate,
  adviceTargets,
  suggestionTargets = [],
  reportTargets = [],
  generalTargets = [],
  initialReplyToCommentId = null,
}: CommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // 返信フォーカス: 該当メッセージのみ表示して返信する
  const [focusReplyCommentId, setFocusReplyCommentId] = useState<string | null>(
    initialReplyToCommentId
  )
  const [, startTransition] = useTransition()

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

  useEffect(() => {
    if (!isLoading && initialReplyToCommentId) {
      setFocusReplyCommentId(initialReplyToCommentId)
    }
  }, [isLoading, initialReplyToCommentId])

  const tree = buildCommentTree(comments)
  const focusedComment = focusReplyCommentId
    ? (comments.find(c => c.id === focusReplyCommentId) ?? null)
    : null

  // 返信フォーカス表示: 該当メッセージ＋返信フォームのみ
  if (focusReplyCommentId) {
    const replyTargets: EmployeeOption[] =
      focusedComment && !generalTargets.some(t => t.id === focusedComment.employeeId)
        ? [
            {
              id: focusedComment.employeeId,
              name: focusedComment.employeeName,
              // 返信先表示専用。isManager は宛先候補の型合わせ用（返信フォームでは未使用）
              isManager: false,
            },
            ...generalTargets,
          ]
        : generalTargets

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFocusReplyCommentId(null)}
          className="text-[10px] text-slate-500 hover:text-slate-700"
        >
          ← コメント一覧に戻る
        </button>
        {isLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
        {loadError && <p className="text-xs text-red-600">{loadError}</p>}
        {!isLoading && !focusedComment && (
          <p className="text-xs text-slate-400">対象のメッセージが見つかりません。</p>
        )}
        {focusedComment && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-900">{focusedComment.employeeName}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  focusedComment.parentCommentId
                    ? 'bg-violet-50 text-violet-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {focusedComment.parentCommentId
                  ? '返信'
                  : COMMENT_TYPE_LABEL[focusedComment.commentType]}
              </span>
            </div>
            {focusedComment.targetEmployeeName && (
              <p className="mt-0.5 text-[10px] font-medium text-[#FD7601]">
                → {focusedComment.targetEmployeeName}さんへ
              </p>
            )}
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{focusedComment.body}</p>
            {canPost && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <CommentForm
                  target={target}
                  parentCommentId={focusedComment.id}
                  onPosted={() => {
                    setFocusReplyCommentId(null)
                    reload()
                  }}
                  submitLabel="返信する"
                  adviceTargets={adviceTargets}
                  suggestionTargets={suggestionTargets}
                  reportTargets={reportTargets}
                  generalTargets={replyTargets}
                  defaultTargetEmployeeId={focusedComment.employeeId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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
            onReply={setFocusReplyCommentId}
            onPosted={reload}
            currentEmployeeId={currentEmployeeId}
            canModerate={canModerate}
            canPost={canPost}
            adviceTargets={adviceTargets}
            suggestionTargets={suggestionTargets}
            reportTargets={reportTargets}
            generalTargets={generalTargets}
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
          suggestionTargets={suggestionTargets}
          reportTargets={reportTargets}
          generalTargets={generalTargets}
        />
      )}
    </div>
  )
}

interface CommentItemProps {
  node: CommentNode
  target: { taskId: string } | { taskGroupId: string }
  /** 返信フォーカス表示へ切り替える */
  onReply: (commentId: string) => void
  onPosted: () => void
  /** 閲覧者本人の従業員ID（編集可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerate: boolean
  /** このユーザーが返信を投稿できるか（対象への投稿権限。RLSが最終防衛） */
  canPost: boolean
  adviceTargets: EmployeeOption[]
  suggestionTargets: EmployeeOption[]
  reportTargets: EmployeeOption[]
  generalTargets: EmployeeOption[]
}

function CommentItem({
  node,
  target,
  onReply,
  onPosted,
  currentEmployeeId,
  canModerate,
  canPost,
  adviceTargets,
  suggestionTargets,
  reportTargets,
  generalTargets,
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
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            node.parentCommentId ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {node.parentCommentId ? '返信' : COMMENT_TYPE_LABEL[node.commentType]}
        </span>
      </div>

      {node.targetEmployeeName && (
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
            onClick={() => onReply(node.id)}
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

      {node.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3">
          {node.replies.map(reply => (
            <CommentItem
              key={reply.id}
              node={reply}
              target={target}
              onReply={onReply}
              onPosted={onPosted}
              currentEmployeeId={currentEmployeeId}
              canModerate={canModerate}
              canPost={canPost}
              adviceTargets={adviceTargets}
              suggestionTargets={suggestionTargets}
              reportTargets={reportTargets}
              generalTargets={generalTargets}
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
  suggestionTargets: EmployeeOption[]
  reportTargets: EmployeeOption[]
  generalTargets: EmployeeOption[]
  /** 返信時など、宛先の初期値（投稿の送信者など） */
  defaultTargetEmployeeId?: string
}

function CommentForm({
  target,
  parentCommentId,
  onPosted,
  submitLabel,
  adviceTargets,
  suggestionTargets,
  reportTargets,
  generalTargets,
  defaultTargetEmployeeId = '',
}: CommentFormProps) {
  const isReply = parentCommentId != null
  const [commentType, setCommentType] = useState<CommentType>('general')
  const [targetEmployeeId, setTargetEmployeeId] = useState(defaultTargetEmployeeId)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 返信は送信元固定（区分・宛先 UI なし）
  const replyTargetId = defaultTargetEmployeeId
  const replyTargetName =
    generalTargets.find(t => t.id === replyTargetId)?.name ??
    adviceTargets.find(t => t.id === replyTargetId)?.name ??
    suggestionTargets.find(t => t.id === replyTargetId)?.name ??
    reportTargets.find(t => t.id === replyTargetId)?.name ??
    '相手'

  // コメント種別ごとの宛先候補（宛先が1人もいない種別は選択肢自体を出さない）
  const targetsByType: Record<CommentType, EmployeeOption[]> = {
    advice: adviceTargets,
    suggestion: suggestionTargets,
    report: reportTargets,
    general: generalTargets,
  }
  const availableTypes = COMMENT_TYPES.filter(type => targetsByType[type].length > 0)
  const needsTarget = !isReply

  // 初期種別が候補に無い場合は先頭の利用可能種別に合わせる
  const effectiveType = availableTypes.includes(commentType)
    ? commentType
    : (availableTypes[0] ?? 'general')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isReply && !replyTargetId) {
      setError('返信先が特定できません')
      return
    }
    startTransition(async () => {
      try {
        await createComment({
          ...('taskId' in target ? { taskId: target.taskId } : { taskGroupId: target.taskGroupId }),
          parentCommentId: parentCommentId ?? undefined,
          // 返信は区分なし・送信元固定（DB 上は general）
          commentType: isReply ? 'general' : effectiveType,
          targetEmployeeId: isReply ? replyTargetId : targetEmployeeId || undefined,
          body,
        })
        setBody('')
        setTargetEmployeeId(defaultTargetEmployeeId)
        setCommentType(
          availableTypes.includes('general') ? 'general' : (availableTypes[0] ?? 'general')
        )
        onPosted()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました')
      }
    })
  }

  if (!isReply && availableTypes.length === 0) {
    return <p className="text-xs text-slate-400">送信可能な宛先がありません。</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {isReply ? (
        <p className="text-[10px] text-slate-500">
          送信先：{replyTargetName}
          <span className="ml-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">返信</span>
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={effectiveType}
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
          {needsTarget && (
            <div className="w-40">
              <EmployeePicker
                employees={targetsByType[effectiveType] ?? []}
                value={targetEmployeeId}
                onChange={setTargetEmployeeId}
                placeholder="宛先を選択"
              />
            </div>
          )}
        </div>
      )}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        required
        rows={2}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        placeholder={isReply ? '返信を入力' : 'コメントを入力'}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={
          isPending || !body || (isReply ? !replyTargetId : needsTarget && !targetEmployeeId)
        }
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}
