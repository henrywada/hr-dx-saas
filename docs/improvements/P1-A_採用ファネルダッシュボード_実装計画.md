# P1-A 採用ファネルダッシュボード 実装計画

作成日：2026-06-03  
対応課題：#1 採用難  
優先度：最高（工数対効果 ★★★）

---

## 1. 概要

### ゴール

人事責任者・経営者が「今の採用状況」を1画面・3秒で把握できるダッシュボードを構築する。

### ペルソナが得るもの

| ペルソナ | Before | After |
|---|---|---|
| 経営者 | 各担当者に口頭で確認しないと選考状況が分からない | 今週何人面接して内定を出しているか1分で確認できる |
| 人事 | 放置候補者の発見が遅れ、辞退につながる | N日以上未アクション候補者が自動ハイライトされ、担当者への催促が即座にできる |

### 工数目安

**3〜5日**（既存テーブルの活用 + `candidates` テーブル新設）

---

## 2. 現状分析

### 既存機能・テーブル

| 機能 | ファイル | テーブル | 現状 |
|---|---|---|---|
| 求人票管理 | `src/features/job-postings/` | `job_postings` | status: draft/published/closed |
| 候補者パルス | `src/features/candidate-pulse/` | `candidate_pulses` | selection_step（自由テキスト）, sentiment_score |
| 内定バリデーション | `src/features/offer-validation/` | なし | フォームのみ、DBなし |
| 採用AI | `src/features/recruitment-ai/` | なし | AI生成のみ |

### ギャップ（なぜ今のままでは動かないか）

1. `candidate_pulses.selection_step` が**自由テキスト**のため、ファネルステージの集計ができない
2. 候補者に**担当者（employee_id）が紐づいていない** → 担当者別タスクが集計できない
3. **最終アクション日時が記録されていない** → 放置日数の計算ができない
4. **内定辞退・入社フラグが存在しない** → ファネル末端の数値がない

### 結論

`candidate_pulses` は「候補者の感情調査」が本来の目的であり責務が異なる。  
ファネル管理専用の `candidates` テーブルを新設し、`job-postings` featureを拡張する。

---

## 3. DBスキーマ設計

### 3-1. `candidates` テーブル（新設）

```sql
CREATE TABLE public.candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  job_posting_id  UUID REFERENCES public.job_postings(id),
  name            text NOT NULL,
  email           text,
  phone           text,
  stage           text NOT NULL DEFAULT 'applied'
    CHECK (stage IN (
      'applied',       -- 応募
      'screening',     -- 書類選考
      'interview_1',   -- 一次面接
      'interview_2',   -- 二次面接
      'final',         -- 最終面接
      'offered',       -- 内定
      'hired',         -- 入社
      'rejected',      -- 不採用
      'withdrawn'      -- 辞退
    )),
  assigned_to     UUID REFERENCES public.employees(id),
  last_action_at  timestamptz NOT NULL DEFAULT NOW(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.candidates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );

-- stage 変更時に last_action_at / updated_at を自動更新
CREATE OR REPLACE FUNCTION public.update_candidate_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.last_action_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_update_timestamps
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_candidate_timestamps();
```

### 3-2. `job_postings` への target_count 追加（任意）

```sql
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS target_count integer DEFAULT 1;
```

---

## 4. 機能設計

### 4-1. ファネル数値表示

アクティブステージ（応募 → 書類 → 一次 → 二次 → 最終 → 内定 → 入社）の候補者数を横並びカードで表示。各ステージ間に通過率（%）を矢印で表示。カードをクリックすると該当候補者一覧へドリルダウン。

### 4-2. 放置候補者ハイライト

`last_action_at` が N日（デフォルト7日）以上更新されていない候補者を自動抽出。終了ステージ（hired / rejected / withdrawn）は対象外。赤背景カードで警告表示。「催促する」ボタンは担当者のメールアドレスへの `mailto:` リンクを生成。

### 4-3. 担当者別タスク残件数バッジ

`assigned_to` ごとにアクティブ件数を集計。担当者名・件数・放置件数をバッジで表示。

### 4-4. 内定辞退率の推移グラフ

月別に `offered → withdrawn` の割合を計算。Recharts `LineChart` で過去6ヶ月分を表示。

---

## 5. ファイル構成

```
src/
├── features/
│   └── job-postings/
│       ├── types.ts                【変更】Candidate型・FunnelDashboardData型を追加
│       ├── queries.ts              【変更】getRecruitFunnelData() を追加
│       ├── actions.ts              【変更】候補者CRUD・ステージ更新アクションを追加
│       └── components/
│           ├── FunnelChart.tsx     【新設】ファネル数値＋矢印表示
│           ├── StaleAlert.tsx      【新設】放置候補者カード一覧
│           ├── AssigneeBoard.tsx   【新設】担当者別タスクバッジ
│           ├── WithdrawalTrend.tsx 【新設】辞退率折れ線グラフ
│           └── CandidateTable.tsx  【新設】候補者一覧テーブル（ドリルダウン先）
│
├── app/(tenant)/(colored)/adm/(recurit)/
│   └── funnel/
│       ├── page.tsx                【新設】Server Component（データ取得）
│       ├── loading.tsx             【新設】スケルトンUI
│       └── error.tsx               【新設】エラー表示
│
└── config/
    └── routes.ts                   【変更】ADMIN_RECRUIT_FUNNEL 定数追加
```

