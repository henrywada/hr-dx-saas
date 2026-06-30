# コミュニケーション UX 最適化 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度8位（コミュニケーション層・既存機能の最適化）

## 1. 問題定義

パルスサーベイ・アンケート・お知らせ・チームコネクトの Must スコープは実装済みだが、管理者画面と従業員画面でヘッダー文言・空状態・誘導コピーがモジュール間で不統一。従業員向けパルス回答画面では人事専用 URL へのリンクが表示されるなど、利用シーンに合わない UX が残っている。ゴール①「コミュニケーションを大切にするシステム」の体感品質を上げるため、新機能追加ではなく文言・空状態・ページ導線の polish を行う。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 人事担当者 | 各コミュニケーション機能の管理画面で目的が一目で分かる | 初回利用時に迷わず設定を進められる |
| 一般従業員 | 回答対象が無いときに次に何をすればよいか分かる | 不要な管理画面リンクに誘導されない |
| 一般従業員 | チームコネクトで組織図とディレクトリの使い分けが分かる | 連絡相手の所属を素早く特定できる |

## 3. 要求（優先度別）

**Must（今回実装）**

1. 4モジュール共通のページヘッダーパターン（タイトル + 1行説明）を admin / tenant-user 画面に適用
2. 空状態にアイコン + 次アクションを示すガイダンス文を追加
3. 従業員向けパルス回答の空状態から人事専用 URL リンクを除去し、ポータルへ戻る導線に変更
4. ハードコード URL（`/top` 等）を `APP_ROUTES` に統一

**Should（バックログ）**

- パルス回答 UI の indigo 系配色を HR-DX ブランド（`--brand`）へ段階的移行
- アンケート管理を DataTable コンポーネントへ統一
- お知らせの従業員向け閲覧画面（トップカード）との文言整合

**Won't（今回スコープ外）**

- 新規 API・DB 変更
- 社内 SNS / プロフィール拡張（チームコネクト PRD Won't 継続）

## 4. 対象ファイル

| モジュール | 管理者 | 従業員 |
| --- | --- | --- |
| パルス | `features/echo-template/components/TenantEchoListClient.tsx` | `survey/answer/SurveyAnswerClient.tsx` |
| アンケート | `features/questionnaire/components/QuestionnaireListClient.tsx` | `answers/page.tsx`, `AnswersListClient.tsx` |
| お知らせ | `features/dashboard/components/AnnouncementTable.tsx` | （トップダッシュボード既存） |
| チームコネクト | — | `team-connect/page.tsx`, `DivisionTreeView.tsx`, `DirectoryList.tsx` |

## 5. 成功指標

- 4モジュールの主要画面に説明文 + 改善された空状態が存在する
- 従業員向け画面に管理者専用 URL への誘導が無い
- `npm run type-check` 通過

## 6. 実装ステータス（2026-06-30）

| 項目 | 状態 |
| --- | --- |
| PRD 作成 | ✅ |
| チームコネクト UX | ✅ |
| アンケート管理 UX | ✅ |
| お知らせ管理 UX | ✅ |
| パルス・アンケート回答 UX（Must） | ✅ |
| ロードマップ更新 | ✅ |
| **Should: パルス回答ブランド配色** | ✅ 2026-06-30 |
| **Should: アンケート DataTable 化** | ✅ 2026-06-30 |
| **Should: お知らせ文言整合** | ✅ 2026-06-30 |
