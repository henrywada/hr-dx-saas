# 実装計画: /top・/adm 表示シミュレーション

作成日: 2026-08-15

## 1. 問題定義

システムマスタでテナント×サービスとダッシュボード表示を切り替えても、実際の `/top`・`/adm` の見え方がその場で分からない。

## 2. ユーザーストーリー

- SaaS管理者として、Planテンプレートや割当の設定後に、従業員画面・管理画面の配置をモーダルで確認したい。

## 3. 要求と優先度

| #   | 要求                                                        | 優先度 |
| --- | ----------------------------------------------------------- | ------ |
| R1  | 「テナント×サービス」「ダッシュボード表示」の両方を反映する | MUST   |
| R2  | `/top` と `/adm` をタブ切替でプレビューする                 | MUST   |
| R3  | 実データ（件数・お知らせ本文）は出さず、配置イメージのみ    | MUST   |
| R4  | 既存の契約テナントは変更しない（読み取り＋UIのみ）          | MUST   |

## 4. 配置

- 判定: `src/features/dashboard-ui-visibility/visibility.ts`
- UI: `src/features/dashboard-ui-visibility/components/DashboardPreviewModal.tsx`
- 入口: `TenantServiceTab` / `TenantDashboardUiTab`
