# タスク管理 コメントスレッド機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク／タスクグループ単位でコメント（報告・助言・進言）を投稿・返信・編集・削除できるようにし、タスクの詳細（基本情報・ステータス・進捗編集）を新設の「タスク詳細モーダル」に集約する（Phase2の最初のサブ機能）。

**Architecture:** 既存の `page.tsx → queries.ts(SELECT) → Client Component → actions.ts(Server Actions)` パターンを踏襲する。コメント一覧はタスク詳細モーダル・タスクグループ詳細ページの双方から動的に取得する必要があるため、Client Component からの取得専用に `actions.ts` へ読み取り用関数（`getTaskCommentsAction`）を追加する（既存の「SELECTは`queries.ts`」規約からの意図的な逸脱）。RLS は `task_comments` 自身を自己参照しない設計にする（Task 1 で見つかった `INSERT...RETURNING` 時の自己参照可視性バグの再発を避けるため）。

**Tech Stack:** Next.js 16 App Router + React 19, TypeScript, Supabase(PostgreSQL + RLS), Zod v4, Tailwind CSS v4, `node:test` + `tsx`

**Spec:** `docs/implementation-plan-task-management.md`（セクション13「Phase 2 詳細設計（コメントスレッド機能）」が本プランの直接の根拠。セクション4〜6のPhase1部分は前提として踏襲する）

## Global Constraints

- 新規テーブルは `CREATE TABLE IF NOT EXISTS`、`tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE` と RLS (`ENABLE ROW LEVEL SECURITY`) を必須で付与する
- RLS ヘルパー関数は既存の `current_tenant_id()` / `current_employee_id()` / `current_employee_app_role()` / `is_task_group_owner(uuid)` / `is_task_group_manager(uuid)` / `is_task_group_participant(uuid)`（すべて `supabase/migrations/20260907032410_create_task_management_tables.sql` 定義済み）を再利用し、新規ヘルパーも `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` パターンに揃える
- **`task_comments` の RLS ポリシーは `task_comments` テーブル自身を自己参照する形にしない**（`tasks`/`task_groups` 等の既存行を参照するのみに留める）。これは Task 1 で発見・修正した「`INSERT ... RETURNING` 実行時、同一コマンド内で挿入直後の自分自身の行が自己参照SELECTでは見えない」という Postgres の落とし穴（`supabase/migrations/20260907045723_fix_task_groups_select_self_reference.sql` 参照）を再発させないための制約
- `getServerUser()` が返す `AppUser.tenant_id` / `AppUser.employee_id` は `string | undefined`。DB の非nullableカラムに書き込む前に必ずガードする（`actions.ts` の既存関数と同じパターン：`if (!user.tenant_id) throw new Error('テナント情報が取得できませんでした')` 等）
- Server Action での `UPDATE` はカラムを明示的に絞る（意図しないカラムを一緒に書き込まない）。RLS で拒否された `UPDATE`/`DELETE` は0件影響で正常終了するため、`.select('id')` で影響行数を確認し、0件ならエラーを投げる（既存の `updateTaskStatus`/`updateTaskProgress` と同じパターン）
- `page.tsx` に `supabase.from(...)` を直接書かない。SELECT は `queries.ts`。ただし Client Component（モーダル等）からの動的取得は Server Action（`actions.ts`）経由で行う（この一点のみ既存規約から逸脱することが `docs/implementation-plan-task-management.md` セクション13.4で承認済み）
- コードコメントは日本語
- テストは `node --import tsx --test` で実行する既存構成に従う。Zod スキーマ・純粋関数（コメントのツリー構築ロジック等）は `*.test.ts` で unit test する。Supabase 呼び出しを含む `queries.ts`/`actions.ts` と React コンポーネント自体はこのプロジェクトに unit test の前例がないため、テストは書かず「Server Actions テンプレート通りの実装」と「`npm run dev` での動作確認」で担保する
- Supabase への操作前に対象DBを宣言する（ローカル `127.0.0.1:55422` を対象とする。本番操作はこの plan の範囲外）
- 手動動作確認で `npm run dev` を使う場合、事前に `ss -ltnp | grep 3000` でポート使用状況を確認し、他プロセスを `pkill` しない（過去に無関係なプロセスを誤って終了させた事故がある）
- 手動動作確認で作成したテストデータ（コメント等）は確認後に必ず削除し、DB を元の状態に戻す

---

## タスク一覧と対象ファイル

