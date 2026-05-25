# 人事評価機能 設計書

> スキルマップ機能の延長として「業績・能力・情意の3軸評価」「MBO（目標管理制度）」を導入する。

---

## 要件まとめ

| #   | 要件                                                      |
| --- | --------------------------------------------------------- |
| 1   | テンプレートを複数用意（一般社員用・管理職用・パート用）  |
| 2   | カスタム項目の追加・編集ができる柔軟性                    |
| 3   | 評価フロー（自己評価 → 一次評価 → 二次評価 → 確定）の管理 |
| 4   | 等級連動（グレードごとに評価基準を変える）                |
| 5   | 評価シートの Excel Export / Import                        |
| 6   | 履歴データとの比較表示                                    |

### 設計上の追加考慮事項

| #   | 考慮事項                                                                                 |
| --- | ---------------------------------------------------------------------------------------- |
| A   | グローバルテンプレートはSaaS管理者のみ更新可能（全テナントが参照できる）                 |
| B   | テナント管理者はグローバルテンプレートからコピーし、カスタマイズして使う                 |
| C   | 評価シートへのアクセス（閲覧・編集）はログインユーザーの役割とフロー状態で制御する       |
| D   | 直属上司・部下の関係（`employee_approvers`）に評価ロール（一次・二次・確定者）を追加する |

---

## ルートグループ設計

```
src/app/(tenant)/(colored)/adm/
└── (evaluation)/
    ├── evaluation/
    │   ├── page.tsx            # 評価シート一覧（テナント管理者）
    │   ├── loading.tsx
    │   └── error.tsx
    ├── evaluation/[sheetId]/
    │   ├── page.tsx            # 評価シート詳細・入力（管理者視点）
    │   ├── loading.tsx
    │   └── error.tsx
    ├── evaluation-templates/
    │   ├── page.tsx            # テンプレート管理（グローバル一覧＋テナントコピー）
    │   └── [templateId]/
    │       └── page.tsx        # テナントテンプレート編集
    └── evaluation-periods/
        └── page.tsx            # 評価期間管理

src/app/(saas-admin)/saas_adm/
└── (evaluation)/
    └── evaluation-global-templates/
        ├── page.tsx            # グローバルテンプレート管理（SaaS管理者専用）
        └── [templateId]/
            └── page.tsx

src/app/(tenant)/(default)/
└── my-evaluation/
    ├── page.tsx                # 従業員：自己評価入力
    └── [sheetId]/
        └── page.tsx
```

---

## ステップ１：DB設計

### テーブル構成図

```
【グローバル層】SaaS管理者のみ変更可
  global_evaluation_templates         ← グローバルテンプレート定義
      ↓ 1:N
  global_evaluation_template_items    ← グローバル評価項目

        ↓ コピー（テナント管理者操作）

【テナント層】テナント内で管理
  evaluation_templates                ← テナント固有テンプレート
      ↓ 1:N
  evaluation_template_items           ← テナント固有評価項目（カスタマイズ可）
      ↓ 参照
  grade_evaluation_criteria           ← 等級別評価基準

  evaluation_periods                  ← 評価期間
      ↓ 1:N
  evaluation_sheets                   ← 評価シート（従業員 × 期間）
      ↓ 1:N
  evaluation_goals                    ← MBO目標
  evaluation_scores                   ← スコア（自己・一次・二次）
  evaluation_flow_logs                ← フロー変更ログ

【評価者設定】employee_approvers 拡張
  employee_approvers                  ← 直属関係＋評価ロール定義
```

---

### SQL マイグレーション

---

#### 【0. 既存 employee_approvers への approver_role 追加】

現在の `employee_approvers` は `employee_id → approver_id` のペアのみで、
承認者の役割が区別されていない。`approver_role` カラムを追加して評価フローに対応させる。

