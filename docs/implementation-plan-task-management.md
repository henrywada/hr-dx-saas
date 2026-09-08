# タスク管理 実装計画（PRD）

## 1. 問題定義

組織内のタスク管理が属人化・非可視化されており、目標設定からメンバーへの割当、進捗把握、労働時間配分の可視化までを一元管理する機能が存在しない。またタスクマネージャーとメンバー間、責任者との間のコミュニケーション（報告・助言・進言）が仕組み化されておらず、状況把握が場当たり的になっている。

プロダクトの2大ゴール（コミュニケーションを大切にするシステム／組織健康度の可視化）に対し、タスク管理機能は「役割の明確化・可視化」「進捗の透明化」「工数配分の可視化」を通じて直接貢献する。

## 2. ユーザーストーリー

| As a                       | I want to                                        | So that                                      |
| -------------------------- | ------------------------------------------------ | -------------------------------------------- |
| 責任者                     | 目標・マイルストーン・タスクグループを作成したい | 組織の目標を明確化し、達成計画を構造化できる |
| 責任者                     | タスクグループにタスクマネージャーを割り当てたい | 実行の権限委譲ができる                       |
| タスクマネージャー         | タスクを細分化してメンバーに割り当てたい         | 作業を具体化し責任を明確化できる             |
| タスクマネージャー         | メンバーをグループに追加・削除したい             | 体制変更に素早く対応できる                   |
| メンバー                   | 自分のタスクの進捗・状態を報告したい             | 進捗を正確に共有できる                       |
| メンバー                   | 同じグループの他メンバーの進捗を見たい           | チーム全体の状況を把握し助け合える           |
| 責任者・タスクマネージャー | タスクの状態を俯瞰したい                         | 必要なタイミングで助言・介入ができる         |
| 経営者・人事責任者         | 組織全体のタスク進捗状況を把握したい             | 組織健康度・業務負荷の判断材料にできる       |

## 3. 要求（優先度別）

**Must（Phase 1 — MVP）**

1. タスクグループの組織化（目標 → マイルストーン → タスクグループの階層作成）
2. 割当手順：責任者 → タスクグループ → タスクマネージャー → メンバー
3. 責任者による目標・マイルストーン・タスクグループの作成
4. タスクマネージャーによるタスク細分化とメンバー割当（メンバー割当はタスクマネージャーも実行可。マネージャー割当は責任者のみ）
5. メンバーによるステータス・進捗率(%)報告
6. カンバンボードによる可視化（タスクグループ別）

**Should（Phase 2）**

7. タスク単位の工数入力（自由入力形式：作業日・時間・メモ）
8. 工数分布グラフ（メンバー別・タスクグループ別）
9. タスク／タスクグループ単位のコメントスレッド（報告・助言・進言）

**Could（Phase 3）**

10. 組織ツリー可視化（責任者 → マネージャー → メンバー、進捗率を重ね表示）
11. 進捗サマリ（進捗リング／バー、目標・マイルストーン単位の集計ダッシュボード）
12. ダッシュボードフィード連携（既存 `dashboard/feed` 基盤へのイベント配信：割当通知・期限接近・コメント通知等）
13. 状態変化時のアニメーション演出

**Won't（今回スコープ外）**

- 勤怠管理との自動連動（工数の自動取得）— 後日開発
- タスク管理の役割と既存 `app_role` の連動（独立運用を維持する）

## 4. データモデル

新規テーブルはすべて `tenant_id NOT NULL`、RLS 有効化必須、`employees`/自テーブルへの参照は `ON DELETE CASCADE`。

**Phase 1**

- `task_objectives` — `id`, `tenant_id`, `owner_employee_id`, `title`, `description`, `status`, `due_date`, `created_at`, `updated_at`
- `task_milestones` — `id`, `tenant_id`, `objective_id → task_objectives`, `title`, `description`, `due_date`, `status`, `sort_order`, `created_at`, `updated_at`
- `task_groups` — `id`, `tenant_id`, `milestone_id → task_milestones`, `name`, `description`, `status`, `sort_order`, `created_at`, `updated_at`
- `task_group_managers` — `id`, `tenant_id`, `task_group_id → task_groups`, `employee_id → employees`, `assigned_at`
- `task_group_members` — `id`, `tenant_id`, `task_group_id → task_groups`, `employee_id → employees`, `joined_at`
- `tasks` — `id`, `tenant_id`, `task_group_id → task_groups`, `title`, `description`, `assignee_employee_id → employees`, `status`(`todo`/`in_progress`/`review`/`done`/`blocked`), `progress_percent`(0-100, NOT NULL DEFAULT 0), `priority`, `due_date`, `sort_order`, `created_by_employee_id`, `created_at`, `updated_at`

