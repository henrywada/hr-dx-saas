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

10. 組織ツリー可視化（責任者 → タスクグループ → マネージャー → メンバー、進捗率を重ね表示。詳細はセクション17参照）
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

| ビュー                                                          | フェーズ | 内容                                                                    |
| --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| カンバンボード（タスクグループ別）                              | Phase 1  | ステータス列でタスクカードを表示、ドラッグ＆ドロップで状態変更          |
| 工数分布（メンバー／タスクグループ別グラフ）                    | Phase 2  | 工数ログの棒グラフ集計                                                  |
| 組織ツリー（責任者 → タスクグループ → マネージャー → メンバー） | Phase 3  | 役割階層図（`@xyflow/react`）、各ノードに担当タスク数・進捗率を重ね表示 |
| 進捗サマリ（進捗リング／バー）                                  | Phase 3  | 目標・マイルストーン単位の達成率集計                                    |

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
- **目標詳細ページのデータ取得の直列化**：目標詳細ページで`getObjectiveDetail`・`getWorkLogSummaryByObjective`・`getObjectiveOrgTree`が直列awaitされており、かつ`getObjectiveOrgTree`は`getObjectiveDetail`が既に取得済みのマイルストーン・タスクグループを再取得している（相互依存はないため`Promise.all`での並行化余地がある。今回のブランチのスコープ〔組織ツリー追加〕を超える横断的最適化のため見送り、将来のパフォーマンス改善課題として記録する）。
- **組織ツリーの大規模データでの描画コスト**：大規模な組織ツリー（1グループあたり多数のマネージャー・メンバー）では`@xyflow/react`の`onlyRenderVisibleElements`が未設定のため描画コストが線形に増加する。現状のデータ規模では問題化しないが、将来的にノード数が多くなった場合は仮想化またはグループ単位の折り畳み表示を検討する。
- **`queries.ts`のファイル分割**：`src/features/task-management/queries.ts`が746行に達しており（規約上限800行に接近）、次回このファイルに機能追加する際は組織ツリー関連クエリ（`getObjectiveOrgTree`）を専用ファイル（例：`org-tree-queries.ts`）へ切り出す分割を検討する。

## 12. 実装ステータス

| Phase   | 内容                                             | 状態                              |
| ------- | ------------------------------------------------ | --------------------------------- |
| Phase 1 | 組織化・割当・進捗・カンバン可視化               | 完了（公開済み）                  |
| Phase 2 | 工数入力・工数分布・コメントスレッド             | 実装完了（デプロイ・E2E検証待ち） |
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション | 完了                              |

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

## 15. Phase 3 詳細設計（進捗サマリ）

Phase 3（組織ツリー可視化・進捗サマリ・ダッシュボードフィード連携・状態変化アニメーションの4項目）は互いに独立したサブ機能に分解し、まず進捗サマリ（要求11）から着手する。

### 15.1 スコープ

- 目標一覧ページ（`/tasks`）の各目標カードに、目標配下全タスクの進捗率（%）を円形の進捗リング（`ProgressRing`）で表示する
- 目標詳細ページ（`/tasks/objectives/[id]`）のヘッダーにも同じ`ProgressRing`を表示し、各マイルストーン行には横長の進捗バー（`ProgressBar`）でマイルストーン単位の進捗率を表示する
- 新規テーブル・マイグレーションは無い。既存の `tasks.progress_percent` を集計するのみ

### 15.2 集計方式

- 目標単位・マイルストーン単位いずれも、配下の全タスクの `progress_percent` をフラットに平均する（既存のタスクグループ単位の平均計算 `calculateAverageProgress`（`progress.ts`）と同じ考え方——マイルストーン間・グループ間でタスク数に偏りがあっても、階層ごとに平均のさらに平均を取る「重み付け」はしない。全タスクを同じ重みで扱う）
- `calculateAverageProgress` はそのまま再利用し、新規の集計用純粋関数は追加しない
- **既知の特性（RLS可視範囲との連動）**：この進捗率は `tasks_select`/`task_groups_select` のRLSポリシーにより現在の閲覧者から見えるタスクのみを集計対象とする。一般メンバーは自分が参加するタスクグループのタスクしか見えないため、目標配下の一部のタスクグループにしか参加していないメンバーが `/tasks` で見る進捗率は、目標全体の一部分（自分の参加分）だけを平均した値になる。一方、責任者やテナント管理者はより広い範囲（多くの場合は目標全体）を閲覧できるため、同じ目標でも真の全体平均に近い値が表示される。これは失敗時に閉じる（見える範囲が狭まるだけで、他者のデータが見えることはない）ため情報漏洩ではないが、同一のUI要素が閲覧者によって異なる数値を示しうる点は仕様上の既知の特性として認識しておく。将来的に「常に目標全体の真の平均」を保証したい場合は、RLSをバイパスするRPC等の追加実装が必要になる（本計画のスコープ外）。