```sql
-- 既存レコードを 'skill_approval' として保持しつつ、評価用ロールを追加
ALTER TABLE public.employee_approvers
  ADD COLUMN IF NOT EXISTS approver_role TEXT NOT NULL DEFAULT 'skill_approval'
    CHECK (approver_role IN (
      'skill_approval',     -- 既存: スキル承認（直属上司）
      'eval_primary',       -- 一次評価者（直属上司）
      'eval_secondary',     -- 二次評価者
      'eval_confirmer'      -- 確定者（最終承認）
    ));

-- UNIQUE制約を再定義（同一ペアで複数ロールを持てるよう変更）
ALTER TABLE public.employee_approvers
  DROP CONSTRAINT IF EXISTS employee_approvers_tenant_id_employee_id_approver_id_key;

ALTER TABLE public.employee_approvers
  ADD CONSTRAINT employee_approvers_unique_role
    UNIQUE (tenant_id, employee_id, approver_id, approver_role);

COMMENT ON COLUMN public.employee_approvers.approver_role IS
  'skill_approval=スキル承認, eval_primary=一次評価者, eval_secondary=二次評価者, eval_confirmer=確定者';
```

**評価者設定の例（1従業員あたりの employee_approvers レコード）:**

| employee_id | approver_id | approver_role  |
| ----------- | ----------- | -------------- |
| 田中太郎    | 鈴木部長    | skill_approval |
| 田中太郎    | 鈴木部長    | eval_primary   |
| 田中太郎    | 山田本部長  | eval_secondary |
| 田中太郎    | 人事部長    | eval_confirmer |

---

#### 【1. グローバル評価テンプレート（SaaS管理者専用）】

既存の `global_skill_templates` パターンに倣い、**SELECT は全テナントが参照可、変更は service_role のみ**。

```sql
-- グローバルテンプレート定義
CREATE TABLE public.global_evaluation_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  template_type TEXT NOT NULL
    CHECK (template_type IN ('general', 'manager', 'parttime')),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- グローバル評価項目
CREATE TABLE public.global_evaluation_template_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.global_evaluation_templates(id) ON DELETE CASCADE,
  axis          TEXT NOT NULL
    CHECK (axis IN ('performance', 'ability', 'attitude', 'mbo')),
  mbo_category  TEXT
    CHECK (mbo_category IN ('A', 'B', 'C', 'D') OR mbo_category IS NULL),
  name          TEXT NOT NULL,
  description   TEXT,
  weight        NUMERIC(5,2) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: SELECT は全員、変更は service_role（SaaS管理者は createAdminClient() 経由）
ALTER TABLE public.global_evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_evaluation_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_eval_templates_select"
  ON public.global_evaluation_templates FOR SELECT USING (true);
CREATE POLICY "global_eval_template_items_select"
  ON public.global_evaluation_template_items FOR SELECT USING (true);
-- 書き込みポリシーなし → service_role のみ書き込み可能（RLSバイパス）
```

**SaaS管理者側の actions.ts パターン:**

```typescript
// src/features/global-evaluation-templates/actions.ts
async function getGlobalEvalAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

export async function createGlobalEvaluationTemplate(...) {
  const adminUser = await getGlobalEvalAdminUser()
  if (!adminUser) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()  // RLSバイパス
  // ...
}
```

---

#### 【2. テナント固有テンプレート（グローバルからコピー・カスタマイズ）】

```sql
CREATE TABLE public.evaluation_templates (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES public.tenants(id),
  global_template_id         UUID REFERENCES public.global_evaluation_templates(id),
    -- NULL = テナントが独自作成 / NOT NULL = グローバルからコピー
  name                       TEXT NOT NULL,
  template_type              TEXT NOT NULL
    CHECK (template_type IN ('general', 'manager', 'parttime')),
  description                TEXT,
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  sort_order                 INT NOT NULL DEFAULT 0,
  copied_from_global_at      TIMESTAMPTZ,             -- コピー日時（変更追跡用）
  created_by                 UUID REFERENCES auth.users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- テナント管理者・HR担当者が参照・更新可能
CREATE POLICY "tenant_isolation" ON public.evaluation_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );
```

**テナント管理者がグローバルテンプレートをコピーする Server Action:**

