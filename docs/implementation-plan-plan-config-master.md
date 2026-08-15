# 実装計画: プラン条件マスタ化

作成日: 2026-08-15

## 1. 問題定義

プラン条件（最大従業員数・契約月数・申込可否・決済方法等）が `PLAN_CONFIG` としてコード固定のため、SaaS管理者が画面から変更できない。

## 2. ユーザーストーリー

- SaaS管理者として、システムマスタの Planテンプレート からプラン条件を変更したい。
- 申込者として、管理画面で有効にしたプランだけセルフサインアップしたい。

## 3. 要求と優先度

| #   | 要求                                                                                                 | 優先度 |
| --- | ---------------------------------------------------------------------------------------------------- | ------ |
| R1  | `plan_config` マスタテーブルを新設し、現行 PLAN_CONFIG 5件を初期投入する                             | MUST   |
| R2  | `/saas_adm/system-master` の Planテンプレート に「プラン条件」タブを追加し、条件を更新できる         | MUST   |
| R3  | サインアップ・決済・招待メールは DB の値を参照する（取得失敗時はコードのデフォルトにフォールバック） | MUST   |
| R4  | プランコード・テンプレートテナント名・Stripe環境変数名は変更不可                                     | MUST   |

## 4. データモデル

`public.plan_config`（SaaSマスタ、`tenant_id` なし）

- `plan_type` PK: free / plan100 / plan300 / plan500 / plan1000
- `label`, `max_employees`, `initial_status`, `payment_method`, `payment_status`
- `contract_months`（NULL = 無期限）
- `available`, `template_tenant_name`, `stripe_price_id_env`, `sort_order`

RLS: SELECT は anon/authenticated、書込は `developer`。

## 5. 配置

- 取得: `src/features/plan-config/queries.ts`
- 更新: `src/features/plan-config/actions.ts`（SaaS管理者 + admin client）
- UI: `src/features/system-master/components/PlanConfigTab.tsx`

## 6. 成功指標

- Planテンプレート > プラン条件 で最大従業員数・申込可否を保存できる
- 申込可否をオフにしたプランは `/signup?plan=...` で準備中になる
