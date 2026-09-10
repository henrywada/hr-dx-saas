import { createClient } from '@/lib/supabase/server'
import { toJSTDateString } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import type { FeedProvider, FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { RawFeedItem, FeedItemSeverity } from '@/features/dashboard/feed/types'

/** この日数以内に期限が迫っていれば warning として扱う */
const APPROACHING_DAYS = 3
/** この日数以内に投稿されたコメントのみ通知対象とする */
const COMMENT_LOOKBACK_DAYS = 3
/** 割当通知の最大件数（期限昇順で上位のみ。/top の FEED_LIMIT 占有・PostgREST上限・
 * 共有read_state の dedupeKey 蓄積を避けるための上限） */
const MAX_ASSIGNMENT_ITEMS = 5
/** コメント通知の最大件数（作成日時降順で最新のみ。理由は上記と同じ） */
const MAX_COMMENT_ITEMS = 20

export interface AssignedTaskRow {
  id: string
  title: string
  task_group_id: string
  due_date: string | null
  created_at: string
}

function computeAssignmentSeverity(dueDate: string | null, todayYmd: string): FeedItemSeverity {
  if (!dueDate) return 'action'
  if (dueDate < todayYmd) return 'critical'

  const daysUntil = Math.ceil(
    (new Date(`${dueDate}T00:00:00+09:00`).getTime() -
      new Date(`${todayYmd}T00:00:00+09:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  )
  return daysUntil <= APPROACHING_DAYS ? 'warning' : 'action'
}

/**
 * 自分が担当し未完了のタスクを、割当・期限接近通知のフィードアイテムに変換する。
 * kind は action_prompt（タスクが完了する、または担当から外れるまで表示され続ける。
 * FeedItemRow.tsx の canDismiss 判定が kind === 'system_notice' を要求するため、
 * action_prompt は構造的に既読化できない——これは意図的な仕様であり dismissible: false
 * と合わせて「タスクが残っている限り出続ける」という設計を表す）。
 */
export function toTaskAssignmentFeedItems(
  rows: AssignedTaskRow[],
  todayYmd: string = toJSTDateString()
): RawFeedItem[] {
  return rows.map(row => ({
    dedupeKey: `task_management:assignment:${row.id}`,
    kind: 'action_prompt',
    category: 'task_management',
    severity: computeAssignmentSeverity(row.due_date, todayYmd),
    title: `担当タスク: ${row.title}`,
    body: null,
    actionLabel: null,
    href: APP_ROUTES.tasks.groupDetail(row.task_group_id),
    occurredAt: row.created_at,
    dueDate: row.due_date,
    dismissible: false,
  }))
}

/** `task_comments` を `employee:employee_id(name)` / `task:task_id(title, task_group_id)` /
 * `taskGroup:task_group_id(name)` の埋め込み付きで取得した際の1行の形（Supabaseの
 * 埋め込みリレーションは多対一のため単一オブジェクトで返る）。 */
export interface RawTaskCommentRow {
  id: string
  body: string
  created_at: string
  employee: { name: string | null } | null
  task_id: string | null
  task_group_id: string | null
  task: { title: string; task_group_id: string } | null
  taskGroup: { name: string } | null
}

/** フィードアイテムへの変換に必要な情報だけを持つ、コンテキスト解決済みの行 */
export interface TaskCommentFeedRow {
  id: string
  body: string
  employeeName: string
  href: string
  contextLabel: string
  createdAt: string
}

/**
 * コメントがタスク単位・タスクグループ単位のどちらに紐づくか（`task_comments` の
 * XOR制約）を判定し、表示に必要な情報（リンク先・文脈ラベル）を解決する。
 * 対応する埋め込みが取得できていない（想定外の）行は防御的に null を返し、
 * 呼び出し側で除外する。
 */
export function resolveTaskCommentContext(row: RawTaskCommentRow): TaskCommentFeedRow | null {
  const employeeName = row.employee?.name ?? '（名前未設定）'

  if (row.task_id && row.task) {
    return {
      id: row.id,
      body: row.body,
      employeeName,
      href: APP_ROUTES.tasks.groupDetail(row.task.task_group_id),
      contextLabel: `タスク「${row.task.title}」`,
      createdAt: row.created_at,
    }
  }

  if (row.task_group_id && row.taskGroup) {
    return {
      id: row.id,
      body: row.body,
      employeeName,
      href: APP_ROUTES.tasks.groupDetail(row.task_group_id),
      contextLabel: `タスクグループ「${row.taskGroup.name}」`,
      createdAt: row.created_at,
    }
  }

  return null
}

/** コンテキスト解決済みのコメント行を、コメント通知のフィードアイテムに変換する。
 * kind は system_notice（既読化可能）。 */
export function toTaskCommentFeedItems(rows: TaskCommentFeedRow[]): RawFeedItem[] {
  return rows.map(row => ({
    dedupeKey: `task_management:comment:${row.id}`,
    kind: 'system_notice',
    category: 'task_management',
    severity: 'info',
    title: `${row.employeeName}さんから${row.contextLabel}へのコメント`,
    body: row.body,
    actionLabel: null,
    href: row.href,
    occurredAt: row.createdAt,
    dueDate: null,
    dismissible: true,
  }))
}

export const taskManagementFeedProvider: FeedProvider = {
  key: 'task_management',
  async fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]> {
    if (!ctx.employeeId) return []

    const supabase = await createClient()
    const lookbackIso = new Date(
      Date.now() - COMMENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    // 2つのクエリは互いに独立した通知種別（割当 / コメント）を表す。
    // Promise.all で片方の失敗が全体を失敗させる設計は、queries.ts 側の
    // Promise.allSettled による「プロバイダ単位でのgraceful degradation」と
    // 整合する（本プロバイダの2種別を部分的にしか出せない中途半端な状態を避ける）。
    const [assignedResult, commentResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, task_group_id, due_date, created_at, task_assignees!inner(employee_id)')
        .eq('task_assignees.employee_id', ctx.employeeId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(MAX_ASSIGNMENT_ITEMS),
      supabase
        .from('task_comments')
        .select(
          'id, body, created_at, employee:employee_id(name), task_id, task_group_id, task:task_id(title, task_group_id), taskGroup:task_group_id(name)'
        )
        .neq('employee_id', ctx.employeeId)
        .gte('created_at', lookbackIso)
        .order('created_at', { ascending: false })
        .limit(MAX_COMMENT_ITEMS),
    ])

    if (assignedResult.error) throw assignedResult.error
    if (commentResult.error) throw commentResult.error

    const assignmentItems = toTaskAssignmentFeedItems(
      (assignedResult.data ?? []) as unknown as AssignedTaskRow[]
    )

    const commentRows = ((commentResult.data ?? []) as unknown as RawTaskCommentRow[])
      .map(resolveTaskCommentContext)
      .filter((row): row is TaskCommentFeedRow => row !== null)
    const commentItems = toTaskCommentFeedItems(commentRows)

    return [...assignmentItems, ...commentItems]
  },
}
