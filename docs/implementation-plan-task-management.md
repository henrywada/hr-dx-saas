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

**Should（Phase 4 — 運用概念図との整合性調整）**

14. タスクの複数担当者化（`tasks` を1タスク=1担当者から1タスク=複数担当者に変更。詳細はセクション19.1参照）
15. 個人宛てアドバイス機能（コメントの`advice`種別に宛先・送信権限を追加。責任者→タスク責任者、タスク責任者→タスクメンバーの一方向。詳細はセクション19.2参照）
16. タスク／タスクグループ単位の「目標（達成基準）」フィールド（詳細はセクション19.3参照）
17. 組織ツリー可視化へのタスクノード・未読アドバイスバッジ追加（詳細はセクション19.4参照）
18. タスクグループの目標・名前・説明をタスクマネージャーが編集できるようにする（現状は責任者が作成時に入力するのみで更新手段が無い。詳細はセクション19.6参照）

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

| Phase   | 内容                                                                                             | 状態                              |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| Phase 1 | 組織化・割当・進捗・カンバン可視化                                                               | 完了（公開済み）                  |
| Phase 2 | 工数入力・工数分布・コメントスレッド                                                             | 実装完了（デプロイ・E2E検証待ち） |
| Phase 3 | 組織ツリー・進捗サマリ・通知連携・アニメーション                                                 | 完了                              |
| Phase 4 | 運用概念図との整合性調整（複数担当者・個人宛てアドバイス・タスク目標フィールド・組織ツリー拡張） | 完了（セクション19参照）          |

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

## 19. Phase 4 詳細設計（運用概念図との整合性調整）

### 19.0 背景・経緯

ユーザーから提示された「タスク管理の運用概念図」（責任者(部門長)が目標を持ち、複数タスク（改善立案／AI業務改善／導入・普及／残業時間監視）に分解、各タスクに複数担当者（Aさん〜Dさん）、各タスクにも個別の目標、責任者・タスク責任者から特定個人への「アドバイス」の矢印、という構造）と、Phase 1〜3で実装済みのデータモデル・UIを突き合わせ、以下4点のギャップを特定した（brainstormingスキルの対話を通じてユーザーと個別に方針を確定）。

1. `tasks.assignee_employee_id`が単一人のみであり、図の「1タスクに複数担当者」を表現できない
2. `task_comments`の`advice`種別コメントに宛先・送信権限の概念がなく、図の「責任者/タスク責任者→特定個人」という一方向の個別フィードバックを表現できない
3. `tasks`/`task_groups`に構造化された「目標（達成基準）」フィールドがなく、図の「タスクごとの個別目標」を自由記述の`description`でしか表現できない
4. 組織ツリー可視化（セクション17）に個別タスクのノードがなく、図のような「タスク単位で担当者・アドバイスを一望する」ビューが存在しない

Phase 1〜3のデータモデル（`task_objectives`→`task_milestones`→`task_groups`→`tasks`の5階層、責任者/マネージャー/メンバーの役割）自体は変更せず、上記4点を追加・拡張する形で対応する。

**追加の精査（2026-09-10、2枚目の図）**：ユーザーから「プロジェクトの開始」「プロジェクトの運営」を整理した2枚目の運用フロー図が追加で提示された。この図の「タスク」は1枚目の図（詳細な担当者内訳）とは抽象度が異なり、`task_groups`（責任者が作成しマネージャーを割り当てる単位）に対応する。突き合わせの結果、助言の一方向フロー（責任者→タスクマネージャー→メンバー）は19.2の設計と完全に一致することが確認でき、進捗の可視化・直感的入力（進捗リング/バー・スライダー入力）も既存実装で充足済みだった。一方で1点、実装との齟齬が見つかった：図は「タスクマネージャーがタスクの目標を設定する」としているが、`task_groups_update`のRLSポリシーは責任者（`is_task_group_owner`）のみを許可しており、かつ`task_groups`を更新するServer Action自体が存在しない（作成時に責任者が入力するのみ）。この齟齬への対応を要求18（19.5）として追加する。

### 19.1 要求14：タスクの複数担当者化

**スキーマ**：新規中間テーブル`task_assignees`を追加し、`tasks.assignee_employee_id`（単一・nullable）を置き換える。