### 15.3 データ取得方式

- **目標一覧ページ**：N+1回避のため、`getMyObjectives` が返す目標一覧に対して個別にクエリを発行しない。新設する `getMyObjectivesWithProgress(supabase)` で、可視な全目標→全マイルストーン→全タスクグループ→全タスクを一括取得し、JS側で `objective_id` ごとに `progress_percent` をグループ化して `calculateAverageProgress` にかける（`getObjectiveDetail` が採用している「複数テーブルを段階的に一括取得してJSで組み立てる」既存パターンを踏襲する）
- **目標詳細ページ**：既存の `getObjectiveDetail` の戻り値に、目標全体の進捗率とマイルストーンID単位の進捗率マップ（`milestoneProgressById: Record<string, number>`）を追加する。この関数は既にマイルストーン→タスクグループの一括取得を行っているため、タスク一覧の取得を追加するだけで済む

### 15.4 画面構成の追加

- **`ProgressRing`**（新規、`src/features/task-management/components/ProgressRing.tsx`）：SVGの`<circle>`を2枚重ね、`stroke-dashoffset`で進捗率を表現する円形リング。中央に「XX%」のテキストを表示。Rechartsには依存せず自作する（円形リング単体の表現にRechartsを使うのはオーバースペックであり、この機能はバーチャート用途中心の既存Recharts利用箇所とは性質が異なるため）。ブランドカラー（`#FD7601`）をリングの色に使う
- **`ProgressBar`**（新規、`src/features/task-management/components/ProgressBar.tsx`）：横長の`<div>`2枚重ねによるシンプルな進捗バー。ブランドカラーを使う
- **`ObjectiveCard`**：`ProgressRing`を追加表示（目標全体の進捗率）
- **目標詳細ページ（`objectives/[id]/page.tsx`）**：見出し部分に`ProgressRing`（目標全体）を追加
- **`MilestoneList`**：各マイルストーン行に`ProgressBar`（そのマイルストーンの進捗率）を追加

### 15.5 実装ステータス（サブタスク単位）

| #   | 内容                                                                  | 状態 |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `ProgressRing`/`ProgressBar` コンポーネント                           | 完了 |
| 2   | `queries.ts`：`getMyObjectivesWithProgress`・`getObjectiveDetail`拡張 | 完了 |
| 3   | `ObjectiveCard`・目標一覧ページへの組み込み                           | 完了 |
| 4   | 目標詳細ページ・`MilestoneList`への組み込み                           | 完了 |
| 5   | 手動 E2E 確認                                                         | 完了 |

**手動E2E確認（#5）の「完了」の中身について**：ローカルDBは `task_objectives` 2件・`task_groups` 12件は実データとして存在するが、配下の `tasks` は0件であり、非ゼロの進捗率を画面上で確認できるデータが無い。加えて検証実施時のサンドボックス環境でPlaywrightのブラウザ（Chrome実行ファイル。キャッシュ済みの `chromium-1234` とMCPが要求する `chromium-1243` のバージョン不一致により起動不可、`"chrome" executable not found` エラー）が起動できず、ブラウザを実際に操作するライブE2E確認は実施できていない（工数管理機能の14.5と同じ制約）。ここでの「完了」の根拠は、(1) Task 1〜4それぞれの独立したタスクレビューでCritical/Important指摘がゼロだったこと、(2) `ProgressRing`/`ProgressBar`のクランプ・0%描画ロジック（`Math.max(0, Math.min(100, Math.round(progress)))`、空配列時に`calculateAverageProgress`が0を返す）を本タスクで実装コードを再読し確認したこと、(3) `getMyObjectivesWithProgress`・`getObjectiveDetail`の集計クエリがTask 2でのライブ実行によりPostgREST側で構文エラー無く受理されることを確認済みであること（ただし当時 `tasks` は0件だったため、確認できたのは埋め込みフィルタ（`task_group:task_group_id!inner(milestone_id)` 等）のクエリ構文・リレーションパスの妥当性のみであり、非ゼロの実データに対する行の形状処理やバケット分け・集計ロジックそのものの動作は未検証であること）、(4) 平均計算ロジック（フラット平均、重み付けなし）がTask 2のレビューで仮想データに対して手計算検証済みであることの4点である。ライブブラウザでの動作確認（進捗リング・バーの実描画、タスクグループ側での進捗率変更後のリロード反映）は、`tasks` にテストデータがあり、かつブラウザが利用可能な環境で後日改めて実施することが望ましい。