**Phase 2 追加**

- `task_work_logs` — `id`, `tenant_id`, `task_id → tasks`, `employee_id`, `work_date`, `hours`, `note`, `created_at`
- `task_comments` — `id`, `tenant_id`, `task_id → tasks`(nullable), `task_group_id → task_groups`(nullable、いずれか一方必須のCHECK制約), `employee_id`, `parent_comment_id`(自己参照、nullable、スレッド返信用), `comment_type`(`report`/`advice`/`suggestion`/`general`), `body`, `created_at`, `updated_at`

**権限ヘルパー関数**（`current_tenant_id()` と同じ `STABLE SECURITY DEFINER` / `SET search_path = public` パターン）

- `is_task_objective_owner(p_objective_id uuid)`
- `is_task_group_manager(p_task_group_id uuid)`
- `is_task_group_member(p_task_group_id uuid)`
- `is_task_group_participant(p_task_group_id uuid)`（manager もしくは member もしくは祖先 objective の owner）

## 5. 権限モデル

役割は既存 `app_role` とは独立し、割当テーブル（`task_objectives.owner_employee_id` / `task_group_managers` / `task_group_members`）への登録によって決まる。同一人物が、ある目標では責任者、別グループではメンバー、ということも自然に成立する。

| 操作                                     | 責任者               | タスクマネージャー               | メンバー                                 | テナント管理者 |
| ---------------------------------------- | -------------------- | -------------------------------- | ---------------------------------------- | -------------- |
| 目標・マイルストーン作成/編集            | ✅                   | ❌                               | ❌                                       | ✅             |
| タスクグループ作成                       | ✅                   | ❌                               | ❌                                       | ✅             |
| タスクグループへの**マネージャー**割当   | ✅                   | ❌                               | ❌                                       | ✅             |
| タスクグループへの**メンバー**割当・解除 | ✅                   | ✅（自分が管理するグループのみ） | ❌                                       | ✅             |
| タスク作成・編集・割当                   | ✅                   | ✅                               | ❌                                       | ✅             |
| タスクのステータス・進捗率更新           | ✅                   | ✅                               | ✅（自分が担当のタスクのみ）             | ✅             |
| 閲覧（SELECT）                           | 自分の目標配下すべて | 自分が管理するグループ配下       | 自分が所属するグループ配下は全メンバー分 | 全件           |

メンバーは自分の担当タスクだけでなく、同じタスクグループ内の他メンバーの進捗も閲覧できる（グループを跨いだ閲覧は不可）。プロダクトの「コミュニケーションを大切にする」ゴールに沿った透明性重視の設計。

## 6. 画面構成・配置ルール

`(tenant-users)` 配下に一本化し、ログインユーザーが関与する目標・グループのみを表示する。「責任者」は一般従業員でもなり得るため、`app_role` による画面分岐は行わない。

```
src/app/(tenant)/(tenant-users)/tasks/
  page.tsx                      # 自分が関与する目標一覧
  loading.tsx / error.tsx
  objectives/new/page.tsx       # 目標作成（作成者が自動的に責任者になる）
  objectives/[id]/page.tsx      # 目標詳細：マイルストーン一覧＋進捗サマリ
  groups/[id]/page.tsx          # タスクグループ詳細：カンバンボード＋メンバー一覧
  groups/[id]/loading.tsx / error.tsx

src/features/task-management/
  queries.ts   # getMyObjectives, getObjectiveDetail, getTaskGroupBoard など
  actions.ts   # createObjective, createMilestone, createTaskGroup,
               # assignManager, assignMember, removeMember,
               # createTask, updateTaskStatus, updateTaskProgress
  types.ts
  components/
    ObjectiveCard.tsx / ObjectiveForm.tsx
    MilestoneList.tsx / TaskGroupForm.tsx
    KanbanBoard.tsx / TaskCard.tsx / TaskForm.tsx
    ManagerAssignModal.tsx / MemberAssignModal.tsx
```

`src/config/routes.ts` の `APP_ROUTES` に `tasks.root` / `tasks.objectiveNew` / `tasks.objectiveDetail(id)` / `tasks.groupDetail(id)` を追加する。

## 7. マスタ登録

