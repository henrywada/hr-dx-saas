# NEW-2 目標管理（OKR / MBO）機能 — 実装設計書

> 作成日: 2026-06-06  
> 工数目安: 12〜18日  
> 実装先ルート: `/adm/okr`

---

## 1. 機能概要

### 課題背景

評価制度はあるが、日常の目標設定と進捗管理が Excel で行われており、評価と連動していない。

### ペルソナが得るもの

| ペルソナ | 得られる価値 |
|---------|------------|
| 経営者 | 会社目標から部門・個人目標まで一気通貫で見える。「戦略が現場に落ちているか」が分かる |
| 人事 | 評価と目標が連動し、「評価のための評価」から脱却できる |
| 管理職 | チーム目標と個人目標の整合をシステムで確認・承認できる |
| 従業員 | 自分の目標が会社戦略とどう繋がるか可視化される |

### 主要機能

1. **OKRツリービュー** — 会社→部門→個人のOKR階層表示
2. **チェックイン機能** — 週次進捗（5段階スライダー＋コメント）
3. **評価連動** — 期末評価シートとの自動リンク
4. **ダッシュボード** — 目標達成率の集計・可視化
5. **目標管理（MBO）** — 個人目標の設定・承認ワークフロー

---

## 2. 実装対象ファイル一覧

```
src/
├── app/(tenant)/(colored)/adm/(okr)/
│   ├── okr/
│   │   ├── page.tsx                       ← OKRダッシュボード（Server Component）
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── okr/[objectiveId]/
│   │   ├── page.tsx                       ← 目標詳細・KeyResults一覧
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── okr/tree/
│       ├── page.tsx                       ← OKRツリービュー
│       ├── loading.tsx
│       └── error.tsx
│
├── features/okr/
│   ├── types.ts                           ← 型定義
│   ├── queries.ts                         ← SELECT専用クエリ
│   ├── actions.ts                         ← Server Actions（INSERT/UPDATE/DELETE）
│   └── components/
│       ├── OkrDashboard.tsx               ← ダッシュボードメインコンポーネント
│       ├── OkrTreeView.tsx                ← ツリービュー
│       ├── ObjectiveCard.tsx              ← 目標カード（進捗バー付き）
│       ├── KeyResultList.tsx              ← KR一覧（スライダー入力）
│       ├── ObjectiveFormModal.tsx         ← 目標作成・編集モーダル
│       ├── KeyResultFormModal.tsx         ← KR作成・編集モーダル
│       ├── CheckinFormModal.tsx           ← チェックインモーダル
│       ├── CheckinHistoryList.tsx         ← チェックイン履歴
│       ├── AchievementRateChart.tsx       ← 達成率チャート（Recharts）
│       └── EvaluationLinkBadge.tsx        ← 評価シート連動バッジ
│
├── config/routes.ts                       ← APP_ROUTES.OKR を追加
│
supabase/migrations/
└── 20260607000000_add_okr_tables.sql      ← 新規テーブル追加（既存テーブルは変更しない）
```

---

## 3. データベース設計

> **重要**: 既存テーブルは一切変更しない。新規テーブルのみ追加する。

### 3.1 新規テーブル

#### `objectives` — 目標（Objective）

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