```typescript
// src/features/evaluation/actions.ts
export async function copyFromGlobalTemplate(
  globalTemplateId: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  const user = await getServerUser()
  // テナント管理者・HR担当者のみ操作可
  if (!user?.tenant_id || !['admin', 'hr_manager'].includes(user.appRole ?? '')) {
    return { success: false, error: '権限がありません' }
  }

  const supabase = await createClient()

  // グローバルテンプレートを参照（SELECT は RLS なしで可能）
  const { data: globalTpl } = await supabase
    .from('global_evaluation_templates')
    .select('*, global_evaluation_template_items(*)')
    .eq('id', globalTemplateId)
    .single()
  if (!globalTpl) return { success: false, error: 'テンプレートが見つかりません' }

  // テナント側にコピー作成（トランザクション相当: sequential insert）
  const { data: newTpl, error: tplErr } = await supabase
    .from('evaluation_templates')
    .insert({
      tenant_id: user.tenant_id,
      global_template_id: globalTpl.id,
      name: globalTpl.name,
      template_type: globalTpl.template_type,
      description: globalTpl.description,
      copied_from_global_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()
  if (tplErr || !newTpl) return { success: false, error: tplErr?.message }

  // 項目をコピー
  const items = globalTpl.global_evaluation_template_items.map((item: any) => ({
    tenant_id: user.tenant_id,
    template_id: newTpl.id,
    axis: item.axis,
    mbo_category: item.mbo_category,
    name: item.name,
    description: item.description,
    weight: item.weight,
    sort_order: item.sort_order,
    is_custom: false,
  }))
  const { error: itemErr } = await supabase.from('evaluation_template_items').insert(items)
  if (itemErr) return { success: false, error: itemErr.message }

  revalidatePath(APP_ROUTES.ADM.EVALUATION_TEMPLATES)
  return { success: true, templateId: newTpl.id }
}
```

---

#### 【3. テナント固有評価項目（カスタマイズ可）】

```sql
CREATE TABLE public.evaluation_template_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
  template_id    UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  axis           TEXT NOT NULL
    CHECK (axis IN ('performance', 'ability', 'attitude', 'mbo')),
  mbo_category   TEXT
    CHECK (mbo_category IN ('A', 'B', 'C', 'D') OR mbo_category IS NULL),
  name           TEXT NOT NULL,
  description    TEXT,
  weight         NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_custom      BOOLEAN NOT NULL DEFAULT false,   -- true = テナント独自追加項目
  target_grades  TEXT[] DEFAULT '{}',              -- 対象グレードコード（空=全員）
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_template_items
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_template_items_template_id
  ON public.evaluation_template_items(template_id);
```

---

#### 【4. 等級別評価基準】

```sql
CREATE TABLE public.grade_evaluation_criteria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  item_id      UUID NOT NULL REFERENCES public.evaluation_template_items(id) ON DELETE CASCADE,
  grade_code   TEXT NOT NULL,
  score_1_desc TEXT,
  score_2_desc TEXT,
  score_3_desc TEXT,
  score_4_desc TEXT,
  score_5_desc TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, grade_code)
);

ALTER TABLE public.grade_evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.grade_evaluation_criteria
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );
```

---

#### 【5. 評価期間】

```sql
CREATE TABLE public.evaluation_periods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id),
  name               TEXT NOT NULL,
  fiscal_year        INT NOT NULL,
  period_type        TEXT NOT NULL
    CHECK (period_type IN ('first_half', 'second_half', 'full_year', 'quarterly')),
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  goal_deadline      DATE,
  self_eval_start    DATE,
  self_eval_end      DATE,
  primary_eval_end   DATE,
  secondary_eval_end DATE,
  status             TEXT NOT NULL DEFAULT 'preparation'
    CHECK (status IN (
      'preparation', 'goal_setting', 'in_progress', 'self_eval',
      'primary_eval', 'secondary_eval', 'confirmed', 'closed'
    )),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_periods
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );
```

---

#### 【6. 評価シート】