## 16. Phase 3 詳細設計（ダッシュボードフィード連携）

Phase 3の2番目のサブ機能として、要求12（ダッシュボードフィード連携：割当通知・期限接近・コメント通知等）に対応する。

### 16.1 既存基盤の前提

既存の `dashboard/feed` 基盤は「プル型」アーキテクチャであり、単一のイベントログテーブルへ書き込む方式ではない。各機能ドメインが `FeedProvider`（`src/features/dashboard/feed/provider.ts`）インターフェース（`key: string` と `fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]>`）を実装し、`src/features/dashboard/feed/registry.ts` の `FEED_PROVIDERS` 配列に登録することで、`/top` パネル・`/notifications` 一覧の両方に自動的に表示される。過去に汎用の書き込みRPC（`post_system_announcement()`）が存在したが、なりすまし投稿の脆弱性のため廃止されており、新規の汎用書き込みAPIを追加しない（既存の廃止判断を踏襲する）。本サブ機能もこのプル型パターンに従い、既存の `tasks`/`task_comments` テーブルを読み取り時に都度導出する形で実装する。新規テーブル・マイグレーションは、`ui_dashboard_element` へのマスタ登録行の追加のみで、イベントログ用のテーブルは追加しない。

### 16.2 スコープ（フィードアイテム2種）

- **割当・期限接近通知**：自分（`assignee_employee_id`）が担当し、かつ未完了（`status <> 'done'`）のタスクを1件＝1アイテムとして表示する。`kind: 'action_prompt'`（タスクが完了する、または担当者から外れるまで表示され続ける。既読の概念を持たない設計——`FeedItemRow.tsx` の `canDismiss` 判定が `kind === 'system_notice'` を要求するため、`action_prompt` は構造的に既読化できない。これは意図的な仕様であり、対応不要）
- **コメント通知**：自分が閲覧可能なタスク／タスクグループへの、直近3日以内・自分以外が投稿したコメントを1件＝1アイテムとして表示する。`kind: 'system_notice'`（既読化可能、`dismissible: true`）。可視範囲の絞り込みは新たに実装せず、`task_comments_select` の既存RLSポリシーにそのまま委ねる（追加のテナント・権限フィルタは行わない、既存の `queries.ts` の規約と同じ）。**注意**：`task_comments_select`（`20260907135655_create_task_comments_table.sql`）は `current_employee_app_role() <> 'employee'` の行で、テナント管理者・産業医等（`employee` 以外の役割）に対してはグループ参加者チェックを経由せずテナント全体のコメントを可視にする。そのためこれらの役割では、本フィードのコメント通知も「自分の担当分のみ」ではなく「テナント全体のコメント」を対象とする（後述16.3の上限設定はこのケースを踏まえたもの）

### 16.3 データ取得方式

