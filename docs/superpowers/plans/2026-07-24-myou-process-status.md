# mYou 処理ステータス（expiration-alerts） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/myou/expiration-alerts` の期限間近一覧に処理ステータス（未使用/使用済/アラート無視）を追加し、編集モーダルで変更できるようにする。アラート送信は未使用行のみ対象とし、履歴の列名を「送信ステータス」に変更する。

**Architecture:** `myou_trace_labels.process_status` を永続化し、queries/actions 経由で読み書きする。UI は `ExpiringTraceLabelsTable` + 新規 `ProcessStatusEditModal`。`sendManualAlert` は unused のみメール・ログ対象にする。

**Tech Stack:** Next.js Server Actions, Supabase (Postgres + RLS), Zod, Radix Dialog, Tailwind

**Spec:** `docs/superpowers/specs/2026-07-24-myou-process-status-design.md`

## Global Constraints

- `process_status` の許可値は `unused` / `used` / `alert_ignored` のみ（表示: 未使用 / 使用済 / アラート無視）
- 初期値・既存行はすべて `unused`
- アラート送信は **未使用のみ**。未使用 0 件なら送信せずエラーメッセージ
- `supabase db reset` 禁止。適用は `supabase migration up`
- `createAdminClient` をエンドユーザー向け actions で使わない
- コメントは日本語
- コミットはユーザー依頼時のみ（指示がなければスキップ）

## File Structure

| ファイル                                                           | 責任                       |
| ------------------------------------------------------------------ | -------------------------- |
| `supabase/migrations/20260724180000_myou_trace_process_status.sql` | カラム追加                 |
| `src/features/myou/lib/process-status.ts`                          | ラベル変換・フィルタ純関数 |
| `src/features/myou/lib/process-status.test.ts`                     | 上記のユニットテスト       |
| `src/features/myou/types.ts`                                       | 型・Zod                    |
| `src/features/myou/queries.ts`                                     | SELECT 拡張                |
| `src/features/myou/actions.ts`                                     | update + send フィルタ     |
| `.../ProcessStatusEditModal.tsx`                                   | 編集 UI                    |
| `.../ExpiringTraceLabelsTable.tsx`                                 | 列・編集・送信             |
| `.../AlertLogTable.tsx`                                            | 列名変更                   |
| `src/lib/supabase/types.ts`                                        | gen types                  |

---

### Task 1: DB マイグレーション + 型再生成

**Files:**

- Create: `supabase/migrations/20260724180000_myou_trace_process_status.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で再生成）

**Interfaces:**

- Produces: `myou_trace_labels.process_status text NOT NULL DEFAULT 'unused'`

- [ ] **Step 1: マイグレーション SQL を作成する**

```sql
-- トレーサビリティQR発行分の処理ステータス（有効期限アラート制御用）
ALTER TABLE public.myou_trace_labels
  ADD COLUMN IF NOT EXISTS process_status text NOT NULL DEFAULT 'unused';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'myou_trace_labels_process_status_check'
  ) THEN
    ALTER TABLE public.myou_trace_labels
      ADD CONSTRAINT myou_trace_labels_process_status_check
      CHECK (process_status IN ('unused', 'used', 'alert_ignored'));
  END IF;
END $$;

COMMENT ON COLUMN public.myou_trace_labels.process_status IS
  '処理ステータス: unused=未使用, used=使用済, alert_ignored=アラート無視';
```

- [ ] **Step 2: 適用する（db reset 禁止）**

Run: `supabase migration up`  
Expected: 当該マイグレーションがエラーなく適用される

- [ ] **Step 3: 型を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`  
Expected: `myou_trace_labels.Row` に `process_status: string` が含まれる

- [ ] **Step 4: コミット（ユーザー依頼時のみ）**

```bash
git add supabase/migrations/20260724180000_myou_trace_process_status.sql src/lib/supabase/types.ts
git commit -m "$(cat <<'EOF'
feat(myou): add process_status column to myou_trace_labels

EOF
)"
```

---

### Task 2: 純関数 + 型定義 + ユニットテスト

**Files:**

- Create: `src/features/myou/lib/process-status.ts`
- Create: `src/features/myou/lib/process-status.test.ts`
- Modify: `src/features/myou/types.ts`

**Interfaces:**

- Produces:

```typescript
export type ProcessStatus = 'unused' | 'used' | 'alert_ignored'
export const PROCESS_STATUS_VALUES = ['unused', 'used', 'alert_ignored'] as const
export function processStatusLabel(status: ProcessStatus): string
export function filterUnusedForAlert<T extends { process_status: ProcessStatus }>(rows: T[]): T[]
export const processStatusSchema = z.enum(['unused', 'used', 'alert_ignored'])
// ExpiringTraceLabel に id: string と process_status: ProcessStatus を追加
```

- [ ] **Step 1: 失敗するテストを書く**

`src/features/myou/lib/process-status.test.ts`:

```typescript
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterUnusedForAlert, processStatusLabel } from './process-status'

describe('processStatusLabel', () => {
  it('maps unused/used/alert_ignored to Japanese labels', () => {
    assert.equal(processStatusLabel('unused'), '未使用')
    assert.equal(processStatusLabel('used'), '使用済')
    assert.equal(processStatusLabel('alert_ignored'), 'アラート無視')
  })
})

describe('filterUnusedForAlert', () => {
  it('keeps only unused rows', () => {
    const rows = [
      { id: '1', process_status: 'unused' as const },
      { id: '2', process_status: 'used' as const },
      { id: '3', process_status: 'alert_ignored' as const },
    ]
    assert.deepEqual(filterUnusedForAlert(rows), [{ id: '1', process_status: 'unused' }])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/features/myou/lib/process-status.test.ts`  
Expected: FAIL（モジュール未存在）

- [ ] **Step 3: 実装する**

`src/features/myou/lib/process-status.ts`:

```typescript
export type ProcessStatus = 'unused' | 'used' | 'alert_ignored'

export const PROCESS_STATUS_VALUES = ['unused', 'used', 'alert_ignored'] as const

const LABELS: Record<ProcessStatus, string> = {
  unused: '未使用',
  used: '使用済',
  alert_ignored: 'アラート無視',
}

/** 処理ステータスの画面表示名 */
export function processStatusLabel(status: ProcessStatus): string {
  return LABELS[status]
}

/** アラート送信対象は未使用のみ */
export function filterUnusedForAlert<T extends { process_status: ProcessStatus }>(rows: T[]): T[] {
  return rows.filter(row => row.process_status === 'unused')
}
```

`types.ts` に追加（既存 import の `z` を利用）:

```typescript
import type { ProcessStatus } from './lib/process-status'
export type { ProcessStatus } from './lib/process-status'
export { PROCESS_STATUS_VALUES } from './lib/process-status'

export const processStatusSchema = z.enum(['unused', 'used', 'alert_ignored'])

// ExpiringTraceLabel を拡張:
export interface ExpiringTraceLabel {
  id: string
  trace_no: string
  lot_no: string
  quantity: number
  expiration_date: string
  company_id: string
  process_status: ProcessStatus
  myou_companies: {
    id: string
    name: string
    email_address: string | null
  } | null
}
```

- [ ] **Step 4: テストを通す**

Run: `node --import tsx --test src/features/myou/lib/process-status.test.ts`  
Expected: PASS

- [ ] **Step 5: コミット（ユーザー依頼時のみ）**

```bash
git add src/features/myou/lib/process-status.ts src/features/myou/lib/process-status.test.ts src/features/myou/types.ts
git commit -m "$(cat <<'EOF'
feat(myou): add process status helpers and ExpiringTraceLabel fields

EOF
)"
```

---

### Task 3: queries + actions（更新・送信フィルタ）

**Files:**

- Modify: `src/features/myou/queries.ts`
- Modify: `src/features/myou/actions.ts`

**Interfaces:**

- Consumes: `ProcessStatus`, `processStatusSchema`, `filterUnusedForAlert`
- Produces: `updateTraceProcessStatus(labelId: string, processStatus: ProcessStatus)`  
  Returns `{ success: true } | { success: false, error: string }`  
  `sendManualAlert` は unused 0 件時に  
  `{ success: false, error: '送信対象の未使用製品がありません。' }`

- [ ] **Step 1: `getExpiringTraceLabels` の SELECT / map を拡張する**

select に `id, process_status` を追加し、map で返す:

```typescript
id: row.id,
process_status: (row.process_status as ProcessStatus) ?? 'unused',
```

（型ガードは `PROCESS_STATUS_VALUES.includes` で行ってもよい）

- [ ] **Step 2: `updateTraceProcessStatus` を actions.ts に追加する**

