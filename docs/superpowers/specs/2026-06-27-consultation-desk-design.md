# 悩み・相談窓口（Consultation Desk）設計

> 関連: `docs/feature-blocks-development-roadmap.md`（優先度1位・ウェルビーイング層）、`docs/implementation-plan-consultation-desk.md`（初期PRD）
> 本ドキュメントはPRDのオープンクエスチョンをブレインストーミングで確定した上での実装前設計。

## 1. 背景・問題

従業員が悩み・ハラスメント・健康不安等を相談できるデジタル窓口が存在しない。既存の `features/inquiry-chat` はAI RAGナレッジベース用途（FAQ自動応答）であり、本機能（人による相談受付・対応管理）とは目的が異なるため転用しない。①コミュニケーション・②組織健康度の両ゴールに直結する欠落機能。

## 2. スコープ（MVP）

PRDのMust要件のみを対象とする。

- 相談フォーム（匿名/記名選択、カテゴリ選択、本文）
- 対応者向け受付一覧（ステータス管理）
- 相談者・対応者間の返信スレッド（匿名相談でも往復可能）

次フェーズ（本設計のスコープ外）: カテゴリ別匿名集計ダッシュボード、緊急度キーワード検知による優先表示。

## 3. 確定した設計判断（ブレインストーミングでの決定事項）

### 3.1 匿名相談でも返信を受け取れるようにする

ワンウェイ通知ではなく、双方向の返信スレッドを匿名相談でも提供する。

### 3.2 「匿名」の範囲＝対応者から見て匿名

匿名とは「人事・産業医など対応者から見て匿名」であり、システムからの匿名（未ログイン投稿）ではない。本人は通常のログインセッションのまま投稿・自分の相談一覧・スレッドを参照できる。`employee_id` は常にDBに保存し、匿名フラグは表示層（対応者向けUI）でのみ名前を伏せる制御に使う。

**この決定により以下が不要になった：**
- 匿名確認用トークンの発行・有効期限・再発行フロー
- トークン漏洩リスクの管理
- 未ログインアクセス用の別経路API

結果として、認証済みユーザーの通常のRLSモデルで全てを実現でき、セキュリティ・実装コストの両面で大幅に簡素化された。

## 4. データモデル

```sql
CREATE TYPE consultation_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE consultation_category AS ENUM ('harassment', 'mental_health', 'workload', 'interpersonal', 'other');

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  category consultation_category NOT NULL,
  body TEXT NOT NULL,
  status consultation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.consultation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  author_employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_staff_reply BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### カテゴリ（固定enum）
`harassment`（ハラスメント） / `mental_health`（メンタルヘルス） / `workload`（業務量） / `interpersonal`（人間関係） / `other`（その他）

### 対応者ロール
既存のストレスチェック面談ポリシー（`stress_check_interviews`）と同じセットに統一する。

```
hr, hr_manager, company_doctor, company_nurse, hsc
```

## 5. RLS（既存プロジェクトのヘルパー関数パターンに統一）

`current_tenant_id()` / `current_employee_app_role()` は `supabase/migrations/20260307000000_init_schema.sql` で定義済みの既存ヘルパー関数。新規ポリシーもこれに統一し、インラインサブクエリの重複を避ける。

```sql
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_self" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "consultations_select_staff" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultations_insert_self" ON public.consultations
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "consultations_update_staff" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );
```

匿名フラグ（`is_anonymous`）は**表示層のみ**で適用：対応者向けUI（`ConsultationQueueTable` / `ConsultationThreadView`）は `is_anonymous = true` の場合、`employees` をJOINして氏名解決せず「匿名相談者」と表示する。データ自体は本人特定可能な状態で保持する（内部統制・濫用防止のため、完全な匿名化はしない）。

## 6. データアクセスパターン（CLAUDE.md準拠）

```
src/features/consultation/
├── queries.ts        # getMyConsultations, getConsultationThread, getConsultationQueue
├── actions.ts         # submitConsultation, replyToConsultation, updateConsultationStatus
├── types.ts
└── components/
    ├── ConsultationForm.tsx
    ├── ConsultationThreadView.tsx
    └── ConsultationQueueTable.tsx   # DataTable準拠（py-1コンパクトパディング等の既存標準に従う）

src/app/(tenant)/(tenant-users)/consultation/page.tsx
src/app/(tenant)/(tenant-users)/consultation/[id]/page.tsx
src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/page.tsx
src/app/(tenant)/(tenant-admin)/adm/(company_doctor)/consultation-queue/[id]/page.tsx
```

各 `page.tsx` に `loading.tsx` / `error.tsx` を配置。`queries.ts` はSELECTのみ、`actions.ts` はServer Actionsで書き込みのみという既存パターンを厳守する。

## 7. マスタ登録（メニュー表示）

「ウェルビーイング」カテゴリ（または既存の近い `service_category`）に `service` を1行追加し、`route_path: /consultation` を設定。`app_role_service` で対応者キュー (`/adm/consultation-queue`) は `hr` / `hr_manager` / `company_doctor` / `company_nurse` / `hsc` のみ許可。本人向け (`/consultation`) は全ロール許可。`src/config/routes.ts` に該当する `APP_ROUTES` エントリを追加する。

## 8. バリデーション・エラーハンドリング

- `category`: 固定enumのみ許可（Zod `z.enum(...)`）
- `body`: 1〜2000文字（Zod、空文字・超長文を拒否）
- `is_anonymous`: boolean、デフォルト `false`
- 未認証アクセスは `getServerUser()` のnullチェックで `Unauthorized` を投げる（既存Server Actionテンプレートに準拠）

## 9. テスト方針（TDD・80%カバレッジ基準）

| テスト対象 | 観点 |
| --- | --- |
| `submitConsultation` | 匿名/記名双方で `employee_id` が保存されること。カテゴリ・本文のバリデーション境界値 |
| RLS（統合テスト） | 本人以外が他人の相談（匿名含む）を取得できないこと。対応者ロール以外がキューを取得できないこと |
| `replyToConsultation` | 本人または対応者以外からの返信投稿が拒否されること |
| `updateConsultationStatus` | 対応者ロール以外がステータス変更できないこと |
| `ConsultationQueueTable` | `is_anonymous = true` のとき氏名が表示されないこと（UIスナップショット/単体テスト） |

## 10. スコープ外（次フェーズ）

- カテゴリ別・月次の匿名集計ダッシュボード（`features/hr-kpi` への提供）
- 緊急度の高いキーワード検知による優先表示
- 感謝・称賛機能等、他のウェルビーイング機能との連携

## 11. 自己レビュー結果

- プレースホルダー・TODO: なし
- 内部矛盾: なし（匿名性の範囲を1箇所に明記し、他章はそれに整合）
- スコープ: MVPに限定し1つの実装計画で完結する規模
- 曖味性: 「匿名」の定義をブレインストーミングで一意に確定済み
