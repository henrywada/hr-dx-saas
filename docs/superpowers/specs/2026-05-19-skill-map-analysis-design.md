# スキルマップ 分析ビュー + CSV エクスポート 設計

**日付:** 2026-05-19  
**対象機能:** `/adm/skill-map`  
**ステータス:** 設計確定

---

## 概要

既存のスキルマップ機能（従業員ビュー・職種ビュー）に対して、以下の3機能を追加する。

1. **充足率スコアリング** — 従業員ごとに職種要件の達成率を算出・表示
2. **ギャップヒートマップ** — 従業員 × 要件のマトリクスで充足状況を可視化
3. **CSVエクスポート** — 全タブにダウンロードボタンを追加

---

## アーキテクチャ

### データフロー

```
page.tsx（Server Component）
  ├─ 既存: getEmployeeSkillRows()            → 従業員ビュー
  ├─ 既存: getSkillGroupRows()               → 職種ビュー
  ├─ 既存: getTenantSkillsWithRequirements() → 全タブ共有
  └─ 新規: getSkillCompletionData()          → 分析ビュー

SkillMapTabs（タブ: 従業員 | 職種 | 分析）
  ├─ EmployeeSkillTable  ＋ CSVDownloadButton
  ├─ SkillGroupView      ＋ CSVDownloadButton
  └─ 新規: AnalysisView  ＋ CSVDownloadButton
```

### 方針

- **アプローチB（Server-side集計クエリ）**: `queries.ts` に専用クエリを追加し、集計済みデータをServer Componentに渡す。DBマイグレーション不要。
- 新規テーブル・Supabase View は作成しない。既存の `employee_skill_assignments` + `employee_skill_requirement_selections` を JS 側で集計。

---

## 新規型定義（`types.ts` 追加）

```typescript
export type EmployeeCompletionRow = {
  employee_id: string
  employee_no: string | null
  full_name: string | null
  division_name: string | null
  division_id: string | null
  /** 割り当て済み職種IDの配列 */
  assignedSkillIds: string[]
  /** requirement_id → 達成(true) / 未達成(false) */
  requirementCompletions: Record<string, boolean>
  /** 割り当て職種の全要件数（未割り当て従業員は 0） */
  totalRequirements: number
  /** ON になっている要件数 */
  completedRequirements: number
  /** 0〜100（totalRequirements === 0 のとき null） */
  completionRate: number | null
}
```

---

## 新規クエリ（`queries.ts` 追加）

### `getSkillCompletionData(supabase, divisionId?)`

処理ステップ:
1. `employees`（active）を取得（divisionId 指定時は絞り込み）
2. `employee_skill_assignments` から各従業員の割り当て職種IDを取得
3. 割り当て職種の `skill_requirements` を全件取得
4. `employee_skill_requirement_selections` から ON の requirement_id を取得
5. JS 側で `EmployeeCompletionRow[]` に組み立て
6. `divisions.code` → `employee_no` 順でソート（既存 `getEmployeeSkillRows` と同じ）

**返り値:** `EmployeeCompletionRow[]`

---

## 新規コンポーネント

### `AnalysisView.tsx`

**上部: サマリーカード（3枚）**

| カード | 内容 |
|--------|------|
| 全体平均充足率 | 全従業員の `completionRate` 平均（%） |
| 充足率100% | 達成済み従業員数 / 全従業員数 |
| 最多ギャップ職種 | 未達成要件数が最多の職種名 |

**中部: フィルター**
- 部署フィルター（select）— 従業員ビューと同仕様
- 職種フィルター（select）— ヒートマップの列を職種単位で絞り込み

**下部: ヒートマップテーブル**

```
         ╔═══ 職種A ══╗  ╔═ 職種B ═╗
         │ 要件1│要件2│  │要件3│   │ 充足率
─────────┼──────┼─────┼──┼─────┼───┼──────
田中 太郎 │  ■  │  ■  │  │  □  │   │  67%  ████░░
佐藤 花子 │  □  │  □  │  │  ─  │   │   0%  ░░░░░░
```

セルの色分け:
- **■（達成）**: `bg-primary/20` + `text-primary` でチェックマーク表示
- **□（未達成）**: `bg-red-50` + `text-red-400` で × 表示
- **─（未割り当て）**: `bg-gray-50` + `text-gray-300`

充足率列: 数値テキスト + インラインプログレスバー（`div` で幅可変）  
列ヘッダー: 要件名を45度回転（`-rotate-45 origin-left`）して横幅を節約

---

## CSV エクスポート

### ユーティリティ（`src/lib/csv.ts` 新規作成）

```typescript
// BOM付きUTF-8でCSVダウンロード（Excelで文字化けしない）
export function downloadCsv(filename: string, rows: string[][]): void
```

- `﻿`（BOM）付きでエンコード
- `Blob` + `URL.createObjectURL` でブラウザ側ダウンロード
- セル内のカンマ・改行・ダブルクォートは RFC 4180 に従いエスケープ

### CSVDownloadButton コンポーネント（`src/components/ui/CSVDownloadButton.tsx`）

- Props: `data: string[][]`, `filename: string`, `label?: string`
- アイコン: lucide-react `Download`
- スタイル: 既存の `border border-gray-200 bg-white` 系ボタンに揃える

### 各タブの CSV 列定義

| タブ | ファイル名 | 列 |
|------|-----------|-----|
| 従業員ビュー | `skill-map-employees.csv` | 部署, 従業員番号, 氏名, 職種（複数はセミコロン区切り） |
| 職種ビュー | `skill-map-roles.csv` | 部署, 従業員番号, 氏名, 職種, スキル, レベル |
| 分析ビュー | `skill-map-analysis.csv` | 部署, 従業員番号, 氏名, 充足率%, 職種, 要件名, 達成(○/×) |

---

## 実装ファイル一覧

### 新規作成

| ファイル | 役割 |
|---------|------|
| `src/lib/csv.ts` | CSV生成ユーティリティ |
| `src/components/ui/CSVDownloadButton.tsx` | 汎用CSVダウンロードボタン |
| `src/features/skill-map/components/AnalysisView.tsx` | 分析ビュー本体 |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/features/skill-map/types.ts` | `EmployeeCompletionRow` 型追加 |
| `src/features/skill-map/queries.ts` | `getSkillCompletionData()` 追加 |
| `src/features/skill-map/components/SkillMapTabs.tsx` | 「分析」タブ追加、各タブにCSVボタン |
| `src/features/skill-map/components/EmployeeSkillTable.tsx` | CSVDownloadButton 追加 |
| `src/features/skill-map/components/SkillGroupView.tsx` | CSVDownloadButton 追加 |
| `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` | `getSkillCompletionData()` 呼び出し追加 |

---

## 非機能要件

- DB マイグレーション: **なし**
- 新規 API Route: **なし**（全て読み取りのみ、Server Actions 不要）
- RLS: 既存クライアント（`createClient()`）をそのまま使用
- ソート順: 既存の `divisions.code → employee_no` 順を踏襲