```sql
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, employee_id)
);
```

**移行方針（2段階、データ保護ルールに従う）**：

1. `task_assignees`作成＋`INSERT INTO task_assignees SELECT ... FROM tasks WHERE assignee_employee_id IS NOT NULL`で既存データを複製する読み取り専用バックフィル（`tasks.assignee_employee_id`列は維持したまま）
2. 動作確認後、別マイグレーションで`tasks.assignee_employee_id`列を削除する（実行前に`SELECT COUNT(*)`で影響件数を提示しユーザー承認を得てから実行する）

**影響範囲**：

| 箇所                                                                     | 変更内容                                                                                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS `tasks_update`（`20260907032410_create_task_management_tables.sql`） | `assignee_employee_id = current_employee_id()`を`EXISTS(SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND employee_id = current_employee_id())`に置き換え |
| `TaskForm.tsx` / `EmployeePicker.tsx`                                    | 単一選択→複数選択に変更                                                                                                                                           |
| `TaskCard.tsx` / `TaskDetailModal.tsx`                                   | 担当者を複数名表示（既知の残課題「担当者名未表示」もここで同時解消）                                                                                              |
| `org-tree.ts`の`personProgressByKey`集計                                 | 1タスク→1人前提のfilter/mapを、1タスク→複数人へのfan-outに変更（`progress.ts`の関数シグネチャ自体は変更不要）                                                     |
| `feed-provider.ts`の割当通知クエリ                                       | `assignee_employee_id = 自分`のフィルタを`task_assignees`とのJOINに変更                                                                                           |
| `employee-filter.ts`                                                     | 同様に`task_assignees`経由の判定に変更                                                                                                                            |

`task_work_logs`（工数記録）は元々従業員ごとに記録する設計のため変更不要。

### 19.2 要求15：個人宛てアドバイス機能

**スキーマ**：`task_comments`に宛先列を追加し、`advice`種別でのみ必須とする。

```sql
ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS target_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_advice_requires_target
  CHECK (
    (comment_type = 'advice' AND target_employee_id IS NOT NULL)
    OR (comment_type <> 'advice' AND target_employee_id IS NULL)
  );
```

**送信権限**：図の運用（責任者→タスク責任者、タスク責任者→タスクメンバーの一方向）に合わせ、汎用ヘルパー`is_employee_task_group_manager(group_id, employee_id)`／`is_employee_task_group_member(group_id, employee_id)`（既存の`is_task_group_manager`等は暗黙に`current_employee_id()`を対象とするため、任意の従業員を検査できる版を新設）を用いて次を定義する。

```sql
can_send_advice(group_id, target_employee_id) :=
  (is_task_group_owner(group_id) AND is_employee_task_group_manager(group_id, target_employee_id))
  OR
  (is_task_group_manager(group_id) AND is_employee_task_group_member(group_id, target_employee_id))
```

これを`task_comments_insert`ポリシーの`comment_type = 'advice'`時のみ追加適用する（`report`/`suggestion`/`general`は現行どおり参加者なら誰でも投稿可）。

**既知のトレードオフ**：マネージャー未割当のタスクグループでは、責任者がメンバーへ直接adviceを送れない（一段飛ばし不可）。図の運用に忠実にするための意図的な制約であり、ユーザー合意済み。運用上不便であれば、後日「マネージャー不在時は責任者が直接送信可」という分岐を`can_send_advice`に追加できる。

**可視範囲**：advice投稿は宛先個人専用の非公開スレッドにはせず、既存どおりタスク／タスクグループ全体のコメントスレッドに公開する（チーム内の透明性を優先する方針、ユーザー合意済み）。ただし宛先を明示するバッジ（例:「→ Aさんへ」）を表示し、誰が誰に指導したかが一覧できるようにする。

**UI**：`CommentThread.tsx`の種別選択で`advice`を選ぶと宛先ピッカーが出現し、自分が送信可能な相手（`can_send_advice`を満たす相手）のみを選択肢として表示する。

### 19.3 要求16：タスク／タスクグループ単位の「目標（達成基準）」フィールド