```sql
CREATE TABLE public.evaluation_sheets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id),
  employee_id            UUID NOT NULL REFERENCES public.employees(id),
  period_id              UUID NOT NULL REFERENCES public.evaluation_periods(id),
  template_id            UUID NOT NULL REFERENCES public.evaluation_templates(id),
  -- 評価者は employee_approvers から導出するが、シート生成時にスナップショット保存
  primary_evaluator_id   UUID REFERENCES public.employees(id),
  secondary_evaluator_id UUID REFERENCES public.employees(id),
  confirmer_id           UUID REFERENCES public.employees(id),
  flow_status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (flow_status IN (
      'draft',              -- 下書き（目標未設定）
      'goal_set',           -- 目標設定完了・上司承認待ち
      'self_eval',          -- 自己評価入力中
      'self_submitted',     -- 自己評価提出済（一次評価者に回付）
      'primary_eval',       -- 一次評価中
      'primary_submitted',  -- 一次評価提出済（二次評価者に回付）
      'secondary_eval',     -- 二次評価中
      'secondary_submitted',-- 二次評価提出済（確定者に回付）
      'confirming',         -- 確定者レビュー中
      'confirmed'           -- 確定（ロック済み）
    )),
  final_score  NUMERIC(4,2),
  final_grade  TEXT CHECK (final_grade IN ('S','A','B','C','D') OR final_grade IS NULL),
  is_locked    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_id)
);

ALTER TABLE public.evaluation_sheets ENABLE ROW LEVEL SECURITY;

-- RLSはテナント単位の基本分離のみ（フロー状態によるアクセス制御はアプリ層で実装）
CREATE POLICY "tenant_isolation" ON public.evaluation_sheets
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_sheets_employee_period  ON public.evaluation_sheets(employee_id, period_id);
CREATE INDEX idx_eval_sheets_primary          ON public.evaluation_sheets(primary_evaluator_id);
CREATE INDEX idx_eval_sheets_secondary        ON public.evaluation_sheets(secondary_evaluator_id);
CREATE INDEX idx_eval_sheets_confirmer        ON public.evaluation_sheets(confirmer_id);
```

---

#### 【7. MBO目標】

```sql
CREATE TABLE public.evaluation_goals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id             UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  item_id              UUID REFERENCES public.evaluation_template_items(id),
  goal_title           TEXT NOT NULL,
  goal_detail          TEXT,
  kpi_type             TEXT NOT NULL DEFAULT 'quantitative'
    CHECK (kpi_type IN ('quantitative', 'qualitative')),
  kpi_target           TEXT,
  kpi_unit             TEXT,
  kpi_achieve_criteria TEXT,
  weight               NUMERIC(5,2) NOT NULL DEFAULT 0,
  deadline             DATE,
  sort_order           INT NOT NULL DEFAULT 0,
  approved_at          TIMESTAMPTZ,
  approved_by          UUID REFERENCES public.employees(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_goals
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_goals_sheet_id ON public.evaluation_goals(sheet_id);
```

---

#### 【8. 評価スコア】

```sql
CREATE TABLE public.evaluation_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id         UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  item_id          UUID REFERENCES public.evaluation_template_items(id),
  goal_id          UUID REFERENCES public.evaluation_goals(id),
  evaluator_type   TEXT NOT NULL
    CHECK (evaluator_type IN ('self', 'primary', 'secondary', 'confirmer')),
  score            INT CHECK (score BETWEEN 1 AND 5),
  achievement_rate NUMERIC(5,2),
  comment          TEXT,
  evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluator_id     UUID NOT NULL REFERENCES public.employees(id),
  CHECK (
    (item_id IS NOT NULL AND goal_id IS NULL) OR
    (item_id IS NULL AND goal_id IS NOT NULL)
  )
);

ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_scores
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_scores_sheet_id ON public.evaluation_scores(sheet_id);
```

---

#### 【9. フロー変更ログ】

```sql
CREATE TABLE public.evaluation_flow_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  sheet_id    UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID NOT NULL REFERENCES public.employees(id),
  comment     TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_flow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_flow_logs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_flow_logs_sheet_id ON public.evaluation_flow_logs(sheet_id);
```

---

### テーブル関係まとめ

