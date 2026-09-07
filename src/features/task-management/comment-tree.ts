import type { TaskComment } from './types'

export interface CommentNode extends TaskComment {
  replies: CommentNode[]
}

/**
 * フラットなコメント配列を parentCommentId を使ってツリー構造に組み立てる。
 * 親が見つからない場合（親が削除済み等）はルートとして扱う。
 * comments は createdAt 昇順で渡される前提（queries.ts 側でソート済み）。
 */
export function buildCommentTree(comments: TaskComment[]): CommentNode[] {
  const nodeById = new Map<string, CommentNode>()
  for (const comment of comments) {
    nodeById.set(comment.id, { ...comment, replies: [] })
  }

  const roots: CommentNode[] = []
  for (const comment of comments) {
    const node = nodeById.get(comment.id)!
    const parent = comment.parentCommentId ? nodeById.get(comment.parentCommentId) : undefined

    if (parent) {
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