`description`（自由記述のメモ欄）とは別に、図の「目標：改善案の3案を立案」のような短い達成基準を独立フィールドとして両階層に追加する。

```sql
ALTER TABLE public.task_groups ADD COLUMN IF NOT EXISTS goal_summary TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS goal_summary TEXT;
```

`createTaskSchema`/`createTaskGroupSchema`（Zod）に`goalSummary: z.string().max(200).optional()`を追加する（短い一文の達成基準を想定した文字数上限）。UIは`TaskForm.tsx`・`TaskGroupForm.tsx`に入力欄を追加し、`TaskCard.tsx`・`TaskDetailModal.tsx`・`OrgTreeNodeCard.tsx`（ツールチップ）に表示する。新規テーブルなし、既存の進捗計算ロジックへの影響なし。

### 19.4 要求17：組織ツリーへのタスクノード・未読アドバイスバッジ追加

**構造（並列追加方式）**：セクション17で確立した「責任者→タスクグループ→{マネージャー,メンバー}」構造はそのまま維持し、`task_group`の子として新たに`task`ノードを並列に追加、その子に`task_assignee`ノード（`task_assignees`由来、要求14で新設したテーブルを参照、複数）を配置する。

```
owner
└─ task_group（既存）
   ├─ manager（既存、維持）
   ├─ member（既存、維持）
   └─ task「改善立案」（新規）── goal_summaryをツールチップ表示、進捗%は自身のprogress_percentをそのまま使用（集計不要）
      ├─ task_assignee: Aさん（新規）
      └─ task_assignee: Dさん（新規）
```

既存の`manager`/`member`ノードとの間で同一人物が重複して現れうるが、前者は「グループの構成員」、後者は「実際の作業割当」という異なる情報を示すため許容する（ユーザー合意済み）。`layoutOrgTree`は純粋にedges構造のみを見るDFSアルゴリズムのため、ノード種別が増えても変更不要（セクション17.5の設計方針どおり）。

**未読アドバイスバッジ**：`task`ノードに、閲覧者（`current_employee_id()`）宛ての未読adviceコメント件数を表示する。既読管理は`/top`通知フィードで使用中の`dashboard_feed_read_state`（`20260821090000_create_dashboard_feed_read_state.sql`）をそのまま再利用し、新規テーブルは追加しない。

```sql
SELECT c.task_id, COUNT(*) FROM task_comments c
LEFT JOIN dashboard_feed_read_state r
  ON r.dedupe_key = 'task_management:comment:' || c.id
  AND r.employee_id = current_employee_id()
WHERE c.comment_type = 'advice'
  AND c.target_employee_id = current_employee_id()
  AND r.id IS NULL
GROUP BY c.task_id
```

`queries.ts`に集計関数（例：`getUnreadAdviceCountsByTask`）を1つ追加するのみ。

### 19.5 要求18：タスクグループの目標・名前・説明編集機能（マネージャーへの権限拡張）

**RLS変更**：`task_groups_update`ポリシーに`is_task_group_manager(id)`を追加し、責任者だけでなくマネージャーも更新できるようにする（責任者の権限は維持したまま拡張するのみ、狭める変更ではない）。

```sql
DROP POLICY IF EXISTS "task_groups_update" ON public.task_groups;
CREATE POLICY "task_groups_update" ON public.task_groups
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(id)
      OR public.is_task_group_manager(id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );
```

**Server Action新設**：`updateTaskGroup({ taskGroupId, name, description?, goalSummary? })`。`name`/`description`/`goal_summary`をまとめて更新する（今回まとめて編集可能にする方針、ユーザー合意済み）。0件更新時はエラーを投げる既存パターン（`updateTaskStatus`等）を踏襲する。

**UI**：新規`TaskGroupEditForm.tsx`（インライン編集フォーム、責任者・マネージャーのみ表示）をタスクグループ詳細ページに追加する。図の「マネージャーがアサインされたタスクの目標を設定する」という運用を実現する。

### 19.6 実装ステータス（サブタスク単位）