| テーブル                           | 層         | 書き込み権限                        | 備考                                   |
| ---------------------------------- | ---------- | ----------------------------------- | -------------------------------------- |
| `global_evaluation_templates`      | グローバル | SaaS管理者（`createAdminClient()`） | SELECT は全テナント可                  |
| `global_evaluation_template_items` | グローバル | SaaS管理者                          | SELECT は全テナント可                  |
| `evaluation_templates`             | テナント   | テナント管理者・HR担当              | `global_template_id` でコピー元を追跡  |
| `evaluation_template_items`        | テナント   | テナント管理者・HR担当              | `is_custom=true` でカスタム項目識別    |
| `grade_evaluation_criteria`        | テナント   | テナント管理者・HR担当              | グレード × 項目 × スコア基準           |
| `evaluation_periods`               | テナント   | テナント管理者・HR担当              | `status` でフェーズ制御                |
| `evaluation_sheets`                | テナント   | フロー状態次第                      | `UNIQUE(employee_id, period_id)`       |
| `evaluation_goals`                 | テナント   | 本人（`draft`〜`goal_set`）         | MBO目標設定                            |
| `evaluation_scores`                | テナント   | 役割とフロー状態次第                | 3軸・MBOを同テーブルで管理             |
| `evaluation_flow_logs`             | テナント   | 読み取り専用（insert のみ）         | 監査証跡                               |
| `employee_approvers`               | テナント   | HR担当                              | `approver_role` 追加で評価ロールを管理 |

---

## ステップ２：目標設定フォーム 画面設計（期初の目標入力UI）

（変更なし：前版と同じ）

---

## ステップ３：3軸＋MBOを統合した評価テンプレート設計

### テンプレート種別と項目デフォルト構成

**グローバルテンプレートに3種を SaaS 管理者がシードとして登録する。**
テナント管理者はグローバルテンプレート一覧からコピーし、カスタマイズして使う。

#### 一般社員用テンプレート (template_type: 'general')

| 軸       | 項目名               | 比重     |
| -------- | -------------------- | -------- |
| 業績     | 目標達成度           | 15%      |
| 業績     | 業務量・処理速度     | 10%      |
| 業績     | 業務の質・正確性     | 10%      |
| 業績     | 期限遵守             | 5%       |
| 能力     | 専門知識・技術       | 15%      |
| 能力     | 判断力・応用力       | 10%      |
| 能力     | コミュニケーション力 | 10%      |
| 情意     | 積極性・主体性       | 10%      |
| 情意     | 責任感               | 10%      |
| 情意     | 協調性               | 5%       |
| **合計** |                      | **100%** |

#### 管理職用テンプレート (template_type: 'manager')

| 軸       | 項目名           | 比重     |
| -------- | ---------------- | -------- |
| 業績     | 目標達成度       | 20%      |
| 業績     | 部門目標の達成   | 15%      |
| 業績     | 部門貢献度       | 15%      |
| 能力     | 専門知識・技術   | 10%      |
| 能力     | 企画・改善提案力 | 10%      |
| 能力     | 問題解決力       | 10%      |
| 能力     | 部下育成・指導力 | 5%       |
| 情意     | 積極性・主体性   | 5%       |
| 情意     | 報連相の徹底     | 5%       |
| 情意     | 規律性           | 5%       |
| **合計** |                  | **100%** |

#### パート用テンプレート (template_type: 'parttime')

| 軸       | 項目名                   | 比重     |
| -------- | ------------------------ | -------- |
| 業績     | 業務量・処理速度         | 25%      |
| 業績     | 業務の質・正確性         | 25%      |
| 情意     | 出勤安定性（遅刻・欠勤） | 20%      |
| 情意     | 積極性・主体性           | 15%      |
| 情意     | 協調性                   | 15%      |
| **合計** |                          | **100%** |

---

### スコア集計ロジック

```
MBOスコア（例: 比重60%）
  = Σ (各目標の達成率スコア × 目標比重) / 100

3軸スコア（例: 比重40%）
  = Σ (各軸の項目スコア × 項目比重) / 100

総合スコア = MBOスコア × MBO比重 + 3軸スコア × 3軸比重

最終評価等: 4.5以上→S / 3.5以上→A / 2.5以上→B / 1.5以上→C / 1.5未満→D
```