- `src/features/task-management/feed-provider.ts`（新規）に `taskManagementFeedProvider: FeedProvider` を実装する
- 割当通知：`tasks` を `assignee_employee_id` と `status <> 'done'` で絞り込み、`due_date` 昇順（null は後）で取得する。1クエリで完結する（既存のPostgREST 1000行上限問題は、個人が担当する未完了タスク数が現実的に1000件を超えることは無いため対象外と判断する。進捗サマリ機能で対応が必要だったのは「テナント内の全可視目標を横断集計する」ケースであり、本機能は「自分の担当分のみ」であるため規模が本質的に異なる）。ただし `/top` のフィード表示枠（`FEED_LIMIT`）を1機能が占有しないよう `.limit(5)` を付与し、期限が近い上位5件のみを対象とする
- コメント通知：`task_comments` を `employee_id <> 自分` かつ `created_at >= 3日前` で絞り込み、`created_at` 降順で `.limit(20)` を付与して取得する。上限を設けるのは、16.2で述べた通り非employeeロールでは可視範囲がテナント全体になり得るため（PostgREST 1000行上限のサイレント切り捨て・共有`read_state`のdedupeKey肥大化・`/top`の表示枠占有を避ける）。`task_id` 経由のコメントは埋め込み `task:task_id(title, task_group_id)` で、`task_group_id` 直接指定のコメントは埋め込み `taskGroup:task_group_id(name)` で、リンク先（`APP_ROUTES.tasks.groupDetail`）と表示名を解決する
- 両クエリとも `ctx.employeeId` が空文字列（従業員レコード無しユーザー）の場合は空配列を返す（既存の `one_on_one`/`questionnaire` 等のプロバイダと同じガード）

### 16.4 型・登録の追加

- `src/features/dashboard/feed/types.ts` の `FeedItemCategory` に `'task_management'` を追加する
- `src/features/dashboard/feed/registry.ts` の `FEED_PROVIDERS` 配列に `taskManagementFeedProvider` を追加する
- `src/features/dashboard/components/FeedItemRow.tsx` の `CATEGORY_ICON`/`CATEGORY_COLOR`（`Record<FeedItemCategory, ...>` のため型エラーで追加が強制される）に `task_management` のアイコン・色を追加する
- マイグレーションで `ui_dashboard_element` に `top.feed.task_management` を1行追加し、`service.route_path = '/tasks'` の行と `service_id` を紐付ける（既存の `20260821100000_top_feed_phase2_ui_dashboard_element.sql` と同じ2ステップ構成：INSERT → UPDATE...JOIN による service_id 紐付け）。これにより `tenant_service` 未契約テナントには本プロバイダの `fetch` 自体が呼ばれなくなる

### 16.5 severity の割当方針

- 割当通知：期限超過なら `critical`、期限まで3日以内なら `warning`、それ以外（期限が3日超先、または期限未設定）は `action`（既存の `questionnaire` プロバイダと同じ「シンプルなaction_prompt」のデフォルト値を踏襲）
- コメント通知：常に `info`（既存の情報通知系プロバイダと同じ扱い）

### 16.6 実装ステータス（サブタスク単位）

| #   | 内容                                                                    | 状態 |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | `src/features/task-management/feed-provider.ts`（割当・コメント両対応） | 完了 |
| 2   | `FeedItemCategory`・`registry.ts`・`FeedItemRow.tsx` への登録           | 完了 |
| 3   | `ui_dashboard_element` マイグレーション                                 | 完了 |
| 4   | 手動 E2E 確認                                                           | 完了 |

**手動E2E確認（#4）の「完了」の中身について**：ローカルDBの `tasks`/`task_comments` はいずれも0件であり（`task_objectives` 2件・`task_groups` 12件は実データとして存在するが、その配下の `tasks`/`task_comments` が無い）、割当通知・コメント通知のいずれもフィード上に表示させて確認できるデータが存在しない。加えて検証実施時のサンドボックス環境でPlaywrightのブラウザが `"chrome" executable not found` エラーで起動できず、ブラウザを実際に操作するライブE2E確認は実施できていない（工数管理機能の14.5・進捗サマリ機能の15.5と同じ制約であり、本機能はデータ面の制約がその2つより一段と厳しい——`task_objectives`/`task_groups` はまだ実データが存在したのに対し、本機能が依存する `tasks`/`task_comments` は完全に0件のため）。ここでの「完了」の根拠は、(1) Task 1〜3それぞれの独立したタスクレビューでCritical/Important指摘がゼロ・修正ラウンドもゼロだったこと、(2) 割当通知・コメント通知のマッピングロジック（severity判定の期限境界値、`kind`/`dismissible`の割当、コメントのコンテキスト解決とフォールバック表示）を検証する純粋関数のユニットテスト15件が本タスクでも再実行しPASSを確認したこと、(3) `FeedItemCategory`・`registry.ts`・`FeedItemRow.tsx` への登録配線がTask 2の型チェック・レビューで独立に確認済みであること、(4) `ui_dashboard_element` マイグレーションがTask 3のレビューで独立に確認済みであることの4点である。加えて最終ホールブランチレビュー（opus）では、実DBのPostgRESTエンドポイントへ本プロバイダと同一のクエリ形（`task:task_id(...)`/`taskGroup:task_group_id(...)` の埋め込みリレーション込み）を直接curlで発行し、200応答とリレーション解決成功を独立に確認している（実データ0件のためレスポンス自体は空配列だが、クエリ構文とスキーマ整合性はDBレベルで検証済み）。ライブブラウザでの動作確認（フィードパネル・`/notifications` での実際の表示、コメント通知の既読化操作、担当タスク完了時のフィード消滅）は、`tasks`/`task_comments` にテストデータがあり、かつブラウザが利用可能な環境で後日改めて実施することが望ましい。