CREATE TABLE public.objectives (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES public.tenants(id),
  parent_id         UUID        REFERENCES public.objectives(id),     -- 親目標（NULLは会社目標）
  owner_type        TEXT        NOT NULL CHECK (owner_type IN ('company','division','employee')),
  owner_employee_id UUID        REFERENCES public.employees(id),      -- 個人目標の場合
  owner_division_id UUID        REFERENCES public.divisions(id),      -- 部門目標の場合
  period_label      TEXT        NOT NULL,                              -- 例: '2026-H1', '2026-Q2'
  fiscal_year       INTEGER     NOT NULL,
  half_year         TEXT        CHECK (half_year IN ('first','second')),
  title             TEXT        NOT NULL,
  description       TEXT,
  status            TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','completed','cancelled')),
  progress          NUMERIC(5,2) NOT NULL DEFAULT 0
                    CHECK (progress >= 0 AND progress <= 100),
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  evaluation_sheet_id UUID      REFERENCES public.evaluation_sheets(id),  -- 評価連動（NULL許容）
  approved_at       TIMESTAMPTZ,
  approved_by       UUID        REFERENCES public.employees(id),
  created_by        UUID        REFERENCES public.employees(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.objectives
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_objectives_tenant_year
  ON public.objectives(tenant_id, fiscal_year, half_year);
CREATE INDEX idx_objectives_parent
  ON public.objectives(parent_id);
CREATE INDEX idx_objectives_owner_employee
  ON public.objectives(tenant_id, owner_employee_id);
CREATE INDEX idx_objectives_owner_division
  ON public.objectives(tenant_id, owner_division_id);

CREATE TRIGGER trg_objectives_updated_at
  BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

#### `key_results` — 主要成果（Key Result）

```sql
CREATE TABLE public.key_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  objective_id    UUID        NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  kr_type         TEXT        NOT NULL DEFAULT 'quantitative'
                  CHECK (kr_type IN ('quantitative','qualitative')),
  target_value    NUMERIC,                                             -- 定量: 目標値
  current_value   NUMERIC     NOT NULL DEFAULT 0,                     -- 定量: 現在値
  unit            TEXT,                                                -- 例: '件', '%', '万円'
  start_value     NUMERIC     NOT NULL DEFAULT 0,                     -- 定量: 開始値（ベースライン）
  progress        NUMERIC(5,2) NOT NULL DEFAULT 0
                  CHECK (progress >= 0 AND progress <= 100),
  weight          NUMERIC(5,2) NOT NULL DEFAULT 100,                  -- Objective内の重み（合計100推奨）
  due_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'on_track'
                  CHECK (status IN ('on_track','at_risk','off_track','completed','cancelled')),
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_by      UUID        REFERENCES public.employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.key_results
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_key_results_objective
  ON public.key_results(objective_id, sort_order);
CREATE INDEX idx_key_results_tenant
  ON public.key_results(tenant_id);

CREATE TRIGGER trg_key_results_updated_at
  BEFORE UPDATE ON public.key_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

#### `checkins` — 週次チェックイン

```sql
CREATE TABLE public.checkins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  key_result_id   UUID        NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES public.employees(id),
  confidence      INTEGER     NOT NULL CHECK (confidence BETWEEN 1 AND 5),  -- 5段階スライダー
  current_value   NUMERIC,                                             -- 定量KRの場合の現在値
  comment         TEXT,
  checkin_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.checkins
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_checkins_kr
  ON public.checkins(key_result_id, checkin_date DESC);
CREATE INDEX idx_checkins_employee
  ON public.checkins(tenant_id, employee_id, checkin_date DESC);
```

### 3.2 テーブル関係図

```
tenants
  └── objectives (tenant_id)
        ├── objectives (parent_id) ← 自己参照（会社→部門→個人）
        └── key_results (objective_id)
              └── checkins (key_result_id)

employees ─── objectives (owner_employee_id, created_by, approved_by)
divisions  ─── objectives (owner_division_id)
evaluation_sheets ─── objectives (evaluation_sheet_id)  ← 評価連動（NULL許容）
```

---

## 4. TypeScript型定義（`src/features/okr/types.ts`）

```typescript
// オーナー区分
export type ObjectiveOwnerType = 'company' | 'division' | 'employee'

export const OBJECTIVE_OWNER_TYPE_LABELS: Record<ObjectiveOwnerType, string> = {
  company: '会社',
  division: '部門',
  employee: '個人',
}

// 目標ステータス
export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  draft: '下書き',
  active: '進行中',
  completed: '達成',
  cancelled: '中止',
}

// KRステータス
export type KeyResultStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'cancelled'

export const KEY_RESULT_STATUS_LABELS: Record<KeyResultStatus, string> = {
  on_track: '順調',
  at_risk: '要注意',
  off_track: '遅延',
  completed: '達成',
  cancelled: '中止',
}

export const KEY_RESULT_STATUS_COLORS: Record<KeyResultStatus, string> = {
  on_track: 'text-green-600 bg-green-50',
  at_risk: 'text-yellow-600 bg-yellow-50',
  off_track: 'text-red-600 bg-red-50',
  completed: 'text-blue-600 bg-blue-50',
  cancelled: 'text-gray-600 bg-gray-50',
}

// チェックイン信頼度ラベル（1〜5）
export const CONFIDENCE_LABELS: Record<number, string> = {
  1: '厳しい',
  2: '難しい',
  3: '普通',
  4: '良好',
  5: '達成確実',
}

// Objective（目標）
export interface Objective {
  id: string
  tenant_id: string
  parent_id: string | null
  owner_type: ObjectiveOwnerType
  owner_employee_id: string | null
  owner_division_id: string | null
  period_label: string
  fiscal_year: number
  half_year: 'first' | 'second' | null
  title: string
  description: string | null
  status: ObjectiveStatus
  progress: number
  sort_order: number
  evaluation_sheet_id: string | null
  approved_at: string | null
  approved_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// KeyResult（主要成果）
export interface KeyResult {
  id: string
  tenant_id: string
  objective_id: string
  title: string
  description: string | null
  kr_type: 'quantitative' | 'qualitative'
  target_value: number | null
  current_value: number
  unit: string | null
  start_value: number
  progress: number
  weight: number
  due_date: string | null
  status: KeyResultStatus
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// Checkin（週次チェックイン）
export interface Checkin {
  id: string
  tenant_id: string
  key_result_id: string
  employee_id: string
  confidence: number  // 1〜5
  current_value: number | null
  comment: string | null
  checkin_date: string  // 'YYYY-MM-DD'
  created_at: string
}

// 表示用（JOIN後）
export interface ObjectiveWithDetails extends Objective {
  key_results: KeyResultWithCheckins[]
  children: ObjectiveWithDetails[]
  owner_name: string | null  // 従業員名 or 部署名
}

export interface KeyResultWithCheckins extends KeyResult {
  latest_checkin: Checkin | null
  checkin_count: number
}

// ダッシュボードデータ
export interface OkrDashboardData {
  companyObjectives: ObjectiveWithDetails[]  // 会社目標
  divisionObjectives: ObjectiveWithDetails[] // 部門目標
  myObjectives: ObjectiveWithDetails[]       // 自分の個人目標
  teamObjectives: ObjectiveWithDetails[]     // 部下の目標（管理職のみ）
  summary: OkrSummary
}

export interface OkrSummary {
  totalObjectives: number
  activeObjectives: number
  completedObjectives: number
  averageProgress: number
  overallAchievementRate: number
  totalKeyResults: number
  checkinsDueThisWeek: number
}

// Server Action 返り値
export type OkrActionResult = { success: true; id?: string } | { success: false; error: string }
```

---

## 5. クエリ設計（`src/features/okr/queries.ts`）

### 主要クエリ関数

| 関数名 | 概要 |
|--------|------|
| `getOkrDashboardData(tenantId, userId, fiscalYear, halfYear)` | ダッシュボード全データ取得 |
| `getObjectiveTree(tenantId, fiscalYear)` | ツリー表示用の階層構造取得 |
| `getObjectiveDetail(objectiveId, tenantId)` | 目標詳細＋KR一覧 |
| `getMyObjectives(employeeId, tenantId, fiscalYear)` | 個人目標一覧 |
| `getTeamObjectives(managerId, tenantId, fiscalYear)` | チーム目標一覧（管理職用） |
| `getCheckinHistory(keyResultId, limit?)` | チェックイン履歴 |
| `getAchievementRateByDivision(tenantId, fiscalYear)` | 部署別達成率（Recharts用） |

---

## 6. Server Actions設計（`src/features/okr/actions.ts`）

### アクション一覧

| アクション | 処理 | revalidate対象 |
|-----------|------|----------------|
| `createObjective(input)` | 目標新規作成 | `/adm/okr` |
| `updateObjective(id, input)` | 目標更新 | `/adm/okr`, `/adm/okr/[id]` |
| `deleteObjective(id)` | 目標削除（KRを含む CASCADE） | `/adm/okr` |
| `approveObjective(id)` | 目標承認（`approved_at` をセット） | `/adm/okr/[id]` |
| `createKeyResult(objectiveId, input)` | KR新規作成 | `/adm/okr/[objectiveId]` |
| `updateKeyResult(id, input)` | KR更新 | `/adm/okr/[objectiveId]` |
| `deleteKeyResult(id)` | KR削除 | `/adm/okr/[objectiveId]` |
| `submitCheckin(keyResultId, input)` | チェックイン記録＋KR進捗を自動更新 | `/adm/okr/[objectiveId]` |
| `linkToEvaluationSheet(objectiveId, sheetId)` | 評価シートと連動 | `/adm/okr/[objectiveId]` |

### チェックイン時の進捗自動計算ロジック

```typescript
// KRの進捗計算（定量型）
// startValue〜targetValue の範囲に対する currentValue の達成率
function calcKrProgress(startValue: number, currentValue: number, targetValue: number): number {
  if (targetValue === startValue) return 100
  const raw = ((currentValue - startValue) / (targetValue - startValue)) * 100
  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100))
}

// Objectiveの進捗 = KR進捗の加重平均
// キャンセル済みKRは除外して計算
function calcObjectiveProgress(keyResults: KeyResult[]): number {
  const active = keyResults.filter(kr => kr.status !== 'cancelled')
  if (active.length === 0) return 0
  const totalWeight = active.reduce((sum, kr) => sum + kr.weight, 0)
  if (totalWeight === 0) return 0
  const weightedSum = active.reduce((sum, kr) => sum + kr.progress * kr.weight, 0)
  return Math.round((weightedSum / totalWeight) * 100) / 100
}
```

### Server Action テンプレート（CLAUDE.md 準拠）

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { OkrActionResult } from './types'

export async function createObjective(
  input: z.infer<typeof createObjectiveSchema>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = createObjectiveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('objectives')
    .insert({
      ...parsed.data,
      tenant_id: user.tenant_id,
      created_by: user.employee_id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/okr')
  return { success: true, id: data.id }
}
```

---

## 7. ルーティング設計

### `src/config/routes.ts` に追加

```typescript
OKR: {
  ADMIN_DASHBOARD: '/adm/okr',
  ADMIN_TREE: '/adm/okr/tree',
  ADMIN_DETAIL: (objectiveId: string) => `/adm/okr/${objectiveId}`,
},
```

### ページ構成

| URL | ページ | 主な内容 |
|-----|--------|---------|
| `/adm/okr` | OKRダッシュボード | 達成率サマリー、タブ別目標一覧 |
| `/adm/okr/tree` | OKRツリービュー | 会社→部門→個人の階層ツリー |
| `/adm/okr/[objectiveId]` | 目標詳細 | KR一覧、チェックイン入力・履歴 |

---

## 8. UIコンポーネント設計

### 8.1 OKRダッシュボード（`/adm/okr`）レイアウト

```
┌─ /adm/okr — OKR・目標管理  ─────────────── パスバー bg-gray-100 ─┐
│                                                                   │
│  ┌── OKR・目標管理 ──────────────────────── [+ 目標を追加] ──── ┐  │
│  │  bg-gray-200 border-b border-gray-300                        │  │
│  │                                                              │  │
│  │  ┌─ 集計サマリー（4列グリッド）─────────────────────────┐  │  │
│  │  │  目標数  │  進行中  │  達成済  │  平均進捗 72%        │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌─ タブ: [会社目標 | 部門目標 | 個人目標 | チーム] ─── ┐  │  │
│  │  │  bg-white -mx-6 px-6 py-3.5 border-b border-gray-200   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ObjectiveCard × N ─────────────────────────────────────   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌── 部署別達成率 ─────────────────────────────────────────────┐  │
│  │  AchievementRateChart (Recharts BarChart)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 8.2 目標カード（`ObjectiveCard.tsx`）

```
┌─ [会社] 2026年度 上半期 ─────────────────────────────── [進行中] ┐
│  売上高1億円の達成                                    進捗 72%   │
│  ████████████████████░░░░░░  72%  (bg-green-500 or yellow/red)  │
│                                                                  │
│  Key Results (3件)                                               │
│  ● 新規契約件数 50件         ██████████  80%  [順調]             │
│  ● 顧客満足度スコア 4.5       ████████░░  65%  [要注意]           │
│  ● 解約率 3%以下              ██████████  70%  [順調]             │
│                                                                  │
│                                          [詳細] [チェックイン]   │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 チェックインモーダル（`CheckinFormModal.tsx`）

```
┌─ チェックイン: 新規契約件数 50件  ────────────────────────────────┐
│                                                                  │
│  達成見込み（信頼度）                                             │
│  ① ──────●─────── ⑤   現在: 3「普通」                           │
│  厳しい         達成確実                                         │
│                                                                  │
│  現在値（定量KRの場合）                                           │
│  [  35  ] 件   ／   目標: 50件                                   │
│                                                                  │
│  コメント（今週の状況・障壁・ネクストアクション）                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│                       [キャンセル]  [チェックインを記録]         │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 OKRツリービュー（`OkrTreeView.tsx`）

```
会社目標: 売上高1億円 ─────────────── 72%
  └── 部門目標: 営業部 50件達成 ───── 80%
        └── 個人目標: 田中さん 10件  ─ 60%
        └── 個人目標: 鈴木さん 15件  ─ 90%
  └── 部門目標: 開発部 満足度4.5 ─── 65%
        └── 個人目標: 山田さん ──────  70%
```

---

## 9. Zod バリデーションスキーマ

```typescript
// src/features/okr/actions.ts 内に定義
import { z } from 'zod'

export const createObjectiveSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  owner_type: z.enum(['company', 'division', 'employee']),
  owner_employee_id: z.string().uuid().nullable().optional(),
  owner_division_id: z.string().uuid().nullable().optional(),
  fiscal_year: z.number().int().min(2020).max(2100),
  half_year: z.enum(['first', 'second']).nullable().optional(),
  period_label: z.string().min(1).max(20),
  title: z.string().min(1, '目標タイトルは必須です').max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
})

