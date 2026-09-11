# タスク管理 Phase 5 設計書（目標中心のシンプルUIへの再構成）

**日付**: 2026-09-11
**関連PRD**: `docs/implementation-plan-task-management.md`（本設計は完了後、同PRDにセクション20として追記する）
**経緯**: ユーザーからのフィードバックにより、既存の「目標→マイルストーン→タスクグループ→タスク」という4階層UIが分かりにくいと判明。brainstormingスキルの対話を通じて、ユーザーと画面構成・データモデル・権限・コミュニケーションルートを1つずつ合意した記録。

## 0. 背景・目的

Phase 1〜4で構築した「目標→マイルストーン→タスクグループ→タスク」の階層モデルは、タスクグループ単位のカンバンボード（`/tasks/groups/[id]`）を中心に設計されている。しかし実際の利用シーンでは、目標に対して直接タスクを作成し、その責任者・メンバーを割り当てるだけのシンプルな操作を求めるユーザーが多いことが分かった。

Phase 5では、**データモデル（マイルストーン・タスクグループ）は変更せず**、UI上はこれらの中間層を隠し、「目標に直接タスクをぶら下げる」ように見せる。既存のカンバンボード・進捗集計・組織ツリー・コメント等のロジックへの影響を最小化するため、目標作成時に「デフォルトのマイルストーン」「デフォルトのタスクグループ」を裏側で自動生成する方式を採る。

## 1. スコープ

**変更する画面**:

- `/tasks/objectives/new`（新規目標作成）
- `/tasks/objectives/[id]`（目標詳細）

**変更しない画面**（既存のまま残す。新フローからは導線を張らないが、削除もしない）:

- `/tasks/groups/[id]`（タスクグループ詳細・カンバンボード）

**既存データ**: 本設計着手にあたり、ローカル開発DBのタスク管理関連データ（目標・マイルストーン・タスクグループ・コメント）は削除済み。本番DBは元々タスク管理データが0件（未使用）であることを確認済み。そのため、複数タスクグループを持つ旧データとの互換性は考慮不要とし、目標詳細ページは「常に1目標＝1デフォルトタスクグループ」を前提にシンプルに実装する。

## 2. データモデル変更

### 2.1 目標作成時のデフォルト構造自動生成

`createObjective` Server Actionを拡張し、目標作成に成功したら同一トランザクション相当の流れで以下を追加作成する:

1. `task_milestones`に1件（`title`: `'既定マイルストーン'`固定、`objective_id`: 作成した目標のID）
2. `task_groups`に1件（`name`: `'既定タスクグループ'`固定、`milestone_id`: 上記マイルストーンのID）

いずれもUIには表示しない内部的な入れ物。既存の`task_groups`/`task_milestones`のRLS・カラム制約はそのまま使う（新規カラム追加不要）。

### 2.2 タスクへの「責任者」「メンバー」役割の追加

既存の`task_assignees`（役割区分なし、複数人の担当者）に`role`列を追加する。

```sql
ALTER TABLE public.task_assignees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('responsible', 'member'));

-- 1タスクにつき responsible は最大1人
CREATE UNIQUE INDEX IF NOT EXISTS task_assignees_one_responsible_per_task
  ON public.task_assignees (task_id)
  WHERE role = 'responsible';
```

**「責任者は`is_manager = true`の人のみ」の強制**: CHECK制約では他テーブル参照ができないため、`task_assignees_insert`のRLS WITH CHECK句に条件を追加する。

```sql
-- 概念（既存ポリシーへの追加条件）
role = 'member'
OR (role = 'responsible' AND EXISTS (
  SELECT 1 FROM employees e WHERE e.id = employee_id AND e.is_manager = true
))
```

### 2.3 RLS可視性のための同期登録

既存のRLS（`task_objectives_select`/`task_groups_select`等）は「目標責任者」または「タスクグループの参加者（`task_group_managers`/`task_group_members`）」のみを可視対象とする。Phase 5の新しいタスク責任者・メンバーがこれらを閲覧できるようにするため、`task_assignees`への登録と同時に、対応するタスクグループの`task_group_managers`（responsible時）または`task_group_members`（member時）にも登録する処理をServer Action内に追加する（新しいRLSポリシーは作らず、既存の仕組みに乗せる）。

- タスクに「責任者」としてアサイン → 同じタスクの`task_group_id`に対して`task_group_managers`にも同一人物をINSERT（既に登録済みならスキップ）
- タスクに「メンバー」としてアサイン → 同様に`task_group_members`にもINSERT

解除時も同様に、そのタスクグループ内で他に責任者/メンバーとして残っている役割がなければ`task_group_managers`/`task_group_members`から削除する（既存の`removeMember`と同様のロジック）。

### 2.4 タスク目標・期限

既存の`tasks.goal_summary`（Phase4で追加済み）、`tasks.due_date`をそのまま「タスク目標」「タスク期限」として使う。新規カラムは不要。

## 3. 権限モデル

| 役割           | 定義                                                           | 見る範囲                                                                    |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 目標責任者     | `task_objectives.owner_employee_id`                            | 目標配下の全タスク                                                          |
| タスク責任者   | `task_assignees.role = 'responsible'` かつ `is_manager = true` | 自分が責任者のタスク中心（属するタスクグループ全体は既存RLSの範囲で見える） |
| タスクメンバー | `task_assignees.role = 'member'`                               | 自分がメンバーのタスク中心                                                  |