| #   | タスク                                           | 主な成果物                                                                   |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | DBスキーマ・RLS                                  | `supabase/migrations/*_create_task_comments_table.sql`                       |
| 2   | 型・Zodスキーマ                                  | `src/features/task-management/types.ts`                                      |
| 3   | コメントツリー構築ロジック                       | `src/features/task-management/comment-tree.ts`                               |
| 4   | コメント一覧取得                                 | `queries.ts#getTaskComments`                                                 |
| 5   | コメントCRUD Server Actions                      | `actions.ts#createComment/updateComment/deleteComment/getTaskCommentsAction` |
| 6   | コメントスレッドUI（表示・投稿・返信）           | `components/CommentThread.tsx`                                               |
| 7   | コメントスレッドUI（編集・削除）                 | `components/CommentThread.tsx` 拡張                                          |
| 8   | タスク詳細モーダル（基本情報＋編集）             | `components/TaskDetailModal.tsx`                                             |
| 9   | タスク詳細モーダルへのコメント統合＋TaskCard改修 | `TaskDetailModal.tsx`, `TaskCard.tsx`, `KanbanBoard.tsx`                     |
| 10  | タスクグループへのコメント欄追加                 | `groups/[id]/page.tsx`                                                       |
| 11  | 手動E2E確認                                      | —                                                                            |

---

### Task 1: DBスキーマ・RLSポリシー

**Files:**

- Create: `supabase/migrations/<timestamp>_create_task_comments_table.sql`（`supabase migration new create_task_comments_table` で生成されるファイル名を使う）

**Interfaces:**

- Produces: テーブル `task_comments`。関数 `public.can_comment_on_task(uuid)`, `public.can_comment_on_task_group(uuid)`（すべて `RETURNS boolean`）。以降の全タスクがこのスキーマ・関数名に依存する。

- [ ] **Step 1: 対象DBを宣言し、ローカルSupabaseが起動していることを確認する**

対象DB: ローカル (`127.0.0.1:55422`)。

Run: `supabase status`
Expected: `DB URL` に `127.0.0.1:55422` を含む出力。起動していなければ `supabase start` を実行する。

- [ ] **Step 2: マイグレーションファイルを新規作成する**

Run: `supabase migration new create_task_comments_table`
Expected: `supabase/migrations/<timestamp>_create_task_comments_table.sql` が作成される。以降このファイルに追記する。

- [ ] **Step 3: テーブル定義を書く**

```sql
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_group_id UUID REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL DEFAULT 'general' CHECK (comment_type IN ('report', 'advice', 'suggestion', 'general')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_comments_target_check CHECK ((task_id IS NOT NULL) <> (task_group_id IS NOT NULL))
);

COMMENT ON TABLE public.task_comments IS 'タスク管理: タスクまたはタスクグループ単位のコメント（報告・助言・進言）。task_id/task_group_id のどちらか一方のみが設定される';
COMMENT ON CONSTRAINT task_comments_target_check ON public.task_comments IS 'task_id と task_group_id は排他的に片方だけが必須（XOR）';

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_group_id ON public.task_comments(task_group_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_comment_id ON public.task_comments(parent_comment_id);
```

- [ ] **Step 4: RLSヘルパー関数を書く**

```sql
-- タスクへのコメント投稿権限: 責任者・マネージャーは全タスク、メンバーは自分の担当タスクのみ
CREATE OR REPLACE FUNCTION public.can_comment_on_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        public.is_task_group_owner(t.task_group_id)
        OR public.is_task_group_manager(t.task_group_id)
        OR t.assignee_employee_id = public.current_employee_id()
      )
  );
$$;

COMMENT ON FUNCTION public.can_comment_on_task(UUID) IS 'ログインユーザーが指定したタスクにコメント投稿できるか（責任者/マネージャー/担当者本人）';

-- タスクグループへのコメント投稿権限: 責任者・マネージャーのみ
CREATE OR REPLACE FUNCTION public.can_comment_on_task_group(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_task_group_owner(p_task_group_id) OR public.is_task_group_manager(p_task_group_id);
$$;

COMMENT ON FUNCTION public.can_comment_on_task_group(UUID) IS 'ログインユーザーが指定したタスクグループにコメント投稿できるか（責任者/マネージャーのみ）';
```

- [ ] **Step 5: RLSを有効化しポリシーを書く**

```sql
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: グループ参加者全員、またはテナント管理者。task_comments 自身は参照しない
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      (task_group_id IS NOT NULL AND public.is_task_group_participant(task_group_id))
      OR (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_task_group_participant(t.task_group_id)
      ))
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- INSERT: 投稿者は自分自身。対象に応じた権限チェック
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
  );

-- UPDATE: 投稿者本人のみ（本文編集）
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- DELETE: 投稿者本人、または責任者・マネージャー
CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND (
          public.is_task_group_owner(t.task_group_id) OR public.is_task_group_manager(t.task_group_id)
        )
      ))
    )
  );
```

- [ ] **Step 6: マイグレーションを適用して確認する**