export const createKeyResultSchema = z.object({
  objective_id: z.string().uuid(),
  title: z.string().min(1, 'KRタイトルは必須です').max(200),
  description: z.string().max(2000).nullable().optional(),
  kr_type: z.enum(['quantitative', 'qualitative']),
  target_value: z.number().nullable().optional(),
  start_value: z.number().default(0),
  unit: z.string().max(20).nullable().optional(),
  weight: z.number().min(0).max(100).default(100),
  due_date: z.string().date().nullable().optional(),
})

export const submitCheckinSchema = z.object({
  key_result_id: z.string().uuid(),
  confidence: z.number().int().min(1).max(5),
  current_value: z.number().nullable().optional(),
  comment: z.string().max(1000).nullable().optional(),
  checkin_date: z.string().date(),
})
```

---

## 10. 評価機能との連動設計

### 連動フロー

```
目標作成時（OKR側）
  → evaluation_sheet_id を紐づけ（任意）

評価シート確認時（評価側）
  → objectives.progress を参考値として表示
  → 自動スコアリングは行わず、評価者が参照して手動スコア入力

期末フロー
  ① OKR進捗確定（objectives.status = 'completed' or 'active'）
  ② 評価シートに「目標達成率: 72%」を参考表示
  ③ 評価者が評価シートの goal スコアを入力（手動）
