# mYou 有効期限監視・処理ステータス設計

**日付:** 2026-07-24  
**対象:** `/myou/expiration-alerts`

## 背景・目的

期限間近の TraceNo ごとに「処理ステータス」を持ち、施工会社へのアラート送信対象を制御する。使用済みや通知不要の製品を除外しつつ、未使用のみメール送信できるようにする。

## 要件（確定）

| 項目             | 内容                                                             |
| ---------------- | ---------------------------------------------------------------- |
| 処理ステータス列 | 「残り日数」の直後に表示                                         |
| 編集             | 行ごとの「編集」ボタン → モーダルで変更                          |
| 選択肢           | 使用済 / 未使用 / アラート無視                                   |
| アラート送信     | **未使用のみ**メールに含める。未使用 0 件なら送信しない          |
| 初期値           | 新規・既存とも「未使用」                                         |
| 履歴列名         | 「ステータス」→「送信ステータス」（成功/失敗の意味は従来どおり） |

## データモデル

`myou_trace_labels` に追加:

```sql
process_status text NOT NULL DEFAULT 'unused'
  CHECK (process_status IN ('unused', 'used', 'alert_ignored'))
```

| DB値            | 画面表示     |
| --------------- | ------------ |
| `unused`        | 未使用       |
| `used`          | 使用済       |
| `alert_ignored` | アラート無視 |

- 既存行は DEFAULT で `unused`
- RLS は既存テナント分離ポリシーを継続（追加ポリシー不要）
- 適用は `supabase migration up`（`db reset` 禁止）

## アーキテクチャ

```
expiration-alerts/page.tsx
  → getExpiringTraceLabels()（id, process_status 含む）
  → ExpiringTraceLabelsTable
       → ProcessStatusEditModal → updateTraceProcessStatus
       → アラート送信 → sendManualAlert（unused のみ）
  → AlertLogTable（列名「送信ステータス」）
```

### 変更ファイル

| ファイル                                                           | 役割                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| `supabase/migrations/YYYYMMDDHHMMSS_myou_trace_process_status.sql` | カラム追加                                              |
| `src/features/myou/types.ts`                                       | `ProcessStatus`、`ExpiringTraceLabel` 拡張              |
| `src/features/myou/queries.ts`                                     | SELECT に `id`, `process_status`                        |
| `src/features/myou/actions.ts`                                     | `updateTraceProcessStatus` / `sendManualAlert` フィルタ |
| `.../ExpiringTraceLabelsTable.tsx`                                 | 列・編集・送信 UX                                       |
| `.../ProcessStatusEditModal.tsx`                                   | 新規モーダル                                            |
| `.../AlertLogTable.tsx`                                            | 見出し変更                                              |
| `src/lib/supabase/types.ts`                                        | gen types で再生成                                      |

### Server Action 概要

**`updateTraceProcessStatus(labelId, processStatus)`**

- `getServerUser()` で認可
- `myou_trace_labels` を `id` + `tenant_id` で UPDATE
- `revalidatePath(APP_ROUTES.MYOU.EXPIRATION_ALERTS)`

**`sendManualAlert` 変更**

- 取得結果を `process_status === 'unused'` でフィルタ
- 0 件 → `{ success: false, error: '送信対象の未使用製品がありません。' }`
- 1 件以上 → 従来どおりメール送信・ログ記録（`target_trace_nos` は未使用分のみ）

## UI 詳細

- 処理ステータス: バッジ（未使用=青系、使用済=グレー、アラート無視=スレート）
- 編集モーダル: Dialog + select + 保存ボタン。TraceNo を表示
- 送信ボタン: 未使用 0 件でも押下可（サーバ側でエラー返却し画面に表示）

## スコープ外

- 送信成功時の自動ステータス変更
- 使用済・アラート無視行を一覧から隠すこと
- ヘルプ Markdown の全面更新

## テスト方針

- `process_status` のフィルタ／ラベル変換があればユニットテスト可
- 手動: ステータス変更 → 一覧反映、未使用のみ送信、0 件でエラー、履歴列名