Run: `supabase migration up`
Expected: エラーなく適用完了。

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "\d task_comments"`
Expected: カラム一覧・CHECK制約が表示される。

- [ ] **Step 7: RLS自己参照バグと同じクラスの問題が無いことを確認する**

Task 1 で発見された「`INSERT ... RETURNING` 実行時、SELECT ポリシーが挿入対象テーブル自身を再スキャンすると、直前に挿入した行が見えない」問題が再発していないか確認する。`task_comments_select` ポリシーの `USING` 句が `task_comments` テーブル自身を一切参照していないこと（`tasks`/`task_groups` のみを参照していること）をポリシー定義を読んで確認し、実際に `INSERT INTO task_comments (...) RETURNING id` が `employee` ロールの担当者で成功することを、ロールバック付きトランザクションで検証する。

Run（例、実際の値は既存テストデータに合わせて調整する）:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<担当者のauth user_id>"}';
INSERT INTO task_comments (tenant_id, task_id, employee_id, comment_type, body)
VALUES ('<tenant_id>', '<task_id>', '<employee_id>', 'report', 'テスト')
RETURNING id;
ROLLBACK;
```

Expected: エラーなく1行返る。`ROLLBACK` で何も残らないことを確認する。

- [ ] **Step 8: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: `src/lib/supabase/types.ts` に `task_comments` の型が追加される。

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/*_create_task_comments_table.sql src/lib/supabase/types.ts
git commit -m "feat: タスクコメント（task_comments）の基本テーブルとRLSポリシーを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: 型・Zodスキーマ

**Files:**

- Modify: `src/features/task-management/types.ts`
- Test: `src/features/task-management/types.test.ts`（既存ファイルに追記）

**Interfaces:**

- Produces: `COMMENT_TYPES`, `CommentType`, `createCommentSchema`, `CreateCommentInput`, `updateCommentSchema`, `UpdateCommentInput`, `deleteCommentSchema`, `DeleteCommentInput`, インターフェース `TaskComment`。以降の全タスクがこれらの型・スキーマ名に依存する。

- [ ] **Step 1: 失敗するテストを既存の `types.test.ts` に追記する**

```typescript
// src/features/task-management/types.test.ts に追記
import { createCommentSchema, updateCommentSchema, deleteCommentSchema } from './types'

test('コメント作成: taskIdのみ指定で成功する', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'report',
    body: '進捗を報告します',
  })
  assert.equal(result.success, true)
})

test('コメント作成: taskGroupIdのみ指定で成功する', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'advice',
    body: '助言です',
  })
  assert.equal(result.success, true)
})

test('コメント作成: taskIdとtaskGroupIdを両方指定すると拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    taskGroupId: '22222222-2222-4222-8222-222222222222',
    commentType: 'general',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: taskIdとtaskGroupIdをどちらも指定しないと拒否される', () => {
  const result = createCommentSchema.safeParse({
    commentType: 'general',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: bodyが空文字は拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    body: '',
  })
  assert.equal(result.success, false)
})

test('コメント作成: 未定義のcommentTypeは拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'unknown',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: parentCommentIdは省略可能', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    body: 'x',
  })
  assert.equal(result.success, true)
})

test('コメント更新: bodyのみで成功する', () => {
  const result = updateCommentSchema.safeParse({
    commentId: '11111111-1111-4111-8111-111111111111',
    body: '修正後の本文',
  })
  assert.equal(result.success, true)
})

test('コメント更新: bodyが空文字は拒否される', () => {
  const result = updateCommentSchema.safeParse({
    commentId: '11111111-1111-4111-8111-111111111111',
    body: '',
  })
  assert.equal(result.success, false)
})

test('コメント削除: commentIdがUUID形式でなければ拒否される', () => {
  const result = deleteCommentSchema.safeParse({ commentId: 'not-a-uuid' })
  assert.equal(result.success, false)
})
```

- [ ] **Step 2: テストを実行し失敗を確認する**

Run: `node --import tsx --test src/features/task-management/types.test.ts`
Expected: `createCommentSchema` 等が存在しないため FAIL（`TypeError: createCommentSchema is not a function` 相当）

- [ ] **Step 3: `types.ts` に追記する**

```typescript
// src/features/task-management/types.ts に追記

export const COMMENT_TYPES = ['report', 'advice', 'suggestion', 'general'] as const
export type CommentType = (typeof COMMENT_TYPES)[number]

export const createCommentSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    taskGroupId: z.string().uuid().optional(),
    parentCommentId: z.string().uuid().optional(),
    commentType: z.enum(COMMENT_TYPES),
    body: z.string().min(1).max(2000),
  })
  .refine(data => (data.taskId ? 1 : 0) + (data.taskGroupId ? 1 : 0) === 1, {
    message: 'taskId と taskGroupId はどちらか一方のみ指定する',
  })
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>

export interface TaskComment {
  id: string
  tenantId: string
  taskId: string | null
  taskGroupId: string | null
  employeeId: string
  /** 投稿者の氏名（employees.name が null の場合のフォールバック済み） */
  employeeName: string
  parentCommentId: string | null
  commentType: CommentType
  body: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: テストを実行し成功を確認する**

Run: `node --import tsx --test src/features/task-management/types.test.ts`
Expected: 全件 PASS（既存の8件 + 新規10件 = 18件）

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/types.ts src/features/task-management/types.test.ts
git commit -m "feat: タスクコメントの型・Zodスキーマを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: コメントツリー構築ロジック

**Files:**