```

### 既存テーブルへの影響

- `evaluation_sheets` — **変更なし**（参照のみ）
- `evaluation_goals` — **変更なし**（参照のみ）
- `objectives.evaluation_sheet_id` は NULL許容の外部キーのため、連動しない目標にも影響なし

---

## 11. アクセス制御

| 操作 | 許可ロール |
|------|-----------|
| 会社・部門目標の閲覧 | 全ロール |
| 会社・部門目標の作成・編集 | `tenant_admin`, `hr`, `hr_manager` |
| 個人目標の作成・編集 | 本人 + `tenant_admin`, `hr_manager` |
| 目標承認（approve） | `hr_manager`, `manager`（直属上長） |
| チェックイン記録 | 本人（KRオーナー）|
| 目標・KRの削除 | `tenant_admin`, `hr` のみ |

```typescript
// 実装上のロール定数（page.tsx のアクセス制御に使用）
const ADMIN_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer'] as const
const MANAGER_ROLES = ['manager', 'hr_manager', 'tenant_admin', 'developer'] as const
```

---

## 12. 実装フェーズ計画

### Phase 1: 基盤（3〜4日）

- [ ] Supabase マイグレーション作成（`20260607000000_add_okr_tables.sql`）
- [ ] `src/features/okr/types.ts` 作成
- [ ] `src/config/routes.ts` に `OKR` 定数追加
- [ ] `src/features/okr/queries.ts` — 基本クエリ実装
- [ ] `src/features/okr/actions.ts` — Objective/KR CRUD＋Zod実装

### Phase 2: ダッシュボード（3〜4日）

- [ ] `src/app/(tenant)/(colored)/adm/(okr)/okr/page.tsx`（Server Component）
- [ ] `loading.tsx` / `error.tsx` 配置
- [ ] `OkrDashboard.tsx` — タブ切替付きメインコンポーネント
- [ ] `ObjectiveCard.tsx` — 進捗バー付き目標カード
- [ ] `AchievementRateChart.tsx` — Recharts BarChart（部署別達成率）

### Phase 3: 目標・KR操作（3〜4日）

- [ ] `ObjectiveFormModal.tsx` — 目標作成・編集
- [ ] `KeyResultFormModal.tsx` — KR作成・編集
- [ ] `src/app/(tenant)/(colored)/adm/(okr)/okr/[objectiveId]/page.tsx` — 目標詳細
- [ ] `KeyResultList.tsx` — KR一覧
- [ ] `CheckinFormModal.tsx` — チェックイン入力（5段階スライダー）
- [ ] `CheckinHistoryList.tsx` — 履歴表示

### Phase 4: ツリービュー（2〜3日）

- [ ] `src/app/(tenant)/(colored)/adm/(okr)/okr/tree/page.tsx`
- [ ] `OkrTreeView.tsx` — 階層ツリー表示

### Phase 5: 評価連動・仕上げ（2〜3日）

- [ ] `EvaluationLinkBadge.tsx` — 評価シート連動バッジ
- [ ] `linkToEvaluationSheet` アクション実装
- [ ] サイドバーへの OKR メニュー追加（`AppSidebar.tsx` 既存ファイルを編集）
- [ ] 全ページの `loading.tsx` / `error.tsx` 確認

---

## 13. UIスタイル指針

[docs/ui/admin-card-and-table.md](../ui/admin-card-and-table.md) に準拠する。

| 要素 | Tailwind クラス |
|------|----------------|
| ページパスバー | `border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600` |
| メインカード | `overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm` |
| カードヘッダー | `bg-gray-200 border-b border-gray-300 px-6 py-5` |
| タイトル | `text-2xl font-bold tracking-tight text-gray-900` |
| 追加ボタン | `rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm` |
| タブ（選択） | `bg-primary text-white shadow-sm rounded-full px-4 py-1.5 text-sm font-medium` |
| タブ（非選択） | `border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-full px-4 py-1.5` |
| 進捗バー（外枠） | `h-2 w-full rounded-full bg-gray-200` |
| 進捗バー（塗り） | `h-2 rounded-full transition-all`＋色分け（下記） |

#### 進捗バーのカラー分岐

```typescript
function progressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}
```

---

## 14. 参照実装

| 参照対象 | ファイルパス |
|---------|-------------|
| ページ骨格 | `src/app/(tenant)/(colored)/adm/(one_on_one)/one-on-one/page.tsx` |
| フォームモーダル | `src/features/one-on-one/components/SessionFormModal.tsx` |
| Recharts グラフ | `src/features/one-on-one/components/ImplementationRateChart.tsx` |
| ステータス管理型 | `src/features/evaluation/types.ts` |
| カード＋テーブル UI | `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` |
| マイグレーション形式 | `supabase/migrations/20260604200000_add_one_on_one_tables.sql` |

---

## 15. 注意事項・禁止事項

| 項目 | 内容 |
|------|------|
| **既存データ保護** | `supabase db reset` 禁止。マイグレーションは新規テーブル追加のみ |
| **RLS必須** | 全新規テーブルに `tenant_isolation` ポリシーを設定する |
| **`createAdminClient()` 禁止** | エンドユーザー向け `actions.ts` では使用しない |
| **URL直書き禁止** | 必ず `APP_ROUTES.OKR.*` を使用する |
| **`npx supabase` 禁止** | グローバルインストール版 `supabase` コマンドを使用する |
| **コメント言語** | コードコメントは日本語で記述する |
| **データアクセス** | `page.tsx` 内に `supabase.from(...)` を直書きしない。`queries.ts` に集約する |