```typescript
export async function updateTraceProcessStatus(labelId: string, processStatus: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const idParsed = z.string().uuid('ラベルIDが不正です').safeParse(labelId)
  if (!idParsed.success) {
    return { success: false, error: idParsed.error.issues[0]?.message ?? 'ラベルIDが不正です' }
  }
  const statusParsed = processStatusSchema.safeParse(processStatus)
  if (!statusParsed.success) {
    return { success: false, error: '処理ステータスが不正です' }
  }

  const supabase = await getSupabase()
  const { error } = await supabase
    .from('myou_trace_labels')
    .update({ process_status: statusParsed.data })
    .eq('id', idParsed.data)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('Error updating process_status:', error)
    return { success: false, error: '処理ステータスの更新に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.EXPIRATION_ALERTS)
  return { success: true }
}
```

（`processStatusSchema` / `z` を types から import）

- [ ] **Step 3: `sendManualAlert` で unused のみ対象にする**

select に `process_status` を追加し、map 前に:

```typescript
const unusedLabels = filterUnusedForAlert(
  (labels as { process_status: ProcessStatus /* ... */ }[]).map(l => ({
    ...l,
    process_status: l.process_status ?? 'unused',
  }))
)
if (unusedLabels.length === 0) {
  return { success: false, error: '送信対象の未使用製品がありません。' }
}
// 以降 items は unusedLabels から組み立てる
```

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`  
Expected: エラーなし（UI 未接続で `ExpiringTraceLabel` 必須フィールド不足が出る場合は Task 4 と合わせて解消）

- [ ] **Step 5: コミット（ユーザー依頼時のみ）**

```bash
git add src/features/myou/queries.ts src/features/myou/actions.ts
git commit -m "$(cat <<'EOF'
feat(myou): persist and filter alerts by process_status

EOF
)"
```

---

### Task 4: UI（モーダル・テーブル・履歴列名）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/myou/components/ProcessStatusEditModal.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/myou/components/ExpiringTraceLabelsTable.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/myou/components/AlertLogTable.tsx`

**Interfaces:**

- Consumes: `updateTraceProcessStatus`, `processStatusLabel`, `PROCESS_STATUS_VALUES`, `ExpiringTraceLabel.id`

- [ ] **Step 1: `ProcessStatusEditModal.tsx` を作成する**

Props: `{ open, onOpenChange, label: Pick<ExpiringTraceLabel, 'id' | 'trace_no' | 'process_status'> }`

- Dialog（標準ヘッダー可、`max-w-md`）
- TraceNo 表示
- `<select>` で 3 値（`processStatusLabel`）
- 保存 → `updateTraceProcessStatus` → 成功で閉じる / 失敗でメッセージ

- [ ] **Step 2: `ExpiringTraceLabelsTable` を更新する**

- thead: 「残り日数」の後に「処理ステータス」「編集」
- tbody: バッジ（unused=青、used=グレー、alert_ignored=スレート）+ 編集ボタン
- `editingLabel` state でモーダル制御
- `key={label.id}` に変更（trace_no でも可だが id 推奨）

- [ ] **Step 3: `AlertLogTable` の列見出しを変更する**

「ステータス」→「送信ステータス」（表示ロジックは変更しない）

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`  
Expected: エラーなし

- [ ] **Step 5: 手動確認**

`/myou/expiration-alerts` で:

1. 処理ステータス列・編集ボタンが表示される
2. 編集でステータス変更 → 一覧反映
3. 未使用のみアラート送信される
4. すべて使用済/無視なら「送信対象の未使用製品がありません。」
5. 履歴の列名が「送信ステータス」

- [ ] **Step 6: コミット（ユーザー依頼時のみ）**

```bash
git add \
  src/app/\(tenant\)/\(tenant-users\)/myou/components/ProcessStatusEditModal.tsx \
  src/app/\(tenant\)/\(tenant-users\)/myou/components/ExpiringTraceLabelsTable.tsx \
  src/app/\(tenant\)/\(tenant-users\)/myou/components/AlertLogTable.tsx
git commit -m "$(cat <<'EOF'
feat(myou): add process status edit UI on expiration alerts

EOF
)"
```

---

## Spec coverage（自己レビュー）

| 仕様                                  | Task                |
| ------------------------------------- | ------------------- |
| process_status カラム・DEFAULT unused | 1                   |
| 表示名・フィルタ純関数                | 2                   |
| 一覧に id/status                      | 3                   |
| 編集 UPDATE                           | 3–4                 |
| 未使用のみ送信                        | 3                   |
| 履歴列名                              | 4                   |
| 一覧から非表示にしない                | 全 Task（触らない） |

プレースホルダなし。型名 `ProcessStatus` は Task 2→3→4 で一致。