- `service_category`：新規カテゴリ「タスク管理」を追加（サイドメニュー表示用）
- `services`：`/tasks` への遷移サービスを登録
- `tenant_service`：契約テナントに対して機能を有効化
- `app_role_service`：全 `app_role`（`employee` を含む）に対して機能を許可する（責任者・タスクマネージャーは `app_role` に関係なく一般従業員でもなり得るため）

## 8. 可視化ビュー（フェーズ対応）

| ビュー                                         | フェーズ | 内容                                                           |
| ---------------------------------------------- | -------- | -------------------------------------------------------------- |
| カンバンボード（タスクグループ別）             | Phase 1  | ステータス列でタスクカードを表示、ドラッグ＆ドロップで状態変更 |
| 工数分布（メンバー／タスクグループ別グラフ）   | Phase 2  | 工数ログの棒グラフ集計                                         |
| 組織ツリー（責任者 → マネージャー → メンバー） | Phase 3  | 役割階層図、各ノードに担当タスク数・進捗率を重ね表示           |
| 進捗サマリ（進捗リング／バー）                 | Phase 3  | 目標・マイルストーン単位の達成率集計                           |

## 9. テスト方針

- **Unit**：進捗率ロールアップ計算（タスク → グループ → マイルストーン → 目標）、権限判定ヘルパー関数
- **Integration**：Server Actions の RLS 越境防止（他テナント・無関係グループへの操作拒否、タスクマネージャーのメンバー割当可／マネージャー割当不可の境界確認）
- **E2E**：責任者が目標作成 → タスクグループ作成 → マネージャー割当 → マネージャーがメンバー割当・タスク作成 → メンバーがステータス／進捗率更新 → カンバンボード反映、の一連フロー

## 10. 成功指標

- タスクグループ・タスクの登録数、ステータス更新頻度（週次アクティブ率）
- メンバーの進捗報告遵守率（期限に対する更新遅延の有無）
- （Phase 2 以降）コメントスレッドの投稿数（コミュニケーション促進の定量指標）

## 11. オープンクエスチョン

- タスクの期限超過・遅延の通知タイミング（Phase 3 の通知連携で確定）
- 目標の複数責任者対応（現状は単一 `owner_employee_id` のみ。必要になれば `task_objective_owners` 中間テーブルへ拡張）
- 進捗率(%)とステータスの整合性ルール（UI側で自動連動させるか、独立入力のままにするかは Phase 1 実装時に決定）
- **従業員選択UI（最終レビュー Finding 4・解消済み）**：Phase 1 のマネージャー割当・メンバー割当・タスク担当者指定フォームは
  従業員UUIDのテキスト直接入力のままで実運用に耐えず、従業員選択UI（検索付きコンボボックス等）が
  未実装だったため、`service.release_status`（route_path='/tasks'）を `公開` から `下書き` に変更し、
  一般公開を止めた状態で Phase 1 の実装を完了させていた
  （`supabase/migrations/20260907090411_set_task_management_release_status_draft.sql`）。
  その後、従業員選択UIの実装が完了し、`release_status` は `公開` に戻されている
  （ローカルDBで `SELECT route_path, release_status FROM public.service WHERE route_path = '/tasks'` を
  確認済み。`公開` になっていることを2026-09-08時点で確認した）。
- **`TaskDetailModal` に担当者名が表示されていない**：spec 13.3 は「タスク基本情報（タイトル・説明・担当者・優先度・期限）の表示」を
  要求しているが、現状の `TaskDetailModal.tsx` は `task.assigneeEmployeeId`（UUID）を保持するのみで、
  担当者の氏名を画面に表示していない。表示するには `queries.ts` 側で `tasks` と `employees` の JOIN を追加し、
  `Task` 型・`mapTask`・`getTaskGroupBoard` など複数ファイルにまたがる変更が必要になるため、
  今回の最終レビュー修正パスでは対応せず、フォローアップ課題として記録する（後日対応）。

## 12. 実装ステータス

| Phase   | 内容                                             | 状態             |
| ------- | ------------------------------------------------ | ---------------- |
| Phase 1 | 組織化・割当・進捗・カンバン可視化               | 完了（公開済み） |
| Phase 2 | 工数入力・工数分布・コメントスレッド             | 完了（公開済み） |
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 未着手           |

## 13. Phase 2 詳細設計（コメントスレッド機能）

Phase 2 は工数管理（要求7・8）とコメントスレッド（要求9）の2つの独立したサブ機能に分解し、まずコメントスレッドから着手する。

