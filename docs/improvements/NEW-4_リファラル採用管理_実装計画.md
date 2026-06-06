# NEW-4 リファラル採用管理 実装計画

作成日：2026-06-07
参照：docs/improvements/SaaS機能改善2026_06_03.md（NEW-4）

---

## 1. 概要

社員紹介採用（リファラル）は採用コストが最も低く、マッチング精度が高い手法だが、仕組みがなく運用されていない。本機能は推薦・選考・採用・報奨金支払いまでを一元管理し、社員のモチベーションも高める。

### ペルソナが得るもの

| ペルソナ | 価値 |
|---|---|
| 経営者 | 採用単価削減・質の高い採用ができる |
| 人事担当者 | 推薦状況・報奨金支払いを一元管理できる |
| 一般社員 | 知人を推薦でき、採用されたら報奨金が貰える |

---

## 2. 実装スコープ

### 管理者画面（人事向け）

| 画面 | URL | 説明 |
|---|---|---|
| リファラル一覧 | `/adm/referral` | 全推薦一覧・ステータス管理・報奨金支払い |
| 推薦詳細 | `/adm/referral/[id]` | 個別推薦の詳細・選考メモ・ステータス更新 |
| 求人ポスト管理 | `/adm/referral/postings` | リファラル対象求人の公開設定 |
| 報奨金管理 | `/adm/referral/rewards` | 報奨金支払い管理・履歴 |

### 従業員向け画面（ポータル）

| 画面 | URL | 説明 |
|---|---|---|
| 推薦フォーム | `/referral` | 知人を推薦する入力フォーム |
| マイ推薦一覧 | `/referral/my` | 自分の推薦状況・進捗確認 |

---

## 3. ディレクトリ構成

```
src/
├── features/referral/
│   ├── types.ts              # ドメイン型定義
│   ├── queries.ts            # SELECT 専用
│   ├── actions.ts            # Server Actions（INSERT / UPDATE / DELETE）
│   └── components/
│       ├── ReferralListTable.tsx         # 推薦一覧テーブル
│       ├── ReferralStatusBadge.tsx       # ステータスバッジ
│       ├── ReferralDetailPanel.tsx       # 詳細パネル
│       ├── ReferralPostingSelector.tsx   # 求人選択コンポーネント
│       ├── NominationForm.tsx            # 推薦フォーム（従業員向け）
│       ├── ReferralRankingCard.tsx       # 推薦件数ランキングカード
│       ├── RewardManagementTable.tsx     # 報奨金管理テーブル
│       └── ReferralPostingCard.tsx       # リファラル求人カード
│
├── app/(tenant)/(colored)/adm/(recurit)/
│   └── referral/
│       ├── page.tsx          # 管理者：推薦一覧
│       ├── loading.tsx
│       ├── error.tsx
│       ├── [id]/
│       │   ├── page.tsx      # 管理者：推薦詳細
│       │   ├── loading.tsx
│       │   └── error.tsx
│       ├── postings/
│       │   ├── page.tsx      # 管理者：リファラル求人管理
│       │   ├── loading.tsx
│       │   └── error.tsx
│       └── rewards/
│           ├── page.tsx      # 管理者：報奨金管理
│           ├── loading.tsx
│           └── error.tsx
│
└── app/(tenant)/(default)/
    └── referral/
        ├── page.tsx          # 従業員：推薦フォーム
        ├── loading.tsx
        ├── error.tsx
        └── my/
            ├── page.tsx      # 従業員：マイ推薦一覧
            ├── loading.tsx
            └── error.tsx
```

---

## 4. データベース設計

マイグレーションファイル名：`20260607030000_add_referral_tables.sql`

**原則：既存テーブルは一切変更しない。新規テーブルのみ追加。**

### 4-1. `referral_postings` — リファラル対象求人

| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL → tenants | テナント分離キー |
| `job_posting_id` | UUID → job_postings | 既存求人票との紐付け（任意） |
| `title` | TEXT NOT NULL | 求人タイトル |
| `description` | TEXT | 求人詳細 |
| `department` | TEXT | 募集部署 |
| `employment_type` | TEXT CHECK | `full_time` / `part_time` / `contract` |
| `reward_amount` | INTEGER DEFAULT 0 | 報奨金額（円） |
| `reward_condition` | TEXT | 支払い条件（例：試用期間3ヶ月経過後） |
| `is_active` | BOOLEAN DEFAULT true | 社員向け公開フラグ |
| `deadline` | DATE | 募集締切 |
| `created_by` | UUID → employees | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | トリガーで自動更新 |