| #   | 内容                                                                             | 状態 |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `task_assignees`テーブル・RLS変更・関連コンポーネント改修（要求14）              | 完了 |
| 2   | `task_comments.target_employee_id`・`can_send_advice`権限関数・RLS・UI（要求15） | 完了 |
| 3   | `goal_summary`列・Zodスキーマ・UI（要求16）                                      | 完了 |
| 4   | 組織ツリーへの`task`/`task_assignee`ノード・未読バッジ（要求17）                 | 完了 |
| 5   | `task_groups_update`RLS拡張・`updateTaskGroup`・`TaskGroupEditForm`（要求18）    | 完了 |

本セクションはbrainstormingスキルによる設計合意の記録であり、実装は別途、規模に応じてSDD（Subagent-Driven Development）またはBoundedパスで着手する。

## 20. Phase 5 詳細設計（目標中心のシンプルUIへの再構成）

### 20.0 背景・経緯

ユーザーから「目標→マイルストーン→タスクグループ→タスク」という4階層UIが分かりにくいというフィードバックを受け、brainstormingスキルの対話を通じて設計を合意（詳細設計書: `docs/superpowers/specs/2026-09-11-task-management-phase5-design.md`）。データモデル（マイルストーン・タスクグループ）自体は変更せず、UI上はこれらの中間層を隠し「目標に直接タスクをぶら下げる」ように見せる。目標作成時に裏側で「既定マイルストーン」「既定タスクグループ」を自動生成し、既存のカンバンボード・進捗集計・組織ツリー・コメント等のロジックへの影響を最小化した。

着手にあたり、ローカル開発DBのタスク管理関連データ（目標4件・マイルストーン9件・タスクグループ15件・コメント1件）を削除し、既存データとの互換性は考慮不要とした（本番は元々タスク管理データが0件だったため対象外）。

SDD（Subagent-Driven Development）で全15タスクを実装、各タスク完了後にレビュー・fixループを実施し、最終的に最も高性能なモデル（opus）による全体レビューを実施した。

### 20.1 要求19：タスクへの責任者・メンバー役割の導入

`task_assignees`に`role`列（`'responsible' | 'member'`）を追加。1タスクにつき責任者は最大1人（`employees.is_manager = true`限定、RLSで強制）、メンバーは複数人。責任者・メンバーとしてアサインされると、既存RLSの可視性（タスクグループ参加者条件）を満たすため、対応するタスクグループの`task_group_managers`/`task_group_members`にも同時登録・解除時は同時削除する（design.mdセクション2.3）。

### 20.2 要求20：コミュニケーションルートの拡張（suggestion/report）

既存の`advice`（上位→下位の一方向）に加え、`suggestion`（メンバー→タスク責任者、タスク責任者→目標責任者の両方向）・`report`（タスク責任者→目標責任者）を追加。`can_send_advice`と同じ設計パターンで`can_send_suggestion`・`can_send_report`RLS関数を追加し、`task_comments_insert`/`task_comments_update`両方に適用（過去のUPDATE側ゲート漏れ事故の再発防止を厳密に確認）。

### 20.3 要求21：`/tasks/objectives/new`のシンプルフロー化

目標作成→同一画面でタスク作成（責任者アサイン）→タスクカード一覧、という1画面完結のフローに変更。

### 20.4 要求22：`/tasks/objectives/[id]`のシンプルUI再構成

マイルストーン一覧・作成フォームを撤去し、ヘッダー（アイコン+目標名+作成者）→ステータス分布ドーナツグラフ→タスクカードグリッド（編集・削除、責任者/目標責任者のみ表示）→責任者・メンバー別工数分布グラフ→組織ツリー、という構成に再構築。タスク編集（基本情報インライン編集）、組織階層で絞り込むメンバー選択UIを追加。

### 20.5 実装ステータス（タスク単位）

