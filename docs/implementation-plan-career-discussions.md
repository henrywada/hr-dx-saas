# キャリア面談 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度3位（評価・成長層）
> バックログ: `docs/implementation-plan-wellbeing-backlog.md` CR-M1

## 1. 問題定義

評価・1on1・スキル開発と並ぶ「キャリア面談」が口頭・紙ベースのまま残り、面談内容の記録・追跡・組織分析連携ができない。MVP として面談記録の登録・一覧は実装済みだが、予約・更新・1on1 連携は未整備。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 上長・人事 | キャリア面談の内容を記録したい | 後から振り返り・引き継ぎができる |
| 上長・人事 | 面談記録を修正・削除したい | 誤入力を訂正できる |
| 従業員 | 自分の面談履歴を見たい | 過去の合意内容を確認できる |
| 人事責任者 | キャリア面談の実施状況を把握したい | 未実施者へのフォローができる |

## 3. 要求（優先度別）

**Must（MVP — 完了）**
1. 面談記録の作成（テーマ・志向・メモ・次回予定日）
2. テーマテンプレート管理（HR）
3. 本人向け履歴 / 管理者向け一覧

**Should（バックログ）**
4. 面談予約・スケジューリング（1on1 基盤再利用） — CR-S1
5. 面談記録の更新・削除 — **CR-S2 実装済み（2026-06-30）**
6. 1on1 セッションとの明示的連携 — CR-S3

**Could**
7. `/adm` トップカード（P6 で評価・成長カードとして対応済み）

**Won't（今回スコープ外）**
- 面談評価スコアリング・離職リスク自動算出

## 4. データモデル

既存: `career_discussions`, `career_discussion_theme_templates`

**CR-S1 追加:** `career_discussion_appointments`
- `employee_id`, `scheduled_by_employee_id`, `theme`, `scheduled_at` (TIMESTAMPTZ), `status` (`scheduled`|`completed`|`cancelled`), `notes`

**CR-S3 追加:** `career_discussions.one_on_one_session_id` → `one_on_one_sessions(id)`（任意紐付け）

## 5. 配置ルール

```
src/features/career-discussions/
/adm/career-discussions
/career-discussions
```

## 6. 実装ステータス（2026-06-30）

| ID | 内容 | 状態 |
| --- | --- | --- |
| MVP | 記録作成・テンプレート・一覧 | ✅ |
| CR-M1 | 本 PRD | ✅ |
| CR-S2 | update / delete | ✅ |
| CR-S1 | 面談予約 | ✅ |
| CR-S3 | 1on1 連携 | ✅ |