### 4-2. `referral_nominations` — 推薦記録

| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL → tenants | テナント分離キー |
| `referral_posting_id` | UUID NOT NULL → referral_postings | 推薦対象求人 |
| `referrer_employee_id` | UUID NOT NULL → employees | 推薦した社員 |
| `nominee_name` | TEXT NOT NULL | 推薦された人の名前 |
| `nominee_email` | TEXT | 推薦された人のメール |
| `nominee_phone` | TEXT | 推薦された人の電話番号 |
| `relationship` | TEXT | 関係性（元同僚・友人・知人等） |
| `nomination_reason` | TEXT | 推薦理由 |
| `status` | TEXT NOT NULL DEFAULT `'pending'` | 選考ステータス（下表参照） |
| `hr_notes` | TEXT | 人事メモ（社員には非公開） |
| `hired_at` | DATE | 入社日（hired 時のみ入力） |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | トリガーで自動更新 |

**status の値（CHECK 制約）**

| 値 | 日本語ラベル |
|---|---|
| `pending` | 推薦受付 |
| `reviewing` | 書類選考中 |
| `interview` | 面接中 |
| `offered` | 内定 |
| `hired` | 入社確定 |
| `rejected` | 不採用 |
| `withdrawn` | 辞退 |

### 4-3. `referral_rewards` — 報奨金支払い管理

| カラム | 型 | 説明 |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL → tenants | テナント分離キー |
| `nomination_id` | UUID NOT NULL UNIQUE → referral_nominations | 推薦との1対1対応 |
| `referrer_employee_id` | UUID NOT NULL → employees | 報奨金受取社員 |
| `amount` | INTEGER NOT NULL | 支払い金額（円） |
| `status` | TEXT NOT NULL DEFAULT `'pending'` | `pending` / `approved` / `paid` / `cancelled` |
| `scheduled_date` | DATE | 支払い予定日 |
| `paid_at` | DATE | 実際の支払日 |
| `approved_by` | UUID → employees | 承認者 |
| `notes` | TEXT | 備考 |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | トリガーで自動更新 |

### 4-4. RLS ポリシー

3テーブルすべてに `tenant_isolation` ポリシーを設定する。`auth.uid()` から `employees.user_id` を介して `tenant_id` を解決するパターン（プロジェクト全体で統一済み）。

### 4-5. インデックス設計

```
referral_postings    : (tenant_id, is_active)
referral_nominations : (tenant_id, status)
referral_nominations : (tenant_id, referrer_employee_id)
referral_nominations : (referral_posting_id)
referral_rewards     : (tenant_id, status)
referral_rewards     : (tenant_id, referrer_employee_id)
```

---

## 5. 型定義（`src/features/referral/types.ts`）

```typescript
/** リファラル対象求人 */
export interface ReferralPosting {
  id: string
  tenant_id: string
  job_posting_id: string | null
  title: string
  description: string | null
  department: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | null
  reward_amount: number
  reward_condition: string | null
  is_active: boolean
  deadline: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 推薦ステータス */
export type NominationStatus =
  | 'pending'
  | 'reviewing'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export const NOMINATION_STATUS_LABELS: Record<NominationStatus, string> = {
  pending:   '推薦受付',
  reviewing: '書類選考中',
  interview: '面接中',
  offered:   '内定',
  hired:     '入社確定',
  rejected:  '不採用',
  withdrawn: '辞退',
}

/** 入社確定時に報奨金を自動生成するトリガーとなるステータス */
export const REWARD_TRIGGER_STATUS: NominationStatus = 'hired'

/** アクティブな選考中ステータス */
export const ACTIVE_NOMINATION_STATUSES: NominationStatus[] = [
  'pending', 'reviewing', 'interview', 'offered',
]

/** 推薦記録 */
export interface ReferralNomination {
  id: string
  tenant_id: string
  referral_posting_id: string
  referrer_employee_id: string
  nominee_name: string
  nominee_email: string | null
  nominee_phone: string | null
  relationship: string | null
  nomination_reason: string | null
  status: NominationStatus
  hr_notes: string | null
  hired_at: string | null
  created_at: string
  updated_at: string
  // JOIN で取得
  referral_posting?: Pick<ReferralPosting, 'id' | 'title' | 'reward_amount'>
  referrer?: { id: string; name: string }
}

/** 報奨金支払いステータス */
export type RewardStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  pending:   '支払い待ち',
  approved:  '承認済み',
  paid:      '支払い完了',
  cancelled: 'キャンセル',
}

/** 報奨金支払いレコード */
export interface ReferralReward {
  id: string
  tenant_id: string
  nomination_id: string
  referrer_employee_id: string
  amount: number
  status: RewardStatus
  scheduled_date: string | null
  paid_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // JOIN
  nomination?: Pick<ReferralNomination, 'id' | 'nominee_name' | 'referral_posting_id'>
  referrer?: { id: string; name: string }
}

/** 推薦フォーム入力（従業員向け） */
export interface CreateNominationInput {
  referral_posting_id: string
  nominee_name: string
  nominee_email?: string
  nominee_phone?: string
  relationship?: string
  nomination_reason?: string
}

/** ステータス更新入力（人事向け） */
export interface UpdateNominationStatusInput {
  status: NominationStatus
  hr_notes?: string
  hired_at?: string  // status === 'hired' の場合のみ入力
}

/** 推薦件数ランキング（上位N名） */
export interface ReferralRankingItem {
  employee_id: string
  employee_name: string
  total_nominations: number
  hired_count: number
}

/** 管理者向けサマリー */
export interface ReferralSummary {
  total_active: number
  hired_this_month: number
  pending_rewards: number
  pending_reward_amount: number
}
```