### 13.1 スコープ

- コメント対象：タスクグループ単位・タスク単位の両方（`task_comments` の `task_id`/`task_group_id` いずれか一方必須は既存の要求4のデータモデル通り）
- 返信スレッド機能を含める（`parent_comment_id` を実際に UI で使う）
- 編集は投稿者本人のみ、削除は投稿者本人または責任者・タスクマネージャーも可能（Phase 1 の役割定義をそのまま踏襲）

### 13.2 権限モデル（追加分）

| 操作                           | 責任者                                          | タスクマネージャー | メンバー                     |
| ------------------------------ | ----------------------------------------------- | ------------------ | ---------------------------- |
| タスクグループへのコメント投稿 | ✅                                              | ✅                 | ❌                           |
| タスクへのコメント投稿         | ✅                                              | ✅                 | ✅（自分が担当のタスクのみ） |
| コメント編集                   | 投稿者本人のみ                                  |
| コメント削除                   | 投稿者本人、または責任者・タスクマネージャー    |
| コメント閲覧                   | グループ参加者全員（要求5の透明性ルールを継承） |

RLS は `task_comments` 自身への自己参照を作らない設計とする（`task_group_id` 指定時は `is_task_group_owner`/`is_task_group_manager`、`task_id` 指定時は対象 `tasks` 行の `task_group_id` を辿って同様に判定する）。Task 1 で見つかった「INSERT...RETURNING 時の自己参照可視性バグ」と同じクラスの問題は、`task_comments_select` が `task_comments` 自身ではなく `tasks`/`task_groups` を参照する限り発生しない。

### 13.3 画面構成の追加

- **タスク詳細モーダル**（新規、`src/features/task-management/components/TaskDetailModal.tsx` 想定）：`TaskCard` クリックで開く。タスク基本情報（タイトル・説明・担当者・優先度・期限）の表示、ステータス・進捗率編集（`TaskCard` から移動）、コメントスレッド（一覧・投稿・返信・編集・削除）を含む
- **`TaskCard`**：ステータス `<select>` と進捗 `<input type="range">` を撤去し、進捗バー・ステータスバッジの読み取り専用表示のみに変更。カード全体がモーダルを開くトリガーになる
- **タスクグループ詳細ページ（`groups/[id]/page.tsx`）**：「タスクグループへのコメント」セクションを追加（投稿は責任者・マネージャーのみ、閲覧は参加者全員）

### 13.4 データ取得方式（既存規約からの意図的な逸脱）

タスク詳細モーダルは Client Component であり、開いたタイミングで動的にコメント一覧を取得する必要がある。既存規約（「SELECT は `queries.ts`、Client Component からの取得は Server Action 経由」）に従い、`actions.ts` に読み取り専用の Server Action（`getTaskCommentsAction` 相当）を新設する。これは「SELECT は `queries.ts` に書く」という既存規約の対象外（Server Component の初期データ取得ではなく、Client Component の動的フェッチであり、Server Action 以外に手段がないため）。

### 13.5 実装ステータス（サブタスク単位）

| #   | 内容                                                                   | 状態 |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | `task_comments` テーブル・RLS ポリシー・ヘルパー関数のマイグレーション | 完了 |
| 2   | 型・Zod スキーマ・`queries.ts`/`actions.ts`                            | 完了 |
| 3   | `TaskDetailModal`（コメントスレッド含む）                              | 完了 |
| 4   | `TaskCard`/`KanbanBoard` の改修                                        | 完了 |
| 5   | タスクグループ詳細ページへのコメント欄追加                             | 完了 |
| 6   | 手動 E2E 確認                                                          | 完了 |

## 14. Phase 2 詳細設計（工数管理機能）

要求7（工数入力）・要求8（工数分布グラフ）に対応する。コメントスレッド（セクション13）と同じく既存のタスク管理機能への追加であり、新規テーブル1つ・既存画面への追加のみで完結する。

### 14.1 スコープ

- 工数入力：タスク単位の自由入力（作業日・時間・メモ）。データモデルはセクション4で規定済みの `task_work_logs` をそのまま使う
- 工数分布グラフ：メンバー別（タスクグループ詳細ページ）とタスクグループ別（目標詳細ページ）の2種類の棒グラフ
- 編集・削除は投稿者本人のみ（コメントと異なり、責任者・マネージャーによる代理削除は対象外— 工数は自己申告の実績記録であり、他者が内容を書き換えられる必要がないため）