- Create: `src/features/task-management/comment-tree.ts`
- Test: `src/features/task-management/comment-tree.test.ts`

**Interfaces:**

- Consumes: `TaskComment`（Task2）
- Produces: `interface CommentNode extends TaskComment { replies: CommentNode[] }`, `buildCommentTree(comments: TaskComment[]): CommentNode[]`。Task6のUIコンポーネントがこれを使ってスレッド表示を組み立てる。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/features/task-management/comment-tree.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCommentTree } from './comment-tree'
import type { TaskComment } from './types'

function comment(overrides: Partial<TaskComment>): TaskComment {
  return {
    id: 'c-1',
    tenantId: 't-1',
    taskId: 'task-1',
    taskGroupId: null,
    employeeId: 'e-1',
    employeeName: '山田太郎',
    parentCommentId: null,
    commentType: 'general',
    body: 'コメント本文',
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(buildCommentTree([]), [])
})

test('親コメントのみの場合はrepliesが空配列のルートノードになる', () => {
  const tree = buildCommentTree([comment({ id: 'c-1' })])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 'c-1')
  assert.deepEqual(tree[0].replies, [])
})

test('parentCommentIdで正しく親の下にネストされる', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', parentCommentId: null }),
    comment({ id: 'c-2', parentCommentId: 'c-1' }),
  ])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].replies.length, 1)
  assert.equal(tree[0].replies[0].id, 'c-2')
})

test('複数のルートコメントを作成日時の昇順で保持する', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', createdAt: '2026-09-07T00:00:00.000Z' }),
    comment({ id: 'c-2', createdAt: '2026-09-07T01:00:00.000Z' }),
  ])
  assert.deepEqual(
    tree.map(n => n.id),
    ['c-1', 'c-2']
  )
})

test('存在しないparentCommentIdを持つコメントはルートとして扱う（親が削除済みのケース）', () => {
  const tree = buildCommentTree([comment({ id: 'c-1', parentCommentId: 'missing-parent' })])
  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 'c-1')
})

test('3階層目の返信も正しくネストされる', () => {
  const tree = buildCommentTree([
    comment({ id: 'c-1', parentCommentId: null }),
    comment({ id: 'c-2', parentCommentId: 'c-1' }),
    comment({ id: 'c-3', parentCommentId: 'c-2' }),
  ])
  assert.equal(tree[0].replies[0].replies[0].id, 'c-3')
})
```

- [ ] **Step 2: テストを実行し失敗を確認する**

Run: `node --import tsx --test src/features/task-management/comment-tree.test.ts`
Expected: `Cannot find module './comment-tree'` で FAIL

- [ ] **Step 3: 最小実装を書く**

```typescript
// src/features/task-management/comment-tree.ts
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
```

- [ ] **Step 4: テストを実行し成功を確認する**

Run: `node --import tsx --test src/features/task-management/comment-tree.test.ts`
Expected: 全件 PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/comment-tree.ts src/features/task-management/comment-tree.test.ts
git commit -m "feat: コメントのツリー構築ロジックを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: コメント一覧取得

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: `TaskComment`（Task2）
- Produces: `getTaskComments(supabase: SupabaseClient<Database>, target: { taskId: string } | { taskGroupId: string }): Promise<TaskComment[]>`。Task5の `getTaskCommentsAction` がこれをラップする。

- [ ] **Step 1: `queries.ts` に追記する**

Supabase の外部キーJOIN構文（このプロジェクトの `src/features/organization/queries.ts` の `division:division_id(id, name)` と同じパターン）で投稿者名を一緒に取得する。

```typescript
// src/features/task-management/queries.ts に追記
import type { TaskComment } from './types'