---

## 6. クエリ関数（`src/features/referral/queries.ts`）

```typescript
// 管理者向け
export async function getReferralNominations(filters?: {
  status?: NominationStatus
  referral_posting_id?: string
}): Promise<ReferralNomination[]>

export async function getReferralNominationById(id: string): Promise<ReferralNomination | null>

export async function getReferralPostings(activeOnly?: boolean): Promise<ReferralPosting[]>

export async function getReferralRewards(filters?: {
  status?: RewardStatus
}): Promise<ReferralReward[]>

export async function getReferralRanking(limit?: number): Promise<ReferralRankingItem[]>

export async function getReferralSummary(): Promise<ReferralSummary>

// 従業員向け（hr_notes は SELECT しない）
export async function getActiveReferralPostings(): Promise<ReferralPosting[]>
export async function getMyNominations(employeeId: string): Promise<ReferralNomination[]>
```

---

## 7. Server Actions（`src/features/referral/actions.ts`）

```typescript
/** 従業員：知人を推薦する */
export async function createNomination(
  input: CreateNominationInput
): Promise<{ success: boolean; error?: string }>

/**
 * 人事：推薦ステータスを更新する
 * status が 'hired' になった場合、referral_rewards を自動 INSERT する
 */
export async function updateNominationStatus(
  nominationId: string,
  input: UpdateNominationStatusInput
): Promise<{ success: boolean; error?: string }>

/** 人事：リファラル求人を作成する */
export async function createReferralPosting(
  input: Omit<ReferralPosting, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }>

/** 人事：リファラル求人を更新する */
export async function updateReferralPosting(
  postingId: string,
  input: Partial<Omit<ReferralPosting, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }>

/** 人事：報奨金ステータスを更新する（承認・支払い完了など） */
export async function updateRewardStatus(
  rewardId: string,
  input: {
    status: RewardStatus
    scheduled_date?: string
    paid_at?: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }>
```

### 報奨金の自動生成ロジック（`updateNominationStatus` 内）

```typescript
// status === 'hired' になった時点で報奨金レコードを自動生成する
if (input.status === 'hired') {
  const { data: nomination } = await supabase
    .from('referral_nominations')
    .select('referral_posting_id, referrer_employee_id, tenant_id')
    .eq('id', nominationId)
    .single()

  const { data: posting } = await supabase
    .from('referral_postings')
    .select('reward_amount')
    .eq('id', nomination.referral_posting_id)
    .single()

  if (posting && posting.reward_amount > 0) {
    await supabase.from('referral_rewards').insert({
      tenant_id: nomination.tenant_id,
      nomination_id: nominationId,
      referrer_employee_id: nomination.referrer_employee_id,
      amount: posting.reward_amount,
      status: 'pending',
    })
  }
}
```

---

## 8. 画面設計

### 8-1. 管理者：推薦一覧（`/adm/referral`）

**サマリーカード行（4枚）**

| カード | 指標 | 色 |
|---|---|---|
| アクティブ推薦件数 | 選考中の件数 | 青 |
| 今月入社確定 | 今月 `hired` になった件数 | 緑 |
| 未払い報奨金件数 | `pending` の報奨金件数 | 黄 |
| 未払い報奨金総額 | 合計金額（円） | 黄 |

