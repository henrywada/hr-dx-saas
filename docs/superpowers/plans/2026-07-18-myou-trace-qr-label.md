# 出荷トレーサビリティQRラベル発行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 出荷登録画面（`/myou/delivery-scan`）に「QRコード発行」ボタンとモーダルを追加し、出荷先番号・当日通番入りのトレーサビリティQRラベル（`SERIAL:<シリアル番号>,EXP:<有効期限>,ShipTo:<出荷先No>,TraceNo:<YYYYMMDD-NNNN>`）をその場で発行・印刷できるようにする。

**Architecture:** `myou_companies` にテナント内一意な `company_no` を追加し、発行のたび `myou_trace_labels` に1件記録して当日通番（TraceNo）を採番する。既存の「QRラベル発行」（`issueLabels`/`LabelIssueForm`）と同じ採番パターン・印刷パターンを踏襲する。

**Tech Stack:** Next.js Server Actions, Supabase (Postgres + RLS), Zod, `qrcode.react`（QR描画）, `node:test`（ユニットテスト）

## Global Constraints

- DBスキーマ変更は必ずマイグレーションファイル経由。`supabase db reset` は絶対に実行しない（既存ローカルデータが消える）
- 新規テーブルには必ず RLS ポリシー（テナント分離）を設定する
- `serial_number` に外部キー制約は付けない（`myou_delivery_logs.serial_number` と同じ方針。手入力の未登録シリアルも許容するため）
- Server Actions は既存の `getServerUser()` → tenant_id 検証パターンを踏襲する
- Server Actions（`actions.ts`）と UI コンポーネントには自動テストを追加しない（既存の `myou` feature の慣習：ビジネスロジックの純粋関数のみ `node:test` でユニットテストする。PRD `docs/implementation-plan-myou-trace-qr-label.md` セクション8で確定済み）
- コメントは日本語で記述する（プロジェクト規約）

---

### Task 1: DBマイグレーション（company_no追加 + myou_trace_labelsテーブル新設）

**Files:**

- Create: `supabase/migrations/20260718150000_myou_trace_labels.sql`

**Interfaces:**

- Produces: `myou_companies.company_no integer NOT NULL`（`(tenant_id, company_no)` UNIQUE）、テーブル `myou_trace_labels(id, tenant_id, company_id, serial_number, expiration_date, trace_no, created_at)`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 出荷先No（company_no）をmyou_companiesに追加し、既存行へテナント単位で連番をバックフィルする
ALTER TABLE public.myou_companies ADD COLUMN IF NOT EXISTS company_no integer;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.myou_companies
  WHERE company_no IS NULL
)
UPDATE public.myou_companies AS c
SET company_no = numbered.rn
FROM numbered
WHERE c.id = numbered.id;

ALTER TABLE public.myou_companies ALTER COLUMN company_no SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'myou_companies_tenant_company_no_key'
    ) THEN
        ALTER TABLE public.myou_companies
            ADD CONSTRAINT myou_companies_tenant_company_no_key UNIQUE (tenant_id, company_no);
    END IF;
END $$;

-- トレーサビリティQRラベル発行履歴（発行のたび1件記録し、当日通番の採番元になる）
CREATE TABLE IF NOT EXISTS public.myou_trace_labels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    company_id uuid NOT NULL REFERENCES public.myou_companies(id),
    serial_number text NOT NULL,
    expiration_date date NOT NULL,
    trace_no text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.myou_trace_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_trace_labels" ON public.myou_trace_labels;