---

## 6. 型定義（`types.ts` 追加分）

```typescript
export type CandidateStage =
  | 'applied' | 'screening' | 'interview_1' | 'interview_2'
  | 'final' | 'offered' | 'hired' | 'rejected' | 'withdrawn'

export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: '応募',
  screening: '書類選考',
  interview_1: '一次面接',
  interview_2: '二次面接',
  final: '最終面接',
  offered: '内定',
  hired: '入社',
  rejected: '不採用',
  withdrawn: '辞退',
}

export const ACTIVE_STAGES: CandidateStage[] = [
  'applied', 'screening', 'interview_1', 'interview_2', 'final', 'offered', 'hired'
]

export interface Candidate {
  id: string
  tenant_id: string
  job_posting_id: string | null
  name: string
  email: string | null
  phone: string | null
  stage: CandidateStage
  assigned_to: string | null
  last_action_at: string
  notes: string | null
  created_at: string
  updated_at: string
  job_posting?: Pick<JobPosting, 'id' | 'title'>
  assignee?: { id: string; name: string }
}

export interface FunnelStageCount {
  stage: CandidateStage
  count: number
  stale_count: number
}

export interface AssigneeTaskCount {
  employee_id: string
  employee_name: string
  active_count: number
  stale_count: number
}

export interface WithdrawalRatePoint {
  month: string   // 'YYYY-MM'
  offered: number
  withdrawn: number
  rate: number    // withdrawn / offered * 100
}

export interface FunnelDashboardData {
  funnelCounts: FunnelStageCount[]
  staleCandidates: Candidate[]
  assigneeCounts: AssigneeTaskCount[]
  withdrawalTrend: WithdrawalRatePoint[]
  staleThresholdDays: number
}
```

---

## 7. データ取得（`queries.ts` 追加分）

```typescript
const STALE_DEFAULT_DAYS = 7

export async function getRecruitFunnelData(
  staleThresholdDays = STALE_DEFAULT_DAYS
): Promise<FunnelDashboardData> {
  const supabase = await createClient()

  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - staleThresholdDays)

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // 並列取得
  const [funnelRes, staleRes, assigneeRes, withdrawalRes] = await Promise.all([
    // 全アクティブ候補者（ステージ集計用）
    supabase
      .from('candidates')
      .select('stage, last_action_at')
      .not('stage', 'in', '(rejected,withdrawn)'),

    // 放置候補者
    supabase
      .from('candidates')
      .select('*, job_posting:job_postings(id, title)')
      .not('stage', 'in', '(hired,rejected,withdrawn)')
      .lt('last_action_at', staleThreshold.toISOString())
      .order('last_action_at', { ascending: true }),

    // 担当者別件数
    supabase
      .from('candidates')
      .select('assigned_to, stage, last_action_at, assignee:employees!assigned_to(id, name)')
      .not('stage', 'in', '(hired,rejected,withdrawn)'),

    // 辞退率推移（過去6ヶ月）
    supabase
      .from('candidates')
      .select('stage, created_at')
      .in('stage', ['offered', 'withdrawn'])
      .gte('created_at', sixMonthsAgo.toISOString()),
  ])

  // 集計処理（クライアントサイド）
  const funnelCounts = aggregateFunnelCounts(funnelRes.data ?? [], staleThreshold)
  const assigneeCounts = aggregateAssigneeCounts(assigneeRes.data ?? [], staleThreshold)
  const withdrawalTrend = aggregateWithdrawalTrend(withdrawalRes.data ?? [])

  return {
    funnelCounts,
    staleCandidates: (staleRes.data ?? []) as Candidate[],
    assigneeCounts,
    withdrawalTrend,
    staleThresholdDays,
  }
}
```

---

## 8. Server Actions（`actions.ts` 追加分）

```typescript
'use server'

// ステージ更新（last_action_at はDB Triggerで自動更新）
export async function updateCandidateStage(
  candidateId: string,
  stage: CandidateStage
): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('candidates')
    .update({ stage })
    .eq('id', candidateId)

  if (error) throw error
  revalidatePath(APP_ROUTES.TENANT.ADMIN_RECRUIT_FUNNEL)
}

// 候補者新規登録
export async function createCandidate(
  input: CreateCandidateInput
): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('candidates')
    .insert({ ...input, tenant_id: user.tenant_id })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath(APP_ROUTES.TENANT.ADMIN_RECRUIT_FUNNEL)
  return { id: data.id }
}
```

---