**推薦一覧テーブル**

| カラム | 内容 |
|---|---|
| 推薦日 | `created_at`（YYYY/MM/DD） |
| 候補者名 | `nominee_name` |
| 推薦求人 | `referral_posting.title` |
| 推薦者 | `referrer.name` |
| ステータス | `ReferralStatusBadge` |
| 最終更新 | `updated_at` |
| 操作 | 詳細ボタン |

- フィルタ：ステータス（全て / 選考中 / 入社確定 / 不採用）・求人
- ソート：推薦日降順（デフォルト）

### 8-2. 管理者：推薦詳細（`/adm/referral/[id]`）

- 候補者基本情報（名前・メール・電話番号）
- 推薦者情報（氏名・部署）
- 推薦求人（タイトル・報奨金額）
- 関係性・推薦理由（テキスト表示）
- ステータス変更フォーム（ドロップダウン + 人事メモ入力欄）
- 入社日入力フィールド（`hired` 選択時のみ表示）
- ステータス変更履歴（`updated_at` の履歴）

### 8-3. 管理者：リファラル求人管理（`/adm/referral/postings`）

- 求人カードグリッド（タイトル・部署・報奨金額・推薦件数・公開状態バッジ）
- 「新しい求人を追加」ボタン → モーダルフォーム
- 既存 `job_postings` からのインポートオプション
- 各カードに公開/非公開切り替えトグル

### 8-4. 管理者：報奨金管理（`/adm/referral/rewards`）

- フィルタタブ：未払い / 承認済み / 支払い完了
- テーブル：推薦者名・候補者名・金額・支払い予定日・ステータス
- 一括承認（チェックボックス選択 → 承認ボタン）
- 支払い完了処理（支払い日入力 → `paid` に更新）

### 8-5. 従業員：推薦フォーム（`/referral`）

- 公開中リファラル求人のカード一覧
- 各求人に「この求人で知人を推薦する」ボタン
- 推薦フォームスライドイン（候補者名・メール・電話・関係性・推薦理由）
- 送信後：「推薦を受け付けました」確認メッセージ
- 「マイ推薦一覧へ」リンク

### 8-6. 従業員：マイ推薦一覧（`/referral/my`）

- 自分の推薦一覧（候補者名・求人名・推薦日・ステータス）
- ステータスバッジ（色付き）
- 報奨金の状況（対象・支払い予定・支払い済み）
- 推薦件数ランキング TOP10（社員全体、入社確定数付き）

---

## 9. APP_ROUTES 追加定義

`src/config/routes.ts` の `TENANT` ブロックに以下を追加する：

```typescript
/** リファラル採用管理（NEW-4）管理者一覧 */
ADMIN_REFERRAL: '/adm/referral',
/** リファラル推薦詳細 */
ADMIN_REFERRAL_DETAIL: (id: string) => `/adm/referral/${id}`,
/** リファラル求人管理 */
ADMIN_REFERRAL_POSTINGS: '/adm/referral/postings',
/** リファラル報奨金管理 */
ADMIN_REFERRAL_REWARDS: '/adm/referral/rewards',
/** 従業員：推薦フォーム */
REFERRAL_FORM: '/referral',
/** 従業員：マイ推薦一覧 */
REFERRAL_MY: '/referral/my',
```

---

## 10. マイグレーション SQL（`20260607030000_add_referral_tables.sql`）

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。
-- リファラル採用管理機能（NEW-4）

-- =========================================================
-- referral_postings — リファラル対象求人
-- =========================================================
CREATE TABLE public.referral_postings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  job_posting_id  UUID        REFERENCES public.job_postings(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  department      TEXT,
  employment_type TEXT        CHECK (employment_type IN ('full_time','part_time','contract')),
  reward_amount   INTEGER     NOT NULL DEFAULT 0,
  reward_condition TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  deadline        DATE,
  created_by      UUID        REFERENCES public.employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_postings
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_postings_tenant_active
  ON public.referral_postings(tenant_id, is_active);

CREATE TRIGGER trg_referral_postings_updated_at
  BEFORE UPDATE ON public.referral_postings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- referral_nominations — 推薦記録
-- =========================================================
CREATE TABLE public.referral_nominations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES public.tenants(id),
  referral_posting_id  UUID        NOT NULL REFERENCES public.referral_postings(id),
  referrer_employee_id UUID        NOT NULL REFERENCES public.employees(id),
  nominee_name         TEXT        NOT NULL,
  nominee_email        TEXT,
  nominee_phone        TEXT,
  relationship         TEXT,
  nomination_reason    TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
                         'pending','reviewing','interview',
                         'offered','hired','rejected','withdrawn'
                       )),
  hr_notes             TEXT,
  hired_at             DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_nominations
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_nominations_tenant_status
  ON public.referral_nominations(tenant_id, status);