CREATE POLICY "Tenant Isolation for myou_trace_labels" ON public.myou_trace_labels
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
```

- [ ] **Step 2: ローカルDBに適用する**

Run: `supabase migration up`
Expected: `Applying migration 20260718150000_myou_trace_labels.sql...` の後、エラーなく完了する

- [ ] **Step 3: 適用結果を確認する**

Run: `supabase studio` を開くか、以下を実行して列・テーブルの存在を確認する

```bash
psql "postgresql://127.0.0.1:55422/postgres" -c "\d myou_companies" -c "\d myou_trace_labels"
```

Expected: `myou_companies` に `company_no` 列（`integer`, `not null`）、`myou_trace_labels` テーブルが存在する

- [ ] **Step 4: TypeScript型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: コマンドがエラーなく完了し、`src/lib/supabase/types.ts` に `myou_trace_labels` と `myou_companies.company_no` が反映される

- [ ] **Step 5: コミットする**

```bash
git add supabase/migrations/20260718150000_myou_trace_labels.sql src/lib/supabase/types.ts
git commit -m "feat: myou_companiesにcompany_no追加とmyou_trace_labelsテーブルを新設"
```

---

### Task 2: qr-parser.ts にTraceNo採番・ペイロード組み立て関数を追加（TDD）

**Files:**

- Modify: `src/features/myou/lib/qr-parser.ts`
- Test: `src/features/myou/lib/qr-parser.test.ts`

**Interfaces:**

- Produces:
  - `buildTraceNo(dateYmd: string, sequence: number): string`
  - `extractTraceSequence(traceNo: string, dateYmd: string): number | null`
  - `getMaxTraceSequence(traceNos: string[], dateYmd: string): number`
  - `buildTraceQrPayload(serial: string, expiration: string, shipToNo: number, traceNo: string): string`

- [ ] **Step 1: 失敗するテストを追加する**

`src/features/myou/lib/qr-parser.test.ts` の末尾（既存 `import` 文に対象関数を追加したうえで）に追記する:

```ts
import {
  buildQrPayload,
  buildSerialNumber,
  buildTraceNo,
  buildTraceQrPayload,
  extractSerialSequence,
  extractTraceSequence,
  getMaxSerialSequence,
  getMaxTraceSequence,
  parseQrContent,
} from './qr-parser'
```

（既存の `import` 文をこの内容に置き換える）

```ts
test('buildTraceNo は YYYYMMDD-NNNN 形式（4桁ゼロ埋め）を生成する', () => {
  assert.equal(buildTraceNo('2026-07-18', 1), '20260718-0001')
  assert.equal(buildTraceNo('2026-07-18', 42), '20260718-0042')
})

test('extractTraceSequence は当日分のTraceNoから通番を取り出す', () => {
  assert.equal(extractTraceSequence('20260718-0007', '2026-07-18'), 7)
})

test('extractTraceSequence は日付が異なるTraceNoに対してnullを返す', () => {
  assert.equal(extractTraceSequence('20260717-0007', '2026-07-18'), null)
})

test('extractTraceSequence は形式に合わないTraceNoに対してnullを返す', () => {
  assert.equal(extractTraceSequence('INVALID', '2026-07-18'), null)
})

test('getMaxTraceSequence は当日分の最大通番を返す（該当なしは0）', () => {
  const traceNos = ['20260718-0001', '20260718-0005', '20260717-0099']
  assert.equal(getMaxTraceSequence(traceNos, '2026-07-18'), 5)
  assert.equal(getMaxTraceSequence([], '2026-07-18'), 0)
})