/** DB行（snake_case、employees とのJOIN込み）を TaskComment（camelCase）に変換する */
function mapComment(
  row: Database['public']['Tables']['task_comments']['Row'] & {
    employee: { name: string | null } | null
  }
): TaskComment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    taskGroupId: row.task_group_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? '（名前未設定）',
    parentCommentId: row.parent_comment_id,
    commentType: row.comment_type as TaskComment['commentType'],
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * タスクまたはタスクグループに紐づくコメント一覧を作成日時の昇順で取得する。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskComments(
  supabase: SupabaseClient<Database>,
  target: { taskId: string } | { taskGroupId: string }
): Promise<TaskComment[]> {
  let query = supabase
    .from('task_comments')
    .select('*, employee:employee_id(name)')
    .order('created_at', { ascending: true })

  query =
    'taskId' in target
      ? query.eq('task_id', target.taskId)
      : query.eq('task_group_id', target.taskGroupId)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(mapComment)
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし。Supabase の JOIN 結果の型が期待通りにならずエラーになった場合、`select('*, employee:employee_id(name)')` の戻り値型が `mapComment` の引数型と一致するよう、必要なら `as` でのキャストや型の調整を行う（既存の他ファイルで似たJOINパターンがあれば参照する）。

- [ ] **Step 3: Commit**

```bash
git add src/features/task-management/queries.ts
git commit -m "feat: タスク/タスクグループのコメント一覧取得を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: コメントCRUD Server Actions

**Files:**

- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: `createCommentSchema`/`CreateCommentInput`, `updateCommentSchema`/`UpdateCommentInput`, `deleteCommentSchema`/`DeleteCommentInput`（Task2）, `getTaskComments`（Task4）
- Produces: `createComment(input: CreateCommentInput): Promise<{ id: string }>`, `updateComment(input: UpdateCommentInput): Promise<void>`, `deleteComment(input: DeleteCommentInput): Promise<void>`, `getTaskCommentsAction(target: { taskId: string } | { taskGroupId: string }): Promise<TaskComment[]>`。Task6/7のUIコンポーネントがこれらを使う。

- [ ] **Step 1: `actions.ts` に追記する**

```typescript
// src/features/task-management/actions.ts の import 節に追加
import {
  // ...既存のimportに追加
  createCommentSchema,
  type CreateCommentInput,
  updateCommentSchema,
  type UpdateCommentInput,
  deleteCommentSchema,
  type DeleteCommentInput,
} from './types'
import { getTaskComments } from './queries'
import type { TaskComment } from './types'

/**
 * コメント（task_comments）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional のため早期に弾く。
 * 投稿可否（対象に応じた権限）は RLS の INSERT ポリシーが強制する
 * （`can_comment_on_task` / `can_comment_on_task_group`）。
 * revalidatePath はタスクグループ詳細ページ（コメントがどちらの対象でも
 * 表示場所は最終的にこのページ配下になる）を対象にする。
 */
export async function createComment(input: CreateCommentInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createCommentSchema.parse(input)
  const supabase = await createClient()

  // revalidatePath 用に対象タスクグループのIDを解決する
  let taskGroupIdForRevalidate: string
  if (parsed.taskGroupId) {
    taskGroupIdForRevalidate = parsed.taskGroupId
  } else {
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('task_group_id')
      .eq('id', parsed.taskId)
      .single()
    if (taskError) throw taskError
    taskGroupIdForRevalidate = task.task_group_id
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      tenant_id: user.tenant_id,
      task_id: parsed.taskId ?? null,
      task_group_id: parsed.taskGroupId ?? null,
      employee_id: user.employee_id,
      parent_comment_id: parsed.parentCommentId ?? null,
      comment_type: parsed.commentType,
      body: parsed.body,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))

  return { id: data.id }
}

/**
 * コメント（task_comments）の本文のみを更新する。
 *
 * カラム制限: `.update()` には `body` と `updated_at` のみを渡す
 * （`updateTaskStatus`/`updateTaskProgress` と同じ理由）。
 * 更新可否（投稿者本人のみ）は RLS の UPDATE ポリシーが強制する。
 * 0件更新時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function updateComment(input: UpdateCommentInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateCommentSchema.parse(input)
  const supabase = await createClient()

  const { data: comment, error: fetchError } = await supabase
    .from('task_comments')
    .select('task_id, task_group_id')
    .eq('id', parsed.commentId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('task_comments')
    .update({ body: parsed.body, updated_at: new Date().toISOString() })
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを編集する権限がありません')
  }

  const taskGroupIdForRevalidate =
    comment.task_group_id ??
    (await supabase.from('tasks').select('task_group_id').eq('id', comment.task_id!).single()).data
      ?.task_group_id

  if (taskGroupIdForRevalidate) {
    revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))
  }
}

/**
 * コメント（task_comments）を削除する。
 * 削除可否（投稿者本人、または責任者・マネージャー）は RLS の DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる。
 */
export async function deleteComment(input: DeleteCommentInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteCommentSchema.parse(input)
  const supabase = await createClient()

  const { data: comment, error: fetchError } = await supabase
    .from('task_comments')
    .select('task_id, task_group_id')
    .eq('id', parsed.commentId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', parsed.commentId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このコメントを削除する権限がありません')
  }

  const taskGroupIdForRevalidate =
    comment.task_group_id ??
    (await supabase.from('tasks').select('task_group_id').eq('id', comment.task_id!).single()).data
      ?.task_group_id

  if (taskGroupIdForRevalidate) {
    revalidatePath(APP_ROUTES.tasks.groupDetail(taskGroupIdForRevalidate))
  }
}

/**
 * コメント一覧を取得する読み取り専用 Server Action。
 *
 * 通常このプロジェクトでは SELECT は queries.ts に置くが、タスク詳細モーダルや
 * タスクグループのコメント欄は Client Component からモーダルを開いたタイミング等で
 * 動的に取得する必要があり、Client Component が呼べるのは Server Action のみのため、
 * ここに薄いラッパーとして置く（`docs/implementation-plan-task-management.md` セクション13.4）。
 */
export async function getTaskCommentsAction(
  target: { taskId: string } | { taskGroupId: string }
): Promise<TaskComment[]> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  return getTaskComments(supabase, target)
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/task-management/actions.ts
git commit -m "feat: コメントのCRUD Server Actionsを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: コメントスレッドUI（表示・投稿・返信）