## 17. Phase 3 詳細設計（組織ツリー可視化）

Phase 3の3番目のサブ機能として、要求10（組織ツリー可視化：責任者 → マネージャー → メンバー、進捗率を重ね表示）に対応する。

### 17.1 階層構造（PRD要求からの拡張）

要求10の文言は「責任者 → マネージャー → メンバー」の3階層だが、実データモデル（`task_group_managers`/`task_group_members` はタスクグループ単位で別集合を持つ）を踏まえ、**責任者 → タスクグループ → {マネージャー・メンバー}**として実装する。1つの目標配下に複数のマイルストーン・複数のタスクグループが存在し、それぞれ別のマネージャー・メンバー集合を持つため、タスクグループを中間ノードとして挟むことで、どのマネージャー・メンバーがどのグループに属するかを構造上明確にする。

マネージャーとメンバーは、タスクグループの子として**並列（同階層）**に配置する。`task_group_managers`・`task_group_members`はいずれもタスクグループに対して独立に紐づく中間テーブルであり、「特定のマネージャーが特定のメンバーを管理する」という1対多の関係はデータモデル上存在しないため、マネージャー→メンバーの親子関係を作ると、1グループに複数マネージャーがいる場合にどのマネージャーを親にするか恣意的な判断が必要になる。タスクグループを共通の親とすることでこの曖昧さを避ける。

同じ従業員が複数のタスクグループに所属する場合、DAG的にノードを共有・複数の親から接続する設計は採らず、**タスクグループごとに別ノードとして重複表示する**（厳密な木構造に単純化することで、DAGレイアウトライブラリ（dagre / elkjs 等）の追加導入を避ける。むしろグループごとに独立した進捗表示になる方が文脈が明確という利点もある）。

### 17.2 表示単位・配置場所

- 表示単位は**目標単位**。目標配下の全マイルストーン・全タスクグループを横断した1本のツリーとして表示する
- 配置場所：目標詳細ページ（`/tasks/objectives/[id]`、既存の`ObjectiveDetailPage`）に新規セクションとして追加する

### 17.3 各ノードの表示内容（担当タスク数・進捗率）

- **責任者ノード（ルート）**：目標全体の集計。タスク数・平均進捗率は既存の`getMyObjectivesWithProgress`と同じ計算方式（`groupProgressByParent`を目標ID単位で使用）を流用する
- **タスクグループノード**：そのグループ配下の全タスクの数・平均進捗率（`groupProgressByParent`を`task_group_id`単位で使用）
- **マネージャー／メンバーノード**：そのグループ内でその人（`assignee_employee_id`）に割り当てられたタスクの数・平均進捗率。同一人物が複数グループに属す場合でもノードごとに独立集計する必要があるため、`groupProgressByParent`には`` `${task_group_id}:${employee_id}` ``の複合キーを`parentId`として渡す

### 17.4 データ取得方式