test('buildTraceQrPayload は SERIAL/EXP/ShipTo/TraceNo を含むペイロードを組み立てる', () => {
  const payload = buildTraceQrPayload('MS-20260707-0001', '2026-12-31', 3, '20260718-0001')
  assert.equal(payload, 'SERIAL:MS-20260707-0001,EXP:2026-12-31,ShipTo:3,TraceNo:20260718-0001')
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/features/myou/lib/qr-parser.test.ts`
Expected: `buildTraceNo is not a function`（および他の未定義関数）で FAIL

- [ ] **Step 3: 実装を追加する**

`src/features/myou/lib/qr-parser.ts` の末尾に追記する:

```ts
/**
 * トレーサビリティQR用の当日通番文字列を組み立てる（接頭辞なし）。
 * 形式: YYYYMMDD-NNNN（例: 20260718-0001）
 */
export function buildTraceNo(dateYmd: string, sequence: number): string {
  const compactDate = dateYmd.replaceAll('-', '')
  return `${compactDate}-${String(sequence).padStart(4, '0')}`
}

/**
 * 既存TraceNo文字列から当日通番を取り出す。
 * 形式に合わない場合は null を返す。
 */
export function extractTraceSequence(traceNo: string, dateYmd: string): number | null {
  const compactDate = dateYmd.replaceAll('-', '')
  const pattern = new RegExp(`^${compactDate}-(\\d{4,})$`)
  const match = traceNo.match(pattern)
  if (!match) return null
  const sequence = Number.parseInt(match[1], 10)
  return Number.isNaN(sequence) ? null : sequence
}

/**
 * 当日発行済みTraceNo一覧から最大通番を求める（該当なしは 0）。
 * buildSerialNumber と同様、文字列の辞書順比較では通番5桁以上を誤るため数値変換して比較する。
 */
export function getMaxTraceSequence(traceNos: string[], dateYmd: string): number {
  return traceNos.reduce((max, traceNo) => {
    const sequence = extractTraceSequence(traceNo, dateYmd)
    return sequence !== null && sequence > max ? sequence : max
  }, 0)
}

/** シリアル番号・有効期限・出荷先No・TraceNoからトレーサビリティQRペイロード文字列を組み立てる */
export function buildTraceQrPayload(
  serial: string,
  expiration: string,
  shipToNo: number,
  traceNo: string
): string {
  return `SERIAL:${serial},EXP:${expiration},ShipTo:${shipToNo},TraceNo:${traceNo}`
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --import tsx --test src/features/myou/lib/qr-parser.test.ts`
Expected: 全テスト PASS

- [ ] **Step 5: コミットする**

```bash
git add src/features/myou/lib/qr-parser.ts src/features/myou/lib/qr-parser.test.ts
git commit -m "feat: TraceNo採番とトレーサビリティQRペイロード組み立て関数を追加"
```

---

### Task 3: types.ts に型・スキーマを追加

**Files:**

- Modify: `src/features/myou/types.ts:17-21`（`MyouCompany`）
- Modify: `src/features/myou/types.ts`（末尾に追記）

**Interfaces:**

- Consumes: `dateStringSchema`（同ファイル内、既存）
- Produces:
  - `MyouCompany.company_no: number`
  - `issueTraceLabelSchema: ZodSchema`
  - `IssueTraceLabelInput = { company_id: string; serial_number: string; expiration_date: string }`
  - `TraceLabel = { trace_no: string; company_no: number; qr_payload: string }`

- [ ] **Step 1: `MyouCompany` に `company_no` を追加する**

`src/features/myou/types.ts:17-21` を次のように置き換える:

```ts
/** 施工会社（画面表示用にマッピング済み） */
export interface MyouCompany {
  company_id: string
  company_name: string
  company_no: number
  email_address?: string
}
```

- [ ] **Step 2: トレーサビリティQR発行の型・スキーマをファイル末尾に追加する**

```ts
/** トレーサビリティQR発行の入力 */
export const issueTraceLabelSchema = z.object({
  company_id: z.string().uuid('出荷先（施工会社）を選択してください'),
  serial_number: z.string().trim().min(1, 'シリアル番号を入力してください'),
  expiration_date: dateStringSchema,
})
export type IssueTraceLabelInput = z.infer<typeof issueTraceLabelSchema>

/** 発行されたトレーサビリティラベル1件分の情報 */
export interface TraceLabel {
  trace_no: string
  company_no: number
  qr_payload: string
}
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: `MyouCompany` を消費している既存ファイル（`queries.ts` / `DeliveryForm.tsx` / `CompanyMaintenance.tsx`）はまだ `company_no` を渡していないためエラーが出る場合がある → Task 4 で解消されることを確認しつつ進める（このタスク単体ではまだ緑にならなくてよい）

- [ ] **Step 4: コミットする**

```bash
git add src/features/myou/types.ts
git commit -m "feat: MyouCompany.company_noとトレーサビリティQR発行の型・スキーマを追加"
```

---

### Task 4: queries.ts の getCompanies に company_no を含める

**Files:**

- Modify: `src/features/myou/queries.ts:27-56`

**Interfaces:**

- Consumes: `MyouCompany`（Task 3 で `company_no` 追加済み）
- Produces: `getCompanies(): Promise<MyouCompany[]>`（`company_no` を含む）

- [ ] **Step 1: select列とマッピングに company_no を追加する**

`src/features/myou/queries.ts:27-56` の `getCompanies` を次のように置き換える:

```ts
export async function getCompanies(): Promise<MyouCompany[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    console.warn('getCompanies: No tenant_id found for current user')
    return []
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('myou_companies')
    .select('id, name, email_address, company_no, created_at, tenant_id')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  if (error) {
    console.error('Error fetching companies:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  // スキーマは id/name、コンポーネントは company_id/company_name を期待するためマッピング
  return (data || []).map(
    (row: { id: string; name: string; email_address: string | null; company_no: number }) => ({
      company_id: row.id,
      company_name: row.name,
      company_no: row.company_no,
      email_address: row.email_address ?? undefined,
    })
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: `queries.ts` 起因のエラーが解消される

- [ ] **Step 3: コミットする**

```bash
git add src/features/myou/queries.ts
git commit -m "feat: getCompaniesがcompany_noを返すようにする"
```

---

### Task 5: actions.ts に company_no 自動採番と issueTraceLabel action を追加

**Files:**

- Modify: `src/features/myou/actions.ts:1-25`（import）
- Modify: `src/features/myou/actions.ts:335-391`（`upsertCompany`）
- Modify: `src/features/myou/actions.ts`（末尾に `issueTraceLabel` 追加）

**Interfaces:**

- Consumes: `buildTraceNo`, `buildTraceQrPayload`, `getMaxTraceSequence`（Task 2）、`issueTraceLabelSchema`, `IssueTraceLabelInput`, `TraceLabel`（Task 3）
- Produces: `issueTraceLabel(formData: IssueTraceLabelInput): Promise<{ success: boolean; label?: TraceLabel; error?: string }>`

- [ ] **Step 1: importを更新する**

`src/features/myou/actions.ts:11` を次のように置き換える:

```ts
import {
  buildQrPayload,
  buildSerialNumber,
  buildTraceNo,
  buildTraceQrPayload,
  getMaxSerialSequence,
  getMaxTraceSequence,
} from './lib/qr-parser'
```

`src/features/myou/actions.ts:12-25` の `import { ... } from './types'` に以下を追加する（既存のリストに挿入し、アルファベット順を保つ）:

```ts
import {
  companyIdSchema,
  issueLabelsSchema,
  issueTraceLabelSchema,
  registerDeliverySchema,
  registerReceivingSchema,
  upsertCompanySchema,
  type DeliveryLogWithCompany,
  type IssueLabelsInput,
  type IssuedLabel,
  type IssueTraceLabelInput,
  type MyouProduct,
  type ProductTraceResult,
  type RegisterDeliveryInput,
  type RegisterReceivingInput,
  type TraceLabel,
} from './types'
```

- [ ] **Step 2: upsertCompany の新規作成時に company_no を採番する**

`src/features/myou/actions.ts:363-374` の `if (input.id) { ... } else { ... }` ブロックを次のように置き換える:

```ts
let result
if (input.id) {
  // 更新
  result = await supabase
    .from('myou_companies')
    .update(companyData)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
} else {
  // 新規作成: テナント内の現在最大値+1を出荷先No（company_no）として採番する
  const { data: existingCompanies, error: fetchError } = await supabase
    .from('myou_companies')
    .select('company_no')
    .eq('tenant_id', user.tenant_id)

  if (fetchError) {
    console.error('Error fetching company_no for numbering:', fetchError)
    return { success: false, error: '出荷先Noの採番に失敗しました。' }
  }

  const maxCompanyNo = (existingCompanies ?? []).reduce(
    (max, row) => (row.company_no > max ? row.company_no : max),
    0
  )

  result = await supabase
    .from('myou_companies')
    .insert({ ...companyData, company_no: maxCompanyNo + 1 })
}
```

- [ ] **Step 3: issueTraceLabel action をファイル末尾に追加する**

```ts
/**
 * トレーサビリティQRラベルを発行する
 * 当日・テナント内の通番（TraceNo）を採番し、myou_trace_labels に記録してQRペイロードを返す
 */
export async function issueTraceLabel(
  formData: IssueTraceLabelInput
): Promise<{ success: boolean; label?: TraceLabel; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = issueTraceLabelSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()

  // 出荷先がテナント内に存在するか検証しつつ company_no を取得する
  const { data: company, error: companyError } = await supabase
    .from('myou_companies')
    .select('company_no')
    .eq('id', input.company_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (companyError || !company) {
    console.error('Error fetching company for trace label:', companyError)
    return { success: false, error: '出荷先（施工会社）が見つかりませんでした。' }
  }

  const todayYmd = toJSTDateString()
  const compactDate = todayYmd.replaceAll('-', '')

  // 当日発行分の最大通番を取得して続きから採番する
  // ※ 同時実行時に採番が衝突する可能性はあるが、低頻度運用のため許容し、失敗時は再実行を促す
  const { data: issuedToday, error: latestError } = await supabase
    .from('myou_trace_labels')
    .select('trace_no')
    .eq('tenant_id', user.tenant_id)
    .like('trace_no', `${compactDate}-%`)

  if (latestError) {
    console.error('Error fetching latest trace_no:', latestError)
    return { success: false, error: 'TraceNoの採番に失敗しました。' }
  }

  const lastSequence = getMaxTraceSequence(
    (issuedToday ?? []).map(row => row.trace_no),
    todayYmd
  )
  const traceNo = buildTraceNo(todayYmd, lastSequence + 1)

  const { error: insertError } = await supabase.from('myou_trace_labels').insert({
    tenant_id: user.tenant_id,
    company_id: input.company_id,
    serial_number: input.serial_number,
    expiration_date: input.expiration_date,
    trace_no: traceNo,
  })

  if (insertError) {
    console.error('Error inserting trace label:', insertError)
    return {
      success: false,
      error: 'トレーサビリティQRの発行に失敗しました。もう一度お試しください。',
    }
  }

  return {
    success: true,
    label: {
      trace_no: traceNo,
      company_no: company.company_no,
      qr_payload: buildTraceQrPayload(
        input.serial_number,
        input.expiration_date,
        company.company_no,
        traceNo
      ),
    },
  }
}
```

- [ ] **Step 4: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: コミットする**

```bash
git add src/features/myou/actions.ts
git commit -m "feat: company_no自動採番とissueTraceLabel Server Actionを追加"
```

---

### Task 6: DeliveryForm.tsx にボタンを追加し、TraceQrModal.tsx を新規作成

DeliveryForm.tsx が呼び出す `TraceQrModal` はこのタスク内で作成する。片方だけではビルドが通らないため、2ファイルを1タスクとして扱う。

**Files:**

- Modify: `src/app/(tenant)/(tenant-users)/myou/components/DeliveryForm.tsx`
- Create: `src/app/(tenant)/(tenant-users)/myou/components/TraceQrModal.tsx`

**Interfaces:**

- Consumes: `issueTraceLabel`（Task 5）、`TraceLabel`（Task 3）
- Produces: `TraceQrModal({ companyId, initialSerial, initialExpiration, onClose }): JSX.Element`

- [ ] **Step 1: DeliveryForm.tsx の import と state を追加する**

`src/app/(tenant)/(tenant-users)/myou/components/DeliveryForm.tsx:7` の直後に追加する:

```tsx
import QrScanner from './QrScanner'
import TraceQrModal from './TraceQrModal'
```

（`QrScanner` の import 行を上記2行に置き換える）

`src/app/(tenant)/(tenant-users)/myou/components/DeliveryForm.tsx:18` の直後（`selectedCompanyId` の state 宣言の後）に追加する:

```tsx
const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
const [isTraceModalOpen, setIsTraceModalOpen] = useState(false)
```

- [ ] **Step 2: DeliveryForm.tsx にボタンとモーダルの呼び出しを追加する**

`src/app/(tenant)/(tenant-users)/myou/components/DeliveryForm.tsx:113-116` の

```tsx
<div className="text-center text-gray-500 text-sm">
  <p>QRコードを枠内に収めてスキャンしてください</p>
  <p className="mt-1">※カメラの使用許可が必要です</p>
</div>
```

を、次の内容にそのまま置き換える（空行・インデント・波括弧の位置を保つこと）:

```text
      <div className="text-center text-gray-500 text-sm">
        <p>QRコードを枠内に収めてスキャンしてください</p>
        <p className="mt-1">※カメラの使用許可が必要です</p>
      </div>

      {selectedCompanyId && (
        <div className="text-left">
          <button
            type="button"
            onClick={() => setIsTraceModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            QRコード発行
          </button>
        </div>
      )}

      {isTraceModalOpen && (
        <TraceQrModal
          companyId={selectedCompanyId}
          initialSerial={lastScanned?.serial ?? ''}
          initialExpiration={lastScanned?.expiration ?? ''}
          onClose={() => setIsTraceModalOpen(false)}
        />
      )}
```

- [ ] **Step 3: TraceQrModal.tsx を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X, Loader2, AlertCircle } from 'lucide-react'
import { issueTraceLabel } from '@/features/myou/actions'
import type { TraceLabel } from '@/features/myou/types'

interface TraceQrModalProps {
  companyId: string
  initialSerial: string
  initialExpiration: string
  onClose: () => void
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * 出荷先選択済みの状態で開く、トレーサビリティQRラベル発行モーダル。
 * シリアル番号・有効期限は直前のスキャン結果を初期値としてコピーするが、編集可能。
 */
export default function TraceQrModal({
  companyId,
  initialSerial,
  initialExpiration,
  onClose,
}: TraceQrModalProps) {
  const [serial, setSerial] = useState(initialSerial)
  const [expiration, setExpiration] = useState(initialExpiration)
  const [issuedLabel, setIssuedLabel] = useState<TraceLabel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canIssue = serial.trim().length > 0 && DATE_PATTERN.test(expiration)

  const handlePrint = () => {
    // 発行済みなら新たに登録せず、そのまま再印刷する（TraceNoの二重消費を防ぐ）
    if (issuedLabel) {
      window.print()
      return
    }
    if (!canIssue || isPending) return

    setError(null)
    startTransition(async () => {
      const result = await issueTraceLabel({
        company_id: companyId,
        serial_number: serial,
        expiration_date: expiration,
      })

      if (result.success && result.label) {
        setIssuedLabel(result.label)
        window.print()
      } else {
        setError(result.error || 'トレーサビリティQRの発行に失敗しました。')
      }
    })
  }

  const handleReissue = () => {
    setIssuedLabel(null)
    setError(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
            <h3 className="text-lg font-bold">トレーサビリティQRコード発行</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="trace-serial"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                シリアル番号
              </label>
              <input
                id="trace-serial"
                type="text"
                value={serial}
                onChange={e => setSerial(e.target.value)}
                readOnly={!!issuedLabel}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 read-only:bg-gray-50"
                placeholder="MS-20260707-0001"
              />
            </div>
            <div>
              <label
                htmlFor="trace-expiration"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                有効期限
              </label>
              <input
                id="trace-expiration"
                type="date"
                value={expiration}
                onChange={e => setExpiration(e.target.value)}
                readOnly={!!issuedLabel}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 read-only:bg-gray-50"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {issuedLabel && (
              <div className="flex flex-col items-center space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <QRCodeSVG value={issuedLabel.qr_payload} size={144} marginSize={2} />
                <p className="text-[10px] text-gray-500 font-mono break-all text-center">
                  {issuedLabel.qr_payload}
                </p>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              {issuedLabel && (
                <button
                  type="button"
                  onClick={handleReissue}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  新しく発行し直す
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                disabled={!issuedLabel && (!canIssue || isPending)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>発行中...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>{issuedLabel ? '再印刷する' : 'QRコード印刷'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 印刷用ビュー: モーダルのオーバーレイは print:hidden で消えるため、印刷対象は別要素として並置する */}
      {issuedLabel && (
        <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:p-12">
          <QRCodeSVG value={issuedLabel.qr_payload} size={220} marginSize={2} />
          <div className="mt-6 text-center font-mono text-sm space-y-1">
            <p className="font-bold">{serial}</p>
            <p>有効期限: {expiration}</p>
            <p>出荷先No: {issuedLabel.company_no}</p>
            <p>TraceNo: {issuedLabel.trace_no}</p>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: Lintを実行する**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 6: コミットする**

```bash
git add src/app/\(tenant\)/\(tenant-users\)/myou/components/DeliveryForm.tsx src/app/\(tenant\)/\(tenant-users\)/myou/components/TraceQrModal.tsx
git commit -m "feat: 出荷登録画面にトレーサビリティQRラベル発行ボタン・モーダルを追加"
```

---

### Task 7: 手動動作確認

**Files:** なし（動作確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

Run: `npm run dev`
Expected: `http://localhost:3000` で起動

- [ ] **Step 2: 施工会社を新規登録し company_no が採番されることを確認する**

`/myou/companies` で新規会社を登録 → 一覧に反映されることを確認（`company_no` は画面に表示しないが、Step 4 で発行したQRペイロード内の `ShipTo` 値として確認する）

- [ ] **Step 3: 出荷先未選択時にボタンが非表示であることを確認する**

`/myou/delivery-scan` を開き、出荷先プルダウンが未選択の状態で「QRコード発行」ボタンが表示されないことを確認する

- [ ] **Step 4: QRコード発行・印刷フローを確認する**

1. 出荷先を選択 → 「QRコード発行」ボタンが表示されることを確認
2. ボタンを押してモーダルを開く → シリアル番号・有効期限が空欄であることを確認（未スキャンのため）
3. シリアル番号・有効期限を手入力し「QRコード印刷」を押す → 印刷ダイアログが開き、QRコードと `SERIAL:...,EXP:...,ShipTo:...,TraceNo:...` 形式のペイロードがモーダル内に表示されることを確認
4. 印刷ダイアログを閉じ、「再印刷する」ボタンでもう一度印刷ダイアログが開くことを確認（TraceNoが変わらないことをペイロード表示で確認）
5. 「新しく発行し直す」を押して再度発行 → TraceNoの通番が1つ進むことを確認

- [ ] **Step 5: 製品QRスキャン後のコピー動作を確認する**

製品ラベル（`/myou/labels` で発行したテスト用QR、または `TestQrModal`）をスキャンして出荷登録した直後に「QRコード発行」を押し、シリアル番号・有効期限がスキャン結果からコピーされていることを確認する

- [ ] **Step 6: 最終コミット（ドキュメント更新があれば）**

動作確認のみのタスクのため、コード変更がなければコミット不要。もし確認中に修正が入った場合は個別にコミットする。