---

## ステップ４：評価レビュー設定フォーム 画面設計（UI）

---

### 【A】アクセス制御設計（ログインユーザー役割 × フロー状態）

評価シートへの閲覧・編集権限はアプリケーション層（`queries.ts` / `actions.ts`）で制御する。
RLS はテナント分離のみを担当し、役割チェックはコード内で行う。

#### アクセス制御マトリクス

| フロー状態            | 本人（被評価者）   | 一次評価者         | 二次評価者         | 確定者     | HR管理者 |
| --------------------- | ------------------ | ------------------ | ------------------ | ---------- | -------- |
| `draft`               | 編集可             | 閲覧可             | ✗                  | ✗          | 閲覧可   |
| `goal_set`            | 閲覧可             | 承認/差戻可        | ✗                  | ✗          | 閲覧可   |
| `self_eval`           | 編集可             | 閲覧可             | ✗                  | ✗          | 閲覧可   |
| `self_submitted`      | 閲覧可（変更不可） | 閲覧可             | ✗                  | ✗          | 閲覧可   |
| `primary_eval`        | 閲覧可             | 編集可             | 閲覧可             | ✗          | 閲覧可   |
| `primary_submitted`   | 閲覧可             | 閲覧可（変更不可） | 閲覧可             | ✗          | 閲覧可   |
| `secondary_eval`      | 閲覧可             | 閲覧可             | 編集可             | 閲覧可     | 閲覧可   |
| `secondary_submitted` | 閲覧可             | 閲覧可             | 閲覧可（変更不可） | 閲覧可     | 閲覧可   |
| `confirming`          | 閲覧可             | 閲覧可             | 閲覧可             | 確定操作可 | 閲覧可   |
| `confirmed`           | 閲覧可（結果通知） | 閲覧可             | 閲覧可             | 閲覧可     | 全閲覧可 |

#### 役割判定ロジック（queries.ts / actions.ts 内）

```typescript
// src/features/evaluation/access-control.ts
type EvaluationRole = 'self' | 'primary' | 'secondary' | 'confirmer' | 'hr_admin' | 'none'

export async function getEvaluationRole(
  sheet: EvaluationSheet,
  currentEmployeeId: string,
  appRole: string
): Promise<EvaluationRole> {
  if (['admin', 'hr_manager'].includes(appRole)) return 'hr_admin'
  if (sheet.employee_id === currentEmployeeId) return 'self'
  if (sheet.primary_evaluator_id === currentEmployeeId) return 'primary'
  if (sheet.secondary_evaluator_id === currentEmployeeId) return 'secondary'
  if (sheet.confirmer_id === currentEmployeeId) return 'confirmer'
  return 'none'
}

export function canEdit(role: EvaluationRole, status: FlowStatus): boolean {
  const editMap: Record<EvaluationRole, FlowStatus[]> = {
    self: ['draft', 'goal_set', 'self_eval'],
    primary: ['primary_eval'],
    secondary: ['secondary_eval'],
    confirmer: ['confirming'],
    hr_admin: [], // 管理者は直接編集しない（差し戻し操作のみ）
    none: [],
  }
  return editMap[role]?.includes(status) ?? false
}
```

#### 評価シート生成時に評価者をスナップショット

```typescript
// シート作成 Server Action 内
export async function createEvaluationSheet(employeeId: string, periodId: string) {
  // ...
  // employee_approvers から評価ロール別に評価者を取得
  const { data: approvers } = await supabase
    .from('employee_approvers')
    .select('approver_id, approver_role')
    .eq('employee_id', employeeId)
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])

  const primaryId = approvers?.find(a => a.approver_role === 'eval_primary')?.approver_id
  const secondaryId = approvers?.find(a => a.approver_role === 'eval_secondary')?.approver_id
  const confirmerId = approvers?.find(a => a.approver_role === 'eval_confirmer')?.approver_id

  await supabase.from('evaluation_sheets').insert({
    tenant_id: user.tenant_id,
    employee_id: employeeId,
    period_id: periodId,
    template_id: resolvedTemplateId,
    primary_evaluator_id: primaryId ?? null,
    secondary_evaluator_id: secondaryId ?? null,
    confirmer_id: confirmerId ?? null,
    flow_status: 'draft',
  })
}
```