CREATE INDEX idx_referral_nominations_referrer
  ON public.referral_nominations(tenant_id, referrer_employee_id);
CREATE INDEX idx_referral_nominations_posting
  ON public.referral_nominations(referral_posting_id);

CREATE TRIGGER trg_referral_nominations_updated_at
  BEFORE UPDATE ON public.referral_nominations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- referral_rewards — 報奨金支払い管理
-- =========================================================
CREATE TABLE public.referral_rewards (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES public.tenants(id),
  nomination_id         UUID        NOT NULL REFERENCES public.referral_nominations(id) UNIQUE,
  referrer_employee_id  UUID        NOT NULL REFERENCES public.employees(id),
  amount                INTEGER     NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid','cancelled')),
  scheduled_date        DATE,
  paid_at               DATE,
  approved_by           UUID        REFERENCES public.employees(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_rewards
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_rewards_tenant_status
  ON public.referral_rewards(tenant_id, status);
CREATE INDEX idx_referral_rewards_referrer
  ON public.referral_rewards(tenant_id, referrer_employee_id);

CREATE TRIGGER trg_referral_rewards_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## 11. 実装手順

### Step 1: DB マイグレーション

1. `supabase/migrations/20260607030000_add_referral_tables.sql` を作成
2. ローカルで `supabase migration up` を実行
3. `supabase gen types typescript --local > src/lib/supabase/types.ts` で型再生成

### Step 2: APP_ROUTES に定数追加

`src/config/routes.ts` の `TENANT` ブロックに上記6定数を追加する。

### Step 3: `src/features/referral/` を実装（依存順）

1. `types.ts`
2. `queries.ts`
3. `actions.ts`
4. `components/ReferralStatusBadge.tsx`（最もシンプルな単一コンポーネント）
5. `components/ReferralPostingCard.tsx`
6. `components/ReferralListTable.tsx`
7. `components/NominationForm.tsx`
8. `components/ReferralDetailPanel.tsx`
9. `components/ReferralRankingCard.tsx`
10. `components/RewardManagementTable.tsx`
11. `components/ReferralPostingSelector.tsx`

### Step 4: 管理者ページを実装

1. `(recurit)/referral/loading.tsx` / `error.tsx`
2. `(recurit)/referral/page.tsx`（一覧）
3. `(recurit)/referral/postings/` 以下
4. `(recurit)/referral/rewards/` 以下
5. `(recurit)/referral/[id]/` 以下

### Step 5: 従業員向けページを実装

1. `(default)/referral/loading.tsx` / `error.tsx`
2. `(default)/referral/page.tsx`
3. `(default)/referral/my/` 以下

---

## 12. 工数見積もり

| フェーズ | 内容 | 工数目安 |
|---|---|---|
| DB・型 | マイグレーション + 型定義 | 0.5日 |
| データ層 | queries.ts + actions.ts | 1.5日 |
| コンポーネント | 8コンポーネント | 2日 |
| 管理者ページ | 4画面 + loading/error | 2.5日 |
| 従業員ページ | 2画面 + loading/error | 1.5日 |
| テスト・確認 | RLS確認・結合確認 | 1日 |
| **合計** | | **約9日** |

---

## 13. UI設計の原則（SaaS機能改善2026_06_03.md 準拠）

- **1画面1メッセージ** — 管理者一覧は「今何件が選考中か・報奨金が滞っていないか」が3秒で分かる
- **色で状態を伝える** — `pending`=黄、`reviewing`/`interview`=青、`hired`=緑、`rejected`/`withdrawn`=赤
- **既存スタイルに準拠** — `docs/ui/admin-card-and-table.md` のカード／テーブルスタイルを維持
- **必須ファイル配置** — 各ルートに `loading.tsx` と `error.tsx` を必ず配置
- **RLS 必須** — 全テーブルに RLS ポリシーを設定し、テナント間データ漏洩を完全防止
- **既存データへの影響ゼロ** — 新規テーブルの追加のみ。`supabase db reset` は絶対に実行しない