## 9. UI レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│  採用ファネルダッシュボード                 [+ 候補者を登録] │
├──────────────────────────────────────────────────────────────┤
│  ■ ファネル（全求人合計）                                    │
│                                                              │
│  [応募:24] →82%→ [書類:20] →60%→ [一次:12] →75%→ [二次:9] │
│  →78%→ [最終:7] →86%→ [内定:6] →83%→ [入社:5]              │
│                                                              │
├──────────────────────────┬───────────────────────────────────┤
│  ⚠ 放置候補者 (3件)      │  担当者別 アクティブ件数         │
│  7日以上アクションなし   │                                   │
│                          │  田中 太郎   8件 [⚠3放置]        │
│  山田 花子   12日放置     │  佐藤 次郎   5件                  │
│  一次面接  [催促する]    │  鈴木 三郎   3件 [⚠1放置]        │
│                          │                                   │
│  木村 大輔   9日放置      │                                   │
│  書類選考  [催促する]    │                                   │
├──────────────────────────┴───────────────────────────────────┤
│  ■ 内定辞退率の推移（過去6ヶ月）                            │
│  1月:12% ─ 2月:8% ─ 3月:15% ─ 4月:10% ─ 5月:7% ─ 6月:9%  │
└──────────────────────────────────────────────────────────────┘
```

### デザイン原則

- 既存 `docs/ui/admin-card-and-table.md` スタイルに準拠
- ファネルカード：`bg-white border rounded-lg shadow-sm`
- 放置カード：`bg-red-50 border-red-200`（警告）
- アクション最大3つ：「詳細を見る」「催促する」「ステージ変更」

---

## 10. ルーティング設定

### `src/config/routes.ts` 追加

```typescript
ADMIN_RECRUIT_FUNNEL: '/adm/recruit/funnel',
```

### ルートパス

`src/app/(tenant)/(colored)/adm/(recurit)/funnel/page.tsx`

既存の `(recurit)` ルートグループに `funnel/` ディレクトリを追加するため、レイアウト・ミドルウェアへの影響はなし。

---

## 11. 実装タスク一覧（5日計画）

### Day 1 — DBマイグレーション + 型定義

- [ ] `supabase/migrations/YYYYMMDD_add_candidates_table.sql` 作成
- [ ] ローカル Supabase でマイグレーション適用（`supabase migration up`）
- [ ] `src/features/job-postings/types.ts` に型定義追加
- [ ] `src/config/routes.ts` に `ADMIN_RECRUIT_FUNNEL` 追加

### Day 2 — データ取得・アクション層

- [ ] `src/features/job-postings/queries.ts` に `getRecruitFunnelData()` 実装
- [ ] `src/features/job-postings/actions.ts` に `createCandidate()` / `updateCandidateStage()` 実装
- [ ] ダミーデータを INSERT してクエリ動作確認

### Day 3 — コンポーネント実装

- [ ] `FunnelChart.tsx` — ステージカード + 矢印 + 通過率
- [ ] `StaleAlert.tsx` — 放置候補者一覧カード
- [ ] `AssigneeBoard.tsx` — 担当者別タスクバッジ
- [ ] `WithdrawalTrend.tsx` — Recharts LineChart

### Day 4 — ページ組み立て

- [ ] `funnel/page.tsx` 実装（Server Component）
- [ ] `funnel/loading.tsx` / `funnel/error.tsx` 配置
- [ ] `CandidateTable.tsx` — ドリルダウン先一覧テーブル
- [ ] サイドメニューへ「採用ファネル」リンク追加

### Day 5 — テスト・最終調整

- [ ] 開発サーバーで全機能の動作確認（ゴールデンパス）
- [ ] ダミーデータでファネル / 放置アラート / 辞退率グラフを確認
- [ ] レスポンシブ確認（768px / 1280px）
- [ ] `npm run type-check` / `npm run lint` パス確認

---

## 12. 技術的注意事項

### CLAUDE.md 遵守事項

| ルール | 対応 |
|---|---|
| `page.tsx` に `supabase.from()` を直接書かない | `queries.ts` に集約 |
| `createAdminClient()` を使わない | `createClient()` のみ使用（RLSで自テナント限定） |
| 新テーブルに RLS ポリシーを設定する | `candidates` に `tenant_isolation` ポリシーを追加 |
| URL のハードコード禁止 | `APP_ROUTES.TENANT.ADMIN_RECRUIT_FUNNEL` を使用 |
| `loading.tsx` / `error.tsx` を必ず配置 | `funnel/` ディレクトリに配置 |
| コメントは日本語 | 全コメント日本語 |

### `candidate_pulses` との関係

既存の `candidate_pulses` は「感情調査（パルス）」機能として現状維持。将来的に `candidates.id` と紐づけることで候補者体験データとの統合が可能（Phase 2 以降）。

### 初期データ

既存 `candidate_pulses` の `selection_step`（自由テキスト）は `candidates.stage` に自動マッピングできないため、初期リリースは新規入力から開始する。

---

## 13. 将来拡張（Phase 2 以降）

- 放置閾値のテナント設定画面（現在はコード定数 7日）
- 候補者ごとの選考履歴タイムライン
- `candidate_pulses`（感情調査）と `candidates` の統合ビュー
- 求人票ごとの充足率 / 達成率表示
- CSV エクスポート（採用KPIレポート用）
- 採用チャネル（媒体）別の応募数 / 通過率分析