---

### 【B】評価者設定画面（テナント管理者） `/adm/evaluation`（タブ）

```
┌─────────────────────────────────────────────────────────────────┐
│ 評価者設定    従業員: [田中太郎 ▼]                              │
├─────────────────────────────────────────────────────────────────┤
│  役割           評価者           設定状況                       │
├─────────────────────────────────────────────────────────────────┤
│  一次評価者     [鈴木 部長 ▼]   ✓ 設定済                       │
│  二次評価者     [山田 本部長 ▼]  ✓ 設定済                       │
│  確定者         [人事 部長 ▼]   ✓ 設定済                       │
├─────────────────────────────────────────────────────────────────┤
│  ※ スキル申請の承認者（skill_approval）は別タブで管理          │
│                                              [保存]             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 【C】グローバルテンプレート管理画面（SaaS管理者）

```
/saas_adm/evaluation-global-templates
┌─────────────────────────────────────────────────────────────────┐
│ グローバル評価テンプレート管理              [+ 新規テンプレート] │
│ ※ このページで作成・編集したテンプレートは全テナントが参照可能  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ 一般社員用         │  │ 管理職用           │  │ パート用       │  │
│  │ 標準テンプレート   │  │ 標準テンプレート   │  │ 標準テンプレート│  │
│  │ 10項目 / 有効     │  │ 10項目 / 有効     │  │ 5項目 / 有効  │  │
│  │ [編集]            │  │ [編集]            │  │ [編集]        │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 【D】テンプレート管理画面（テナント管理者）

```
/adm/evaluation-templates
┌─────────────────────────────────────────────────────────────────┐
│ 評価テンプレート管理           [グローバルからコピー]            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 一般社員用 (グローバルからコピー)             [編集] [複製] │  │
│  │ 10項目 / 有効 / コピー元: 一般社員用標準テンプレート       │  │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 管理職用 カスタム版 (グローバルからコピー後カスタマイズ)   │  │
│  │ 12項目 / 有効 / コピー元: 管理職用標準テンプレート         │  │
│  │ [編集] [複製]                                             │  │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

[グローバルからコピー] ボタン押下 → モーダル表示:
┌───────────────────────────────────────┐
│ グローバルテンプレートを選択          │
│ ○ 一般社員用 標準テンプレート (10項目)│
│ ○ 管理職用   標準テンプレート (10項目)│
│ ○ パート用   標準テンプレート ( 5項目)│
│                      [コピーして作成]  │
└───────────────────────────────────────┘
```

---

### 【E】テンプレート編集画面

（前版と同じレイアウト。`is_custom=true` の項目は「カスタム」バッジを表示して識別。）

---

### 【F】評価シート一覧画面（管理者） `/adm/evaluation`

```
┌─────────────────────────────────────────────────────────────────┐
│ 評価シート一覧   期間: [2026年度 上期▼]          [Excel出力]   │
│ タブ: [シート一覧] [評価者設定] [期間管理]                      │
│ フィルタ: ステータス[全て▼]  部署[全て▼]                       │
├──────┬──────┬──────┬───────┬───────┬───────┬───────┬─────────┤
│ 氏名 │ 部署 │ 等級 │ 目標  │ 自己  │ 一次  │ 二次  │ 確定   │
├──────┼──────┼──────┼───────┼───────┼───────┼───────┼─────────┤
│田中太郎│営業 │ G2  │ ✓設定 │ ✓提出 │ 入力中 │ ─    │ ─     │
│鈴木花子│人事 │ M1  │ ✓設定 │ ✓提出 │ ✓提出 │ 入力中│ ─     │
│山田次郎│開発 │ G1  │ 入力中│ ─    │ ─    │ ─    │ ─     │
│佐藤三郎│－   │ G1  │ ⚠未設定│ ─   │ ─    │ ─    │ ─     │
└──────┴──────┴──────┴───────┴───────┴───────┴───────┴─────────┘
⚠ 1名 評価者未設定 → [評価者設定タブへ]
```