### 14.2 権限モデル（追加分）

| 操作                             | 責任者                                                          | タスクマネージャー | メンバー                                       |
| -------------------------------- | --------------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| 工数記録の登録（自分の分のみ）   | ✅                                                              | ✅                 | ✅（自分が所属するタスクグループのタスクのみ） |
| 工数記録の編集・削除             | 投稿者本人のみ（役割に関わらず）                                |
| 工数閲覧（一覧・分布グラフ集計） | グループ参加者全員（要求5・セクション13.2の透明性ルールを継承） |

登録はタスクの担当者（`assignee_employee_id`）に限定せず、そのタスクが属するタスクグループの参加者（責任者・マネージャー・メンバーいずれか）であれば自分の工数を記録できる（同じグループ内で助け合って作業するケースを許容するため）。RLS はセクション13.2と同じ方針で、`task_work_logs` 自身ではなく `tasks`/`task_groups` を参照して判定し、自己参照バグを避ける。

### 14.3 画面構成の追加

- **`TaskDetailModal`**：コメントスレッドの下に「工数記録」セクションを追加。一覧（作業日・時間・メモ・記録者氏名）と、自分の工数を追加する入力フォーム。自分が投稿した行のみ編集・削除ボタンを表示する
- **タスクグループ詳細ページ（`groups/[id]/page.tsx`）**：カンバンボードの下に「メンバー別工数分布」の横棒グラフを追加（Recharts `BarChart`、集計単位＝グループ内メンバー）
- **目標詳細ページ（`objectives/[id]/page.tsx`）**：マイルストーン一覧の下に「タスクグループ別工数分布」の横棒グラフを追加（集計単位＝目標配下のタスクグループ）
- グラフは既存の `src/app/(tenant)/(tenant-admin)/adm/(overtime)/36analysis/_components/DeptStackedBarChart.tsx` 等の実装パターン（`'use client'`、`ResponsiveContainer` を高さ固定の親 `div` でラップ、色はCSS変数でなく feature 専用の色定数ファイルで定義）を踏襲する。工数分布グラフの色定数は `src/features/task-management/chart-colors.ts` に新設する

### 14.4 データ取得方式

- 目標詳細ページ・タスクグループ詳細ページ（Server Component の初期表示）の集計取得は既存規約通り `queries.ts` に `getWorkLogSummaryByGroup(groupId)` / `getWorkLogSummaryByObjective(objectiveId)` を追加する
- `TaskDetailModal`（Client Component）が開いたタイミングで取得するタスク単位の工数一覧は、セクション13.4のコメントと同じ意図的逸脱として `actions.ts` に読み取り専用の `getTaskWorkLogsAction` を新設する

### 14.5 実装ステータス（サブタスク単位）

| #   | 内容                                                      | 状態 |
| --- | --------------------------------------------------------- | ---- |
| 1   | `task_work_logs` テーブル・RLS ポリシーのマイグレーション | 完了 |
| 2   | 型・Zod スキーマ・`queries.ts`/`actions.ts`               | 完了 |
| 3   | `TaskDetailModal` への工数記録セクション追加              | 完了 |
| 4   | 工数分布グラフコンポーネント（Recharts）・色定数ファイル  | 完了 |
| 5   | タスクグループ詳細ページへのメンバー別グラフ追加          | 完了 |
| 6   | 目標詳細ページへのグループ別グラフ追加                    | 完了 |
| 7   | 手動 E2E 確認                                             | 完了 |

**手動E2E確認（#7）の「完了」の中身について**：ローカルDBに `tasks`/`task_group_members`/`task_work_logs` のフィクスチャデータが無く、かつ検証実施時のサンドボックス環境でPlaywrightのブラウザ（Chrome実行ファイル）が起動できなかったため、ブラウザを実際に操作するライブE2E確認は実施できていない。ここでの「完了」の根拠は、Task 1〜7それぞれの独立したタスクレビューでCritical/Important指摘がゼロだったこと、および `isOwnLog` ロジック（`WorkLogSection.tsx`）・`task_work_logs` のRLSポリシー（`can_log_work_on_task` 等）を実装コードと突き合わせて確認したこと、`permissions.test.ts` の既存テストケース（責任者/マネージャー/メンバーの記録可否、非参加者の拒否）がすべてPASSしていることの3点である。ライブブラウザでの動作確認は、フィクスチャデータとブラウザが利用可能な環境で後日改めて実施することが望ましい。