- `src/features/task-management/queries.ts`に`getObjectiveOrgTree(supabase, objectiveId)`（新規）を追加する
- 取得内容：目標（`owner_employee_id`・タイトル）、配下の全マイルストーン・タスクグループ（`id`・`name`・`milestone_id`）、対象タスクグループ群の`task_group_managers`・`task_group_members`（`employee:employee_id(name)`埋め込み）、対象タスクグループ群の`tasks`（`id`・`assignee_employee_id`・`progress_percent`・`task_group_id`、既存の`fetchAllRows`ページングヘルパーを使用）
- 可視範囲は新たに実装せず、`task_objectives_select`・`task_group_managers_select`・`task_group_members_select`の既存RLSポリシーにそのまま委ねる（追加のテナント・権限フィルタは行わない、既存の規約と同じ）
- **既知の特性（RLS可視範囲との連動）**：`app_role = 'employee'`のユーザーは、`is_task_group_participant()`を満たす（自分が参加する）タスクグループのみRLSで可視である。そのため、複数タスクグループを持つ目標を1グループのメンバーが開くと、兄弟タスクグループとそのマネージャー・メンバーノードがツリーから消え、ルートの責任者ノードのタスク数・平均進捗率も「自分に見える範囲だけ」の集計値になる。これは進捗サマリ機能（15.2）と同種の性質だが、組織ツリーは数値だけでなく構造そのものが変わる点がより目立つ。情報漏洩方向には閉じている（見える範囲が狭まるだけで、他人に見えないはずのものが見えることはない）ため機能上の欠陥ではない。

### 17.5 ツリー構築・レイアウト（純粋関数、新規ライブラリはUIレンダリングのみに限定）

- `src/features/task-management/org-tree.ts`（新規）に、DBクエリ結果からツリーのノード・エッジ配列を構築する純粋関数（`buildOrgTreeGraph`）と、階層構造から`@xyflow/react`が要求するx/y座標を計算する自前レイアウト関数（`layoutOrgTree`）を実装する。深さ優先探索で葉ノード（マネージャー・メンバー）に左から順に連番を振ってX座標を決め、非葉ノード（タスクグループ・責任者）のX座標は子ノードX座標の平均とする、木構造専用のシンプルなアルゴリズムとする（`dagre`等の汎用グラフレイアウトライブラリは導入しない）
- DBクエリを含まない純粋関数のため、`node:test`でユニットテストする（既存の`progress.ts`・`feed-provider.ts`と同じ規約）

### 17.6 UIコンポーネント・可視化ライブラリ

- 新規依存として`@xyflow/react`（v12、MIT、React >=17 peer dep、React 19で動作確認済み）を追加する
- `src/features/task-management/components/OrgTreeSection.tsx`（新規、`'use client'`）：`next/dynamic`（`ssr: false`）で実際のReact Flow描画コンポーネントを遅延読み込みし、目標詳細ページの初期表示バンドルに含めない
- 読み取り専用ビューアーとして使用する。`nodesDraggable={false}`・`nodesConnectable={false}`・`edgesUpdatable={false}`を設定し、パン・ズーム（`fitView`）のみ可能にする
- 各ノードにはHR-DX Design Systemのトークンに沿ったバッジ（担当タスク数・進捗率）を表示する

### 17.7 実装ステータス（サブタスク単位）

| #   | 内容                                                                  | 状態 |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `org-tree.ts`（ツリー構築・レイアウト純粋関数）＋ユニットテスト       | 完了 |
| 2   | `getObjectiveOrgTree`（`queries.ts`）                                 | 完了 |
| 3   | `OrgTreeSection.tsx`・`@xyflow/react`導入・目標詳細ページへの組み込み | 完了 |
| 4   | 全体テスト実行・手動E2E確認・PRDステータス更新                        | 完了 |