---

## Excel Export / Import 設計

### 出力シート構成

| シート名       | 内容                                   |
| -------------- | -------------------------------------- |
| 評価シート一覧 | 全員の最終スコア・評価等サマリー       |
| [氏名]\_詳細   | MBO目標＋3軸スコア＋コメント（個人別） |
| 目標一覧       | MBO目標の全員分一覧（KPI実績付き）     |

### Import 仕様

- フォーマット: xlsx
- 識別キー: `employee_no` + `period_name`
- インポート可能データ: 目標タイトル・KPI目標値・スコア・コメント
- バリデーション: スコア範囲（1〜5）、比重合計100%、必須項目
- エラー時は行番号付きエラーレポートを返す（処理は中断しない）

---

## 機能フラグ（段階リリース）

```typescript
export const EVALUATION_FLAGS = {
  BASIC_3AXIS: true, // Phase 1: 3軸評価基本
  MBO: true, // Phase 1: MBO目標設定
  EXCEL_EXPORT: true, // Phase 1: Excel出力
  HISTORY_COMPARE: false, // Phase 2: 履歴比較
  EXCEL_IMPORT: false, // Phase 2: Excelインポート
  AI_COMMENT: false, // Phase 3: AIコメント補助
} as const
```

---

## 実装フェーズ

### Phase 1（MVP）

1. `employee_approvers` に `approver_role` カラムを追加するマイグレーション
2. グローバルテンプレートDBテーブル作成（RLS: SELECT全員）
3. テナントテンプレートDBテーブル作成（残7テーブル）
4. グローバルテンプレート 3種 シードデータ（SaaS管理者画面）
5. テナント側「グローバルからコピー」機能
6. テンプレート編集画面（カスタム項目追加・比重設定）
7. 評価期間管理画面
8. 評価者設定画面（`eval_primary` / `eval_secondary` / `eval_confirmer` の設定）
9. MBO目標設定フォーム（期初）
10. 3軸評価入力＋フロー制御（自己→一次→二次→確定者→確定）
11. アクセス制御ロジック（`access-control.ts`）
12. 評価シート一覧（管理者）
13. Excel Export

### Phase 2（拡張）

1. 等級別評価基準の設定UI
2. Excel Import
3. 履歴比較パネル（前期差分表示）
4. 評価シート PDF 出力

### Phase 3（将来）

1. AIコメント補助（スコアと KPI からコメント自動生成）
2. 評価結果と昇給・昇格テーブルの連動
3. スキルマップへのフィードバックループ（評価結果 → スキルレベル自動提案）

---

## src/features/ ファイル構成

```
src/features/
├── global-evaluation-templates/      # SaaS管理者専用
│   ├── types.ts
│   ├── queries.ts
│   └── actions.ts                    # createAdminClient() 使用
│
└── evaluation/                       # テナント向け
    ├── types.ts
    ├── queries.ts
    ├── actions.ts
    ├── constants.ts                  # FlowStatus・軸定義
    ├── access-control.ts             # 役割×フロー状態のアクセス制御
    ├── excel.ts                      # Excel出力（xlsx）
    └── components/
        ├── EvaluationFlowBar.tsx
        ├── GoalForm.tsx
        ├── GoalCard.tsx
        ├── ScoreInput.tsx
        ├── AxisSection.tsx
        ├── MboSection.tsx
        ├── GradeCriteriaPanel.tsx
        ├── HistoryComparePanel.tsx   # Phase 2
        ├── TemplateItemEditor.tsx
        ├── EvaluatorSettingsForm.tsx # 評価者設定（eval_primary等）
        ├── CopyFromGlobalModal.tsx   # グローバルテンプレートコピー
        └── EvaluationSheetTable.tsx
```

---

_作成日: 2026-05-24 / 最終更新: 2026-05-24_