| #   | 内容                                                                           | 状態 |
| --- | ------------------------------------------------------------------------------ | ---- |
| 1   | `task_assignees.role`列・RLS拡張                                               | 完了 |
| 2   | `task_comments`のsuggestion/report宛先・RLS拡張                                | 完了 |
| 3   | 型・スキーマ拡張（`Task.responsibleEmployeeId`等、`createSimpleTaskSchema`）   | 完了 |
| 4   | 権限判定関数（`isTaskResponsible`/`isTaskMember`/`canEditTask`）               | 完了 |
| 5   | `queries.ts`拡張（`getManagerEmployees`/`getObjectiveSimpleView`等）           | 完了 |
| 6   | `createObjective`の既定マイルストーン・タスクグループ自動生成                  | 完了 |
| 7   | `createSimpleTask`（責任者付きタスク作成）                                     | 完了 |
| 8   | `addTaskAssignee`/`removeTaskAssignee`のrole対応                               | 完了 |
| 9   | `/tasks/objectives/new`の新規フローUI                                          | 完了 |
| 10  | `/tasks/objectives/[id]`のヘッダー・ステータス分布・タスクカードグリッド骨組み | 完了 |
| 11  | タスクカードグリッド本体・削除機能                                             | 完了 |
| 12  | タスク編集・組織階層絞り込みメンバー選択                                       | 完了 |
| 13  | コミュニケーションルートのUI配線                                               | 完了 |
| 14  | 責任者・メンバー別工数分布グラフ                                               | 完了 |
| 15  | 組織ツリー表示                                                                 | 完了 |

全15タスク完了後、最終全体レビュー（opus）で発見された5件のImportant指摘（責任者/メンバー解除時の逆同期欠如・組織ツリーの内部名露出・目標作成の非アトミック性・コメント宛先の過大スコープ・削除エラーのハンドリング欠如）と実害のあるMinor指摘2件（期限超過判定のタイムゾーン）を1回のfixウェーブで修正し、scoped re-reviewで全件対応済みを確認した。

### 20.6 既知の未解決課題（次フェーズ候補）

最終レビューで発見され、今回のスコープでは意図的に対応を見送った項目：

1. **コメント宛先のRLS粒度**：`can_send_advice`/`can_send_suggestion`/`can_send_report`は依然としてタスクグループ全体の粒度で定義されている（design.mdセクション2.3の「既存RLSを再利用する」という意図的なトレードオフの帰結）。UI側は今回のfixウェーブでタスク単位に絞り込んだが、RLSレベルでは同一タスクグループ内の他タスクの責任者・メンバーへも技術的には送信可能なままである。完全な是正にはTask 2/7/8のRLSをタスク単位に再設計する必要があり、次フェーズの課題とする。
2. **`task_group_managers_delete`ポリシーの非対称性**：`removeTaskAssignee`の逆同期処理で、マネージャー（オーナーでない）が他人の最後の責任者アサインを解除する場合、`task_group_managers_delete`ポリシーがowner限定（`task_group_members_delete`とは非対称）のためクリーンアップが0件でサイレントに失敗し、対象者に権限が残留する狭いエッジケースがある。是正案：(a)`task_group_managers_delete`に`is_task_group_manager()`を追加してmembers側と対称にする、または(b)削除件数0をチェックして警告を出す。
3. **タスク責任者の交代導線がない**：`createSimpleTask`作成時に1度設定でき、以後変更するUIがない。責任者が退職・異動した場合、タスクを削除して作り直す以外に手段がない。
4. **組織ツリーのtask単位組み替えは未実施**：既存の`getObjectiveOrgTree`ロジックをそのまま流用したため、ツリーのノードラベルの露出は修正したが、真の意味での「タスクグループ単位→タスク単位」への構造組み替え（design.mdセクション5.6originally想定）は行っていない。
5. **`/tasks/objectives/new`のStep2カードが簡素**：design.mdでは責任者名・編集削除ボタンを含む想定だったが、実装はタイトル・目標のみ（plan段階での簡略化）。作成した目標詳細ページへの遷移導線もない。
6. **`ObjectiveForm.tsx`のデッドコード化**：新フローがインラインフォームを再実装したため、既存の`ObjectiveForm.tsx`は参照ゼロになった。削除または再利用への統合を検討する。

## 21. Phase 6 詳細設計（テナント管理者向け組織横断タスク健康度ダッシュボード）

### 21.0 背景・経緯

