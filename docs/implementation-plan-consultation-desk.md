# 悩み・相談窓口 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度1位（ウェルビーイング層）
> プラグイン活用: `product-management` `/write-spec` 相当の構成で作成

## 1. 問題定義

従業員が悩み・ハラスメント・健康不安等を相談できるデジタル窓口が存在しない。既存の `features/inquiry-chat` は旧ポータル向けの別用途で一部サービスが削除済み（`20260412120000_remove_portal_inquiry_chat_service.sql`）であり、転用には設計の見直しが必要。①コミュニケーション・②組織健康度の両ゴールに直結する重要な欠落機能。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 一般従業員 | 匿名または記名で相談を送りたい | 安心して悩みを相談できる |
| 一般従業員 | 自分の相談の対応状況を確認したい | 放置されていないか不安にならない |
| 産業医・人事責任者 | 受付済み相談を一覧管理し対応状況を更新したい | 対応漏れを防げる |
| テナント管理者 | 相談件数・カテゴリの匿名集計を見たい | 組織のリスクシグナルを早期に把握できる |

## 3. 要求（優先度別）

**Must（MVP）**
1. 相談フォーム（匿名/記名選択、カテゴリ選択、本文）
2. 産業医/人事向け受付一覧（status: 未対応/対応中/解決済み）
3. 相談者向けステータス確認（匿名時はトークンベースの確認URLを発行）

**Should**
4. 対応者からの返信スレッド（記名相談のみ）
5. カテゴリ別・月次の匿名集計ダッシュボード（組織分析への提供）

**Could**
6. 緊急度の高いキーワード検知による優先表示

**Won't**
- AIによる自動応答・自動トリアージ（誤判定のリスクが高く今回は見送り）

## 4. データモデル（新規テーブル案・未作成）

```sql
CREATE TYPE consultation_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.employees(id), -- 匿名時は NULL
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  anonymous_token UUID, -- 匿名時のみ発行、本人確認URL用
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  status consultation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id), -- 産業医・人事担当
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.consultation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  author_employee_id UUID NOT NULL REFERENCES public.employees(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_replies ENABLE ROW LEVEL SECURITY;
-- RLS: 記名相談は本人 + assigned_to + company_doctor/hr_managerロールのみ参照可。
-- 匿名相談は employee_id が NULL のため、テナント内の company_doctor/hr_managerロールのみ参照可（本人はトークンURL経由でAPI越しに確認）。
```

## 5. 配置ルール

```
src/features/consultation/
├── queries.ts        # getMyConsultationStatus, getConsultationQueue（対応者向け）
├── actions.ts         # submitConsultation, replyToConsultation, updateStatus
├── types.ts
└── components/
    ├── ConsultationForm.tsx
    ├── ConsultationQueueTable.tsx   # DataTable準拠
    └── ConsultationThread.tsx

src/app/(tenant)/(tenant-users)/consultation/page.tsx
src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/page.tsx
```

## 6. マスタ登録（メニュー表示）

「ウェルビーイング」カテゴリに `service` 追加。`route_path: /consultation`。対応者向けキューは `app_role_service` で `company_doctor`/`hr_manager`系ロールのみ許可。

## 7. 成功指標

- 相談受付から初回対応までの平均リードタイム
- 月次相談件数（カテゴリ別匿名集計、`features/hr-kpi` への提供データ）

## 8. オープンクエスチョン

- 匿名相談のステータス確認URL（トークン）の有効期限・再発行方式は要決定。
- `features/inquiry-chat` の既存資産（コンポーネント等）を再利用するか、新規ドメインとして独立させるかは設計レビュー時に判断。