**Files:**

- Create: `src/features/task-management/components/CommentThread.tsx`

**Interfaces:**

- Consumes: `getTaskCommentsAction`, `createComment`（Task5）, `buildCommentTree`/`CommentNode`（Task3）, `COMMENT_TYPES`/`CommentType`（Task2）
- Produces: React コンポーネント `CommentThread`。Props: `{ target: { taskId: string } | { taskGroupId: string }; canPost: boolean }`。Task7で編集・削除を追加し、Task9でタスク詳細モーダルに、Task10でタスクグループ詳細ページに組み込む。

- [ ] **Step 1: `CommentThread.tsx` を書く**

`useEffect` でマウント時に `getTaskCommentsAction` を呼んでコメント一覧を取得する（Client Component からの唯一の取得手段）。投稿フォームは種別セレクト＋本文＋送信ボタン。返信は各コメントに「返信」ボタンを置き、クリックするとそのコメントの下に返信用の小さいフォームを開く。

```tsx
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
```

const COMMENT_TYPE_LABEL は `CommentItem` からも参照するため、モジュールスコープの定数のまま保つ（コンポーネント内に閉じ込めない）。

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/task-management/components/CommentThread.tsx
git commit -m "feat: コメントスレッドUI（表示・投稿・返信）を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: コメントスレッドUI（編集・削除）

**Files:**

- Modify: `src/features/task-management/components/CommentThread.tsx`

**Interfaces:**

- Consumes: `updateComment`, `deleteComment`（Task5）
- Produces: `CommentItem` に編集・削除ボタンを追加。Props に `currentEmployeeId: string | null` と `canModerate: boolean`（責任者・マネージャーとして他人のコメントも削除できるか）を追加。

- [ ] **Step 1: `CommentThreadProps` と `CommentItemProps` に権限情報を追加する**

```tsx
// CommentThreadProps に追加
interface CommentThreadProps {
  target: { taskId: string } | { taskGroupId: string }
  canPost: boolean
  /** 閲覧者本人の従業員ID（編集可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerate: boolean
}
```

`CommentThread` 内の `<CommentItem ... />` の2箇所の呼び出しに `currentEmployeeId={currentEmployeeId}` `canModerate={canModerate}` を追加し、`CommentItemProps` にも同じ2つを追加して、再帰呼び出し（`node.replies.map(reply => <CommentItem ... />)`）にも伝播させる。

- [ ] **Step 2: `CommentItem` に編集・削除UIを追加する**

```tsx
// CommentItem の中身を書き換える
function CommentItem({
  node,
  target,
  replyingToId,
  setReplyingToId,
  onPosted,
  currentEmployeeId,
  canModerate,
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
        <button
          type="button"
          onClick={() => setReplyingToId(replyingToId === node.id ? null : node.id)}
          className="text-[10px] text-[#FD7601]"
        >
          返信
        </button>
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
              currentEmployeeId={currentEmployeeId}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
```

`updateComment`/`deleteComment` を Task5 の `../actions` から import する行を追加すること。

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/components/CommentThread.tsx
git commit -m "feat: コメントスレッドUIに編集・削除機能を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: タスク詳細モーダル（基本情報＋ステータス/進捗編集）

**Files:**

- Create: `src/features/task-management/components/TaskDetailModal.tsx`

**Interfaces:**

- Consumes: `Task`, `TASK_STATUSES`, `TASK_PRIORITIES`（Task3以前から存在）, `updateTaskStatus`/`updateTaskProgress`（既存 `actions.ts`）
- Produces: React コンポーネント `TaskDetailModal`。Props: `{ task: Task; isOpen: boolean; onClose: () => void; canOperate: boolean }`。既存の `TaskCard.tsx` のステータス/進捗編集ロジックをここに移植する。Task9でコメントスレッドを追加し、`TaskCard.tsx` からモーダルとして呼び出す。

- [ ] **Step 1: `TaskDetailModal.tsx` を書く**

既存 `TaskCard.tsx` の `handleStatusChange`/`handleProgressChange` ロジックをそのまま移植し、モーダルのUI（オーバーレイ＋ダイアログ）でラップする。

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatus, updateTaskProgress } from '../actions'
import { TASK_STATUSES, type Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  /** ステータス・進捗編集を行えるか（責任者/マネージャー/担当者本人。RLSが最終防衛） */
  canOperate: boolean
}