2026-09-12のレビューで「`adm/`（テナント管理者向け）にタスク管理関連ページが一件も存在せず、経営者・人事責任者が全社のタスク進捗・滞留・負荷偏在を俯瞰する手段がない」ことが判明した（本ドキュメントには記載していなかった既知の残課題）。brainstormingスキルの対話を通じて、プロダクトの2大ゴールのうち「組織健康度の可視化」に対応する新規機能として設計を合意した。既存の`adm/(okr)/okr`は`src/features/okr/`という完全に別のデータモデル（`objectives`/`key_results`/`checkins`、伝統的OKRフレームワーク）であり、本機能（`task_objectives`/`task_groups`/`tasks`/`task_assignees`）とは無関係。混同しないよう新規カテゴリ`(task_health)`を新設する。

### 21.1 スコープ（4指標）

工数×残業管理のクロス分析・advice放置検知・1on1連携等、同日セッションで検討した他の改善案は別機能として明確に切り離す。本フェーズは以下4指標に限定する。

1. **進捗概要** — テナント全体のタスクステータス別件数（todo/in_progress/review/done/blocked）、平均進捗率
2. **滞留タスク** — 以下いずれかに該当するタスクの一覧（複数該当時は理由を併記）
   - 期限超過：`due_date`が過ぎており、かつ`status`が`done`/`blocked`以外
   - 長期未更新：`updated_at`が14日以上前、かつ`status`が`done`以外
   - blocked長期滞在：`status = 'blocked'`かつ`updated_at`が14日以上前
3. **担当者別負荷偏在** — 従業員ごとの担当タスク件数（`task_assignees`、`role`問わず）・うち進行中（`todo`/`in_progress`/`review`）件数
4. **目標別達成状況** — 目標（`task_objectives`）ごとの配下タスク平均進捗率・遅延タスク件数・責任者名

滞留タスク一覧・担当者別集計から個別タスク／目標詳細ページへのドリルダウンは行わない（集計表示のみ、MVPスコープ外）。部門（`divisions`）による絞り込みは必須（URLクエリパラメータ`?division=<id>`で状態を持つ）。絞り込みはタスクの**担当者（`task_assignees.employee_id`）の所属部署**を基準にする（タスク自体はどの部署にも属さないため）。`employees.division_id`が`null`（未配属）の担当者を含めるかどうかは、フィルタ選択肢に「未配属」を含めることで対応する。

### 21.2 権限モデル（追加分）

既存の役割モデル（責任者・タスクマネージャー・メンバー）とは独立に、`getServerUser().appRole !== 'employee'`（CLAUDE.mdの「テナント管理者」定義）でページアクセスを制御する。既存`(okr)`ページの固定ロールリスト（`['hr','hr_manager','tenant_admin','developer']`）は踏襲しない（ロール追加時に追従できないため）。RLS側は既存の`tasks_select`/`task_objectives_select`等が全テーブルで`current_employee_app_role() <> 'employee'`の場合にテナント全件を許可する設計に既になっており、`createClient()`（RLS有効）をそのまま使えば追加のRLS変更は不要（`createAdminClient()`は使わない）。

### 21.3 データレイヤー設計

`src/features/task-management/queries.ts`に以下4関数を追加する。いずれも引数`divisionId?: string`で部門絞り込みに対応し、テナント全体（RLS任せ）を対象にする。

- `getTaskHealthOverview(supabase, { divisionId? })` — ステータス別件数・平均進捗率
- `getStalledTasks(supabase, { divisionId? })` — 滞留タスク一覧（理由付き）
- `getWorkloadDistribution(supabase, { divisionId? })` — 担当者別タスク件数
- `getObjectiveAchievementStatus(supabase, { divisionId? })` — 目標別進捗・遅延状況

判定・集計ロジック（期限超過/長期未更新/blocked滞在の判定、担当者別集計）は`kanban.ts`と同様に`src/features/task-management/task-health.ts`へ純粋関数として切り出し、TDDでユニットテストする。集計はアプリケーション側（TypeScript）で行い、Postgres RPC化は見送る（テナント規模：従業員50〜1000名でタスク件数は現実的な範囲に収まるため。既存`getWorkLogSummaryByGroup`等と同じ設計判断）。

目標とタスクは「目標(`task_objectives`)→マイルストーン(`task_milestones`)→タスクグループ(`task_groups`)→タスク(`tasks`)」の4階層で、Phase5でUI上は中間2階層を隠蔽しているだけでデータモデルは変わっていない（本ドキュメント20章参照）。`getObjectiveAchievementStatus`は`tasks.task_group_id → task_groups.milestone_id → task_milestones.objective_id`の2段階JOINで目標に集約する（`feed-provider.ts`の`objective_id`解決と同じ経路、Phase6着手前のクリーンアップで実装済み）。

