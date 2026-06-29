# 組織分析の統合強化（adm-dashboardへのウェルビーイング層統合） 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度5位（サーベイ・分析、既存強化）

## 1. 問題定義

`/adm`トップダッシュボード（`src/features/adm-dashboard/`）は7セクション（在籍数・パルスサーベイ・スキル開発・1on1・ストレスチェック・eラーニング・アンケート）を集約表示しているが、**ウェルビーイング層（感謝・称賛/コンディション記録/相談窓口/社内イベント）のデータを一切参照していない**。

調査の結果、既存の「サーベイ・ウェルビーイング」セクション（`adm/page.tsx`112〜172行目）は名称に反して、実際にはパルスサーベイ・スキル・1on1・ストレスチェックの4カードのみで構成され、本来のウェルビーイング層機能（`features/recognition`/`condition-checkin`/`consultation`/`internal-events`）は完全に欠落している。これら4機能はいずれも実装済み（queries.ts/actions.ts完備）だが、経営ダッシュボードからは不可視。

hr-kpi・turnover-riskへの統合は今回スコープ外（ユーザー確認済み、KPI計算式の変更は影響範囲が大きいため見送り）。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 経営者・人事責任者 | `/adm`トップで感謝・称賛の活発度を見たい | コミュニケーション活性度を一目で把握できる |
| 経営者・人事責任者 | `/adm`トップで従業員の平均コンディションを見たい | 個人を特定せず組織の体調・気分の傾向を把握できる |
| 人事責任者 | `/adm`トップで未対応の相談件数を見たい | 対応漏れに早く気づける（既存`getPendingConsultationCount()`は別ボタンで表示済みだが、ダッシュボードカードとしても統合する） |
| 人事責任者 | `/adm`トップで開催予定の社内イベント数を見たい | 称賛文化・イベント運営の状況を把握できる |

## 3. 要求（優先度別）

**Must（今回実装）**
1. 「サーベイ・ウェルビーイング」セクションに4カード追加：感謝・称賛／コンディション記録／相談窓口／社内イベント・表彰
2. コンディション記録の集計はテナント全体の匿名集計（個人特定不可、n≧5の閾値を厳守）

**Won't（今回スコープ外）**
- hr-kpi（`fetchEngagementKpi`）・turnover-risk（スコア因子）へのウェルビーイング層データ統合（ユーザー確認の結果、見送り）
- 既存4カード（パルスサーベイ等）の表示内容変更

## 4. データモデル

新規テーブルは無し。`condition_checkins`テーブルのみ、テナント全体の匿名集計用に新規SECURITY DEFINER関数を1つ追加する（既存の`get_division_condition_trend`関数と同じ匿名化方針を継承）：

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_condition_summary(p_days INT DEFAULT 30)
RETURNS TABLE (avg_score NUMERIC, respondent_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
  v_min_n CONSTANT INT := 5;
BEGIN
  IF v_tenant_id IS NULL OR NOT (v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])) THEN
    RETURN; -- 権限なし: 空集合
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN COUNT(*) >= v_min_n THEN ROUND(AVG(cc.score)::numeric, 2) ELSE NULL END,
    COUNT(*)
  FROM public.condition_checkins cc
  WHERE cc.tenant_id = v_tenant_id
    AND cc.checkin_date >= (CURRENT_DATE - p_days);
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_condition_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_condition_summary(INT) TO authenticated;
```

`condition_checkins`テーブル自体のRLS（本人のみSELECT可）は変更しない。集計はこの関数経由のみ。

## 5. 実装範囲

- `src/features/condition-checkin/queries.ts`：`getTenantConditionSummary(days=30)`を追加（`supabase.rpc('get_tenant_condition_summary', { p_days: days })`を呼ぶだけ）
- `src/features/adm-dashboard/types.ts`：`AdmDashboardSummary`に`wellbeing`セクションを追加
  ```typescript
  wellbeing: {
    kudosCountLast30Days: number
    conditionAverageScore: number | null   // n<5ならnull
    conditionRespondentCount: number
    pendingConsultationCount: number
    upcomingEventCount: number
  }
  ```
- `src/features/adm-dashboard/queries.ts`の`getAdmDashboardSummary()`に以下を追加で並列取得：
  - `getKudosStatsByDivision(30)`（`recognition/queries.ts`既存）→ `sentCount`を合算
  - `getTenantConditionSummary(30)`（上記新規）
  - `getPendingConsultationCount()`（`consultation/queries.ts`既存。現在`adm/page.tsx`では別途取得されているが、summary側にも持たせて一元化）
  - `getAllEventsForAdmin()`（`internal-events/queries.ts`既存）→ `event_date >= 今日`でフィルタした件数
- `src/app/(tenant)/(tenant-admin)/adm/page.tsx`：「サーベイ・ウェルビーイング」`DashboardSectionGroupCard`内に既存4カードと同じ`DashboardSectionCard`パターンで4カード追加
  - 感謝・称賛（`HeartHandshake`アイコン、href: `APP_ROUTES.TENANT.ADMIN_KUDOS_STATS`、stats: 直近30日の送信件数）
  - コンディション記録（`Smile`系アイコン、href: `APP_ROUTES.TENANT.ADMIN_CONDITION_TREND`、stats: 平均スコア（n<5は「—」）／回答者数）
  - 相談窓口（`MessageCircleHeart`系アイコン、href: `APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE`、stats: 未対応件数）
  - 社内イベント・表彰（`PartyPopper`系アイコン、href: `APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS`、stats: 開催予定件数）

既存の`DashboardSectionCard`/`DashboardSectionGroupCard`コンポーネントはそのまま再利用（変更不要）。

## 6. 検証手順

```bash
npm run type-check
npm run lint
node --import tsx --test src/features/condition-checkin/*.test.ts

# マイグレーション適用（ローカル、db resetは使わない）
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -f supabase/migrations/<ts>_add_tenant_condition_summary_fn.sql

# 手動確認
# - /adm トップに4カードが追加表示されること
# - n<5のテナントでコンディション平均が「—」表示になること（匿名化閾値の動作確認）
# - 一般従業員（appRole='employee'）が直接RPCを叩いても権限エラーで空集合が返ること（hrロール以外への漏洩防止）
```

## 7. 成功指標

- `/adm`トップの「サーベイ・ウェルビーイング」セクションが本来の意味通りウェルビーイング層を含むこと
- 経営者・人事責任者が個別ページを巡回せず、ダッシュボード1画面でウェルビーイング層の活性度を把握できること

## 8. オープンクエスチョン

- hr-kpi・turnover-riskへの統合は将来別フェーズで検討（今回見送り）
- カードを4つ追加することでセクションが縦に伸びるが、レイアウト調整（グリッド列数等）が必要か実装時に確認する