export function TaskDetailModal({ task, isOpen, onClose, canOperate }: TaskDetailModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Task['status']
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
      }
    })
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progressPercent = Number(e.target.value)
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskProgress({ taskId: task.id, progressPercent })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '進捗率の更新に失敗しました')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{task.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        {task.description && <p className="mt-2 text-xs text-slate-600">{task.description}</p>}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <dt className="text-[10px] text-slate-400">優先度</dt>
            <dd>{PRIORITY_LABEL[task.priority]}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-400">期限</dt>
            <dd>{task.dueDate ?? '未設定'}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <label className="text-xs font-medium text-slate-700">
            ステータス
            <select
              value={task.status}
              onChange={handleStatusChange}
              disabled={isPending || !canOperate}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            >
              {TASK_STATUSES.map(status => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-medium text-slate-700">
            進捗率: {task.progressPercent}%
            <input
              type="range"
              min={0}
              max={100}
              value={task.progressPercent}
              onChange={handleProgressChange}
              disabled={isPending || !canOperate}
              className="mt-1 w-full"
            />
          </label>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/task-management/components/TaskDetailModal.tsx
git commit -m "feat: タスク詳細モーダル（基本情報・ステータス/進捗編集）を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: タスク詳細モーダルへのコメント統合＋TaskCard改修

**Files:**

- Modify: `src/features/task-management/components/TaskDetailModal.tsx`
- Modify: `src/features/task-management/components/TaskCard.tsx`
- Modify: `src/features/task-management/components/KanbanBoard.tsx`

**Interfaces:**

- Consumes: `CommentThread`（Task6/7）, `TaskDetailModal`（Task8）
- Produces: `TaskDetailModal` に `CommentThread` を追加。`TaskCard` はステータス/進捗の直接編集UIを撤去し、クリックで `TaskDetailModal` を開くだけの読み取り専用カードになる。`KanbanBoard`/`TaskCard` に `currentEmployeeId`/`canModerateComments` を追加で伝播する。

- [ ] **Step 1: `TaskDetailModal.tsx` にコメントスレッドを追加する**

```tsx
// TaskDetailModal.tsx の import に追加
import { CommentThread } from './CommentThread'

// TaskDetailModalProps に追加
interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  canOperate: boolean
  /** 閲覧者本人の従業員ID（コメント編集可否の判定に使う） */
  currentEmployeeId: string | null
  /** 閲覧者が責任者・マネージャーとして他人のコメントも削除できるか */
  canModerateComments: boolean
}
```

`TaskDetailModal` の関数シグネチャに `currentEmployeeId, canModerateComments` を追加し、進捗率入力の直後（`</div>` の前、モーダル本体の末尾）に以下を追加する:

```tsx
<div className="mt-4 border-t border-slate-200 pt-3">
  <h3 className="mb-2 text-xs font-semibold text-slate-900">コメント</h3>
  <CommentThread
    target={{ taskId: task.id }}
    canPost={canOperate}
    currentEmployeeId={currentEmployeeId}
    canModerate={canModerateComments}
  />
</div>
```

`canPost={canOperate}` としているのは、コメント投稿権限（責任者/マネージャー/担当者本人）がステータス編集権限と同じ集合（`can_comment_on_task` のRLSロジックと `tasks_update` のRLSロジックが一致）であるため。

- [ ] **Step 2: `TaskCard.tsx` を書き換える**

セレクト/スライダーを撤去し、クリックでモーダルを開くだけのカードにする。モーダルの開閉状態はカード自身が `useState` で持つ。

```tsx
'use client'

import { useState } from 'react'
import { TaskDetailModal } from './TaskDetailModal'
import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
  /** 閲覧者本人の従業員ID（従業員レコード無しユーザーは null） */
  myEmployeeId: string | null
  /** 閲覧者がこのタスクグループの責任者またはマネージャーか（全タスクを操作可能） */
  canOperateAllTasks: boolean
}

/**
 * カンバン上のタスクカード。クリックすると TaskDetailModal を開く読み取り専用表示。
 * ステータス・進捗率の編集操作、コメントはすべてモーダル内に集約する。
 */
export function TaskCard({ task, myEmployeeId, canOperateAllTasks }: TaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const canOperate = canOperateAllTasks || task.assigneeEmployeeId === myEmployeeId

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xs hover:bg-[#f6f8fa]"
      >
        <p className="text-xs font-medium text-slate-900">{task.title}</p>
        <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-[#FD7601]"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
      </button>
      <TaskDetailModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canOperate={canOperate}
        currentEmployeeId={myEmployeeId}
        canModerateComments={canOperateAllTasks}
      />
    </>
  )
}
```

`STATUS_LABEL` はこのファイルではもう使わないため削除する（`TaskDetailModal.tsx` 側に既にある）。`useTransition`/`useRouter`/`updateTaskStatus`/`updateTaskProgress`/`TASK_STATUSES` の import も不要になるため削除する。

- [ ] **Step 3: `KanbanBoard.tsx` を確認する**

`KanbanBoard` は `TaskCard` に `myEmployeeId`/`canOperateAllTasks` を渡しているだけなので、Props の変更は不要。ファイルを変更する必要がないことを確認する（読み込むだけでよい）。

- [ ] **Step 4: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: 手動で動作確認する**

Run: `npm run dev`（事前にポート確認。既存プロセスがあれば別ポートを使う）
Expected: タスクグループ詳細ページでタスクカードをクリックするとモーダルが開き、タスク情報・ステータス/進捗編集・コメント欄（読み込み中→一覧表示）が表示される。担当者としてコメントを投稿すると一覧に反映され、返信・編集・削除も動作する。閲覧のみ許可されたユーザー（グループ参加者だが担当者でも責任者でもマネージャーでもない場合）はステータス/進捗編集とコメント投稿フォームが表示されない（`canOperate`/`canPost` が false）が、既存コメントの閲覧は引き続きできる。

- [ ] **Step 6: Commit**

```bash
git add src/features/task-management/components/TaskDetailModal.tsx src/features/task-management/components/TaskCard.tsx
git commit -m "feat: タスク詳細モーダルにコメントスレッドを統合しTaskCardを読み取り専用化

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: タスクグループへのコメント欄追加

**Files:**

- Modify: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`

**Interfaces:**

- Consumes: `CommentThread`（Task6/7）, `canAssignManager`（既存 `permissions.ts`。投稿権限が「責任者・マネージャーのみ」という点で `can_comment_on_task_group` のRLSロジックと一致するため、`isOwner || isManager` で判定する）
- Produces: タスクグループ詳細ページに「タスクグループへのコメント」セクションを追加する。

- [ ] **Step 1: `groups/[id]/page.tsx` に `CommentThread` を追加する**

```tsx
// import に追加
import { CommentThread } from '@/features/task-management/components/CommentThread'
```

`</div>` （ページ最後の閉じタグ、`</section>` の直後）の手前に以下のセクションを追加する:

```tsx
<section className="rounded-lg border border-slate-200 p-3">
  <h2 className="text-xs font-semibold text-slate-900 mb-2">タスクグループへのコメント</h2>
  <CommentThread
    target={{ taskGroupId: board.group.id }}
    canPost={isOwner || isManager}
    currentEmployeeId={user?.employee_id ?? null}
    canModerate={isOwner || isManager}
  />
</section>
```

`isOwner`/`isManager` はこのファイルで既に計算済みの変数をそのまま使う（新規の権限計算は不要）。

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx"
git commit -m "feat: タスクグループ詳細ページにコメント欄を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: 手動E2E確認

**Files:**

- なし（動作確認のみ）

**Interfaces:**

- Consumes: Task1〜10のすべての成果物

- [ ] **Step 1: 対象DBを宣言し、ポート安全性を確認する**

対象DB: ローカル (`127.0.0.1:55422`)。`ss -ltnp | grep 3000` で空いていることを確認してから `npm run dev` を起動する（既に他プロセスが動いている場合は別ポートを使い、既存プロセスには触れない）。

- [ ] **Step 2: 一連のフローを確認する**

Playwright が使えない環境の場合、これまでのタスクで確立された「実 Supabase セッション（`@supabase/ssr` の `createServerClient` でログイン）＋実HTTPリクエスト」の方法で代替する。

1. 責任者としてログインし、既存のタスクグループ詳細ページを開く
2. 「タスクグループへのコメント」欄に投稿し、一覧に反映されることを確認する
3. 種別（報告/助言/提案/一般）を変えて投稿し、それぞれ正しいラベルで表示されることを確認する
4. マネージャーとしてログインし直し、同じタスクグループのコメント欄が見える（投稿もできる）ことを確認する
5. カンバン上のタスクカードをクリックし、モーダルが開くことを確認する。モーダル内でステータス・進捗率を更新できることを確認する（Task16で実装済みの機能がモーダル内でも動くこと）
6. モーダル内のコメント欄にコメントを投稿し、返信ボタンから返信を投稿し、ツリー表示されることを確認する
7. 自分の投稿したコメントを編集し、反映されることを確認する
8. 責任者として、マネージャーが投稿したコメントを削除できることを確認する（`canModerate`）
9. メンバー（担当者ではない、そのタスクグループの他のメンバー）としてログインし、担当外のタスクのモーダルを開いた際、コメントは見えるが投稿フォームが表示されないこと（`canPost=false`）を確認する
10. そのメンバーが自分の担当タスクのモーダルを開いた際は、コメント投稿フォームが表示されることを確認する
11. グループに参加していない別テナント従業員が同じタスクグループ・タスクのコメントにアクセスできないこと（RLS）を、直接 REST API 呼び出し等で確認する

- [ ] **Step 3: テストデータをクリーンアップする**

確認のために投稿したコメントをすべて削除する（DBに直接 `DELETE FROM task_comments WHERE id IN (...)` で、対象を具体的なIDで指定して削除する。「Fact-Forcing Gate」的なガードが destructive command をブロックする場合は、要求された形式（影響データ・ロールバック手順・現在の指示の引用）を提示してから再試行する）。削除後に `SELECT COUNT(*)` で対象データが0件であることを確認する。

- [ ] **Step 4: 全体のユニットテストを再実行する**

Run: `node --import tsx --test src/features/task-management/*.test.ts`
Expected: 全件 PASS（既存 + Task2/Task3で追加した分）

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 5: 最終確認**

`git log --oneline` で Task1〜10のコミットが揃っていることを確認し、コントローラー（このプランを実行しているセッション）に完了を報告する。