| 操作                             | 目標責任者 | タスク責任者             | タスクメンバー         |
| -------------------------------- | ---------- | ------------------------ | ---------------------- |
| タスク編集・削除・アサイン変更   | 全タスク   | 自分が責任者のタスクのみ | 不可                   |
| ステータス変更・進捗率・工数記録 | 全タスク   | 自分が責任者のタスク     | 自分がメンバーのタスク |
| コメント投稿                     | 可         | 可                       | 可                     |

タスクカードの「編集」「削除」ボタンは、目標責任者 または そのタスクの責任者のみに表示する（表示制御はUI、最終防衛は既存パターンどおりRLS）。

## 4. コミュニケーションルート（コメント種別の使い分け）

既存の`task_comments.comment_type`（`report` / `advice` / `suggestion` / `general`）は変更せず、宛先ルールを以下のように整理する。

| 送信元 → 宛先             | 種別         | 用途           |
| ------------------------- | ------------ | -------------- |
| 目標責任者 → タスク責任者 | `advice`     | 指示・助言     |
| タスク責任者 → メンバー   | `advice`     | 指示・助言     |
| メンバー → タスク責任者   | `suggestion` | 改善提案・相談 |
| タスク責任者 → 目標責任者 | `suggestion` | 改善提案・相談 |
| タスク責任者 → 目標責任者 | `report`     | 進捗・完了報告 |

既存の`can_send_advice`関数（Phase4で実装済み）と同じ設計パターンで、`can_send_suggestion`・`can_send_report`関数を追加し、`task_comments_insert`のRLSに適用する。`general`は引き続き宛先なし・参加者なら誰でも投稿可。

`CommentThread.tsx`の種別選択に応じて、宛先ピッカーの選択肢を「その役割から送信可能な相手」に絞り込む（`advice`は既存のロジックを流用、`suggestion`/`report`は新規に同様のロジックを追加）。

## 5. 画面構成

### 5.1 `/tasks/objectives/new`

**Step1**（既存`ObjectiveForm`を流用、変更なし）: 目標名・説明・期限・「目標を作成」ボタン。

**Step2**（作成成功後、同一画面内でクライアント状態を切り替えて表示）:

- 画面上部右寄せに「← 戻る」（`/tasks`へ）
- 画面右寄せに「タスクの作成」ボタン
- クリックでモーダル表示: タスク名・タスク目標（`goal_summary`）・期限・タスク責任者（`EmployeePicker`を流用、候補は`is_manager = true`の従業員のみにフィルタ）→「タスクを登録する」で登録、モーダルを閉じる
- 登録済みタスクをカード一覧表示（ヘッダー: タスク名、本文: タスク目標・責任者名、右寄せ: 編集・削除ボタン）

### 5.2 `/tasks/objectives/[id]`

1. **ヘッダー**: 「🎯 目標名」+「作成者: 氏名」、右に全体進捗リング（既存`ProgressRing`流用）
2. **ステータス分布**: 目標配下全タスクのステータス（未着手/進行中/レビュー/完了/保留）件数をドーナツグラフで表示（新規コンポーネント、Recharts、既存`WorkDistributionChart`のimportパターンを踏襲）
3. **タスクカードグリッド（2列、`md:grid-cols-2`）**: 各カード
   - ヘッダー: 📋 タスク名
   - タスク目標（`goal_summary`）
   - 期限バッジ（既存の緑太字ラベルを流用。期限超過時は赤系に切り替え）
   - メンバー数（アイコン + `role='member'`の人数）
   - タスク責任者名
   - 右寄せ: 編集・削除ボタン（目標責任者 or そのタスクの責任者のみ表示）
   - カード自体のクリックで詳細モーダルを開く（既存`TaskCard`のonOpenパターンを流用）
4. **詳細モーダル**（既存`TaskDetailModal`を拡張）:
   - 基本情報編集セクション（タスク名・目標・期限のインライン編集。目標責任者/タスク責任者のみ表示、それ以外は読み取り専用表示）
   - メンバー管理（組織階層〈division〉で絞り込みできる選択UI。既存`EmployeePicker`/`MultiEmployeePicker`を拡張し、division選択→該当従業員一覧、の2段階フィルタを追加）
   - ステータス変更・進捗スライダー（既存のまま）
   - 工数記録（既存`WorkLogSection`のまま）
   - コメント（既存`CommentThread`を拡張、宛先ルールはセクション4のとおり）
5. **下部**: 責任者・メンバー別の工数分布グラフ（既存`WorkDistributionChart`をタスク横断集計に変更して流用）
6. **下部**: 組織ツリー（目標責任者→タスク責任者→メンバーの階層。既存`OrgTreeCanvas`/`org-tree.ts`のノード構造を、`task_group`単位から`task`単位に組み替える）

既存のマイルストーン一覧・作成フォーム（`MilestoneList`/`MilestoneForm`）はこのページから撤去する（コンポーネント自体は削除せず、未使用として残す。`/tasks/groups/[id]`からの動線は維持）。

## 6. テスト方針

- `permissions.ts`に追加する新しい判定関数（責任者/メンバー判定、`can_send_suggestion`相当のUIロジック）はユニットテスト必須（既存`permissions.test.ts`パターン踏襲）
- `task_assignees`のRLS（responsible制約・is_manager制約・1人制限）はSQLレベルの検証（`SELECT`での事前確認、既存のデータ保護ルールに従う）
- 目標作成時のデフォルトマイルストーン・タスクグループ自動生成は、Server Actionの統合テストで検証
- E2Eはローカル環境の制約（既知の残課題）により静的検証＋コードトレースで代替する方針を踏襲

## 7. オープンクエスチョン

- `/tasks/groups/[id]`（カンバンボード）への導線を今後どう扱うか（当面は残すのみで、新規動線は追加しない）
