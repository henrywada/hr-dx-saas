# コンディション記録（日次/週次チェックイン） 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度1位（ウェルビーイング層）
> プラグイン活用: `product-management` `/write-spec` 相当の構成で作成

## 1. 問題定義

組織健康度の最も先行性の高い指標である「個人の日々のコンディション」を記録する手段が無い。ストレスチェック（年1〜2回）やパルスサーベイ（月次〜週次の設問形式）はあるが、**毎日1タップで完了する超軽量な気分・体調記録**が欠落しており、②組織健康度の可視化の感度を下げている。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 一般従業員 | 今日の気分・体調を1タップ（5段階絵文字）で記録したい | 負担なく継続できる |
| 一般従業員 | 自分の過去のコンディション推移を見たい | 自分の状態変化に気づける |
| 上長 | チームの匿名集計コンディション傾向を見たい | 個人を特定せずチームの空気を把握できる |
| テナント管理者（産業医） | 急激な悪化傾向のアラートを受け取りたい | 早期に高ストレス者への介入ができる |

## 3. 要求（優先度別）

**Must（MVP）**
1. 1日1回の簡易記録（5段階スケール + 任意のひとことメモ）
2. 本人向け個人推移グラフ（直近30日）
3. 個人データは本人のみ閲覧可能（RLS で本人限定、管理者は集計のみ）

**Should**
4. 上長・管理者向け部署別集計（n≧5等の匿名化閾値を満たす場合のみ表示）
5. 既存 `pulse-stress`（パルス×ストレスのクロス分析）への統合 — ✅ 2026-06-30 完了（`/adm/pulse-stress` にコンディション日次推移・部署マトリクス・要注意リストを追加）

**Could**
6. 急激な低下を検知した場合の産業医（`company_doctor`）への通知 — ✅ 2026-06-30 完了（`/adm/condition-trend` アラート + チェックイン時お知らせ）

**Won't**
- 個人別の生データを上長が閲覧できる機能（プライバシー上、今回は実装しない）

## 4. データモデル（新規テーブル案・未作成）

```sql
CREATE TABLE public.condition_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  memo TEXT,
  checkin_date DATE NOT NULL, -- Asia/Tokyo基準の日付（1日1件の一意制約用）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, checkin_date)
);

ALTER TABLE public.condition_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_only" ON public.condition_checkins
  FOR ALL USING (
    employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );
-- 管理者向け集計は SECURITY DEFINER 関数 or ビューで匿名化閾値を適用してから提供する
```

## 5. 配置ルール

```
src/features/condition-checkin/
├── queries.ts        # getMyCheckinHistory, getDivisionAggregateTrend
├── actions.ts         # submitCheckin
├── types.ts
└── components/
    ├── CheckinWidget.tsx     # top画面に埋め込む1タップウィジェット
    └── ConditionTrendChart.tsx

src/app/(tenant)/(tenant-users)/condition/page.tsx       # 個人履歴
src/app/(tenant)/(tenant-admin)/adm/(org_health)/condition-trend/page.tsx  # 管理者向け匿名集計
```

## 6. マスタ登録（メニュー表示）

「サーベイ・分析」または「ウェルビーイング」カテゴリに `service` 追加。`route_path: /condition`。本人記録のため `app_role_service` は employee含む全ロール許可。

## 7. 成功指標

- 日次記録率（DAU/全従業員数）
- 低スコア（1〜2）の継続検知からハイストレス者特定までのリードタイム短縮

## 8. オープンクエスチョン

- 匿名化閾値（n≧5等）の具体値はテナントサイズに応じて可変にするか固定値かを要決定。
- 既存 `pulse-stress` との統合タイミング（同時並行か、本機能を先行させてからクロス分析を追加するか）。