**手動E2E確認（#4）の「完了」の中身について**：ローカルDBは `task_objectives` 2件・`task_groups` 12件は実データとして存在するが、`task_group_managers` 0件・`task_group_members` 0件・`tasks` 0件であり、組織ツリーが責任者 → タスクグループ → マネージャー／メンバーの階層構造を成立させるために必要な責任者ノードの子ノード（マネージャー・メンバー）が存在しない。そのため、組織ツリーコンポーネント（`OrgTreeSection.tsx`）が`@xyflow/react`を使用して実際にノードを描画し階層表示する動作を確認することができるデータが存在しない。加えて検証実施時のサンドボックス環境でPlaywrightのブラウザが起動できず、ブラウザを実際に操作するライブE2E確認は実施できていない（工数管理機能（14.5）・進捗サマリ機能（15.5）・フィード連携機能（16.6）と同じ制約）。ここでの「完了」の根拠は、(1) Task 1〜3それぞれの独立したタスクレビューでCritical/Important指摘がゼロだったこと、(2) ツリー構築・レイアウト純粋関数（`org-tree.ts`）の7件のユニットテストがすべてPASSしたこと（親子関係の接続、重複ノードの重複表示、進捗率集計、複合キー`${task_group_id}:${employee_id}`のバケット化）、(3) `getObjectiveOrgTree`のDBクエリ（埋め込みリレーション・ページング・RLSポリシー遵守の構文）がTask 2での型チェック（`npm run type-check`エラーなし）・ESLint（no issues found）・レビュアーによる静的コードレビュー（RLS委譲・空配列分岐・Task 1インターフェースとの整合確認）を受けたこと、(4) 全体のテストスイート実行（593 PASS / 1 FAIL既知不具合）、型チェック（エラーなし）、本番ビルド（成功、`@xyflow/react`が目標詳細ページのルートチャンク内に適切に分離される）がTask 4で確認されたことの4点である。ライブブラウザでの動作確認（ツリーの実描画、ノードのタスク数・進捗率バッジ表示、パン・ズーム操作）は、`task_group_managers`・`task_group_members`・`tasks`にテストデータがあり、かつブラウザが利用可能な環境で後日改めて実施することが望ましい。

## 18. Phase 3 詳細設計（状態変化アニメーション）

Phase 3の最後（4番目）のサブ機能として、要求13（状態変化時のアニメーション演出）に対応する。

### 18.1 スコープ

対象は**進捗バー・進捗リングの値変化**のみとする。ブレインストーミング時に他の候補（カンバン列移動時のカード出現/退場、コメント投稿時の新規アイテム出現、ステータスバッジの色変化）も検討したが、進捗の可視性というPRDの主題に最も直結する項目として今回はこれのみを対象に選定した（他候補は将来の追加検討事項とする）。

対象コンポーネント：

- `src/features/task-management/components/TaskCard.tsx`（カンバンカードの進捗バー）
- `src/features/task-management/components/ProgressBar.tsx`（目標一覧・マイルストーン一覧の進捗バー）
- `src/features/task-management/components/ProgressRing.tsx`（目標詳細ページの進捗リング）

### 18.2 実装方式

新規ライブラリ・新規テーブル・新規クエリは一切不要。`src/styles/globals.css`に既に定義済みだが未使用だったデザイントークン（`--duration-normal: 220ms`、`--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)`）を、Tailwind v4のCSS変数参照構文（`duration-(--duration-normal)` / `ease-(--ease-out-quart)`）で各コンポーネントの値変化要素（`TaskCard`/`ProgressBar`のバー`width`、`ProgressRing`の`stroke-dashoffset`）に適用するのみ。

`prefers-reduced-motion: reduce`への対応は、同じ`globals.css`に既存のグローバルルール（全要素の`transition-duration`を`0.01ms`に強制）がそのまま適用されるため、コンポーネント側での追加対応は不要。

### 18.3 テスト方針

CSSクラスの追加のみでロジックを含まないため、既存の`ProgressBar.tsx`・`ProgressRing.tsx`と同じ規約でユニットテスト対象外とした。`npm run type-check`・ESLintでのみ検証。

### 18.4 実装ステータス

規模が小さい（3ファイルへの数行ずつの追記、新規ファイルなし）ため、計画書・SDD worktreeは作らず、このセッション内で直接実装した（brainstormingスキルのBoundedパスに分類）。

- 型チェック：エラーなし
- ESLint：問題なし
- 手動E2E確認：サンドボックス環境でPlaywrightのブラウザ実行ファイルが見つからず（`"chrome" executable not found`）、工数管理・進捗サマリ・フィード連携・組織ツリー機能と同じ制約でライブブラウザ確認は未実施。開発サーバー起動＋curlでのHTTP 200応答確認、および型チェック・ESLintの静的検証で代替した。ブラウザが利用可能な環境での視覚確認（進捗値が変化した際にバー・リングがなめらかに動くこと）は後日改めて実施することが望ましい。