### 21.4 画面構成の追加

`src/app/(tenant)/(tenant-admin)/adm/(task_health)/task-health/page.tsx`（+`loading.tsx`/`error.tsx`）を新設する。ルート定数は既存`APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD`等と同じフラットな命名パターンに合わせ、`APP_ROUTES.TENANT.ADMIN_TASK_HEALTH: '/adm/task-health'`として追加する（`APP_ROUTES.tasks.*`のようなネスト構造は使わない）。

UIコンポーネントは`src/features/task-management/components/admin/`に新設する。

- `TaskHealthDashboard.tsx` — 部門フィルタの状態管理を持つコンテナ
- `ProgressOverviewCard.tsx` — ステータス別件数・平均進捗率（Recharts）
- `StalledTaskListCard.tsx` — 滞留タスク一覧（`DataTable`、理由バッジ表示）
- `WorkloadDistributionCard.tsx` — 担当者別負荷（バーチャート）
- `ObjectiveAchievementCard.tsx` — 目標別達成状況一覧

レイアウトはCLAUDE.mdの「パターンB: フル幅型」＋カード間隔標準（`space-y-4`/`gap-3`/`rounded-lg`/`shadow-xs`）に準拠する。

### 21.5 マスタ登録

既存`(okr)`ページ（`service_category`「目標管理（OKR / MBO）」→`service`route_path `/adm/okr`）と同構造で、マイグレーションSQLにより登録する。実装計画（`docs/superpowers/plans/2026-09-12-task-health-dashboard.md`）作成時に`grant_notifier`マイグレーション（`supabase/migrations/20260807022514_grant_notifier.sql`）の実装知見を確認し、以下のように更新した。

1. `service_category`に新規カテゴリ「タスク健康度」（固定UUID定数、`ON CONFLICT (id) DO NOTHING`で冪等化）
2. `service`に新規サービス（`route_path: /adm/task-health`、同様に固定UUID定数）
3. `service_class_index`で既存のサイドメニュー大分類「評価・成長」（`(okr)`と同じ大分類）に紐付け
4. `app_role_service`には**登録しない**（登録が無い＝役割による制限なし＝テナント管理者の全役割で表示される。`grant_notifier`マイグレーションの実装コメントで確認したパターン）
5. `tenant_service`で既存全テナントに機能を有効化（`tenant_id`/`service_id`のみINSERT。`start_date`/`status`カラムはローカルDB実データを調査した結果、既存269行すべてNULLでコード側でも参照されていない未使用カラムだったため、値を入れず実データパターンに合わせる。絶対禁止の「範囲指定のないUPDATE/DELETE」には該当しないINSERTのみの操作）

### 21.6 テスト方針

- `task-health.ts`の判定・集計純粋関数をTDDでユニットテスト（期限超過/長期未更新/blocked滞在の境界値、担当者別集計の合算等）
- `queries.ts`の新規関数はローカルSupabase実DBに対する動作確認で代替（既存パターンと同様、Server Component統合テストは行わない）
- ライブブラウザE2Eは、実行環境でシステムChromeが利用できない場合があるため実施可否を都度判断する（できない場合は静的検証・DB実クエリ確認で代替し、その旨を明記する）

### 21.7 実装ステータス

| #   | 内容                                                             | 状態   |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | `task-health.ts`（判定・集計純粋関数）+ユニットテスト            | 未着手 |
| 2   | `queries.ts`拡張（4関数）                                        | 未着手 |
| 3   | `routes.ts`に`APP_ROUTES.TENANT.ADMIN_TASK_HEALTH`追加           | 未着手 |
| 4   | `/adm/task-health`ページ骨組み（page.tsx/loading.tsx/error.tsx） | 未着手 |
| 5   | UIコンポーネント5点                                              | 未着手 |
| 6   | マスタ登録マイグレーション                                       | 未着手 |
| 7   | 統合確認・レビュー                                               | 未着手 |
