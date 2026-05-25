# 評価者設定タブ 設計書

**日付:** 2026-05-25  
**対象画面:** `/adm/skill-map/approvers`（承認者マスタ管理）  
**方針:** 既存のスキル承認者設定画面にタブを追加し、評価者設定（一次・二次・確定者）を相乗りで実装する。

---

## 背景・目的

`employee_approvers` テーブルには `approver_role` カラムが追加済み（`eval_primary` / `eval_secondary` / `eval_confirmer`）。これを設定するUIが未実装のため、人事評価フローが機能しない状態。既存の「承認者マスタ管理」ページにタブを追加して解決する。

---

## UI 設計

### タブ構成

```
[スキル承認者] [評価者設定]
```

- タブ状態は URL searchParam `?tab=eval` で管理（`tab` 未指定 or `tab=skill` → タブ1）
- タブ切り替えは `router.push` で URL を更新し、直リンク可能にする

### タブ1：スキル承認者（既存 UI そのまま）

変更なし。`ApproversManager` コンポーネントをそのまま使用。

### タブ2：評価者設定（新規）

**追加フォーム：**

```
[ 対象従業員 ▼ ] [ 一次評価者 ▼ ] [ 二次評価者 ▼ ] [ 確定者 ▼ ] [ 保存 ]
```

- 3役はすべて任意（空白可）
- 「保存」で3役を upsert（既存レコードがあれば差し替え、なければ INSERT）
- 従業員未選択で保存ボタンを押した場合はエラー表示

**一覧テーブル：**

```
| No | 従業員       | 一次評価者   | 二次評価者   | 確定者       | 操作       |
|----|-------------|-------------|-------------|-------------|-----------|
|  1 | 田中太郎     | 鈴木部長     | 山田本部長   | 人事部長     | [削除]     |
|  2 | 佐藤花子     | 鈴木部長     | —           | —           | [削除]     |
```

- 従業員の社員番号順にソート
- 「削除」ボタンで対象従業員の全評価者ロール（3役すべて）を一括削除
- 上長でフィルタするUIは不要（評価者設定は従業員視点で管理する）

---

## データ設計

### クエリ：`getEvalApprovers(supabase)`

`employee_approvers` から `approver_role IN ('eval_primary', 'eval_secondary', 'eval_confirmer')` を取得し、従業員ごとに集約して返す。

```ts
type EvalApproverRow = {
  employee_id: string
  employee: { id: string; name: string | null; employee_no: string | null }
  primary:   { id: string; approver_id: string; approver: { id: string; name: string | null; employee_no: string | null } } | null
  secondary: { id: string; approver_id: string; approver: { id: string; name: string | null; employee_no: string | null } } | null
  confirmer: { id: string; approver_id: string; approver: { id: string; name: string | null; employee_no: string | null } } | null
}
```

集約はアプリ層（TypeScript）で行う。

### アクション：`upsertEvalApprovers`

```ts
input: {
  employeeId: string
  primaryApproverId:   string | null  // eval_primary
  secondaryApproverId: string | null  // eval_secondary
  confirmerApproverId: string | null  // eval_confirmer
}
```

処理フロー：
1. 対象従業員の既存 eval 系レコードを DELETE
2. null でないロールのみ INSERT

`revalidatePath(ADMIN_APPROVERS_PATH)`

### アクション：`removeEvalApprovers`

```ts
input: { employeeId: string }
```

対象従業員の `approver_role IN ('eval_primary', 'eval_secondary', 'eval_confirmer')` を一括 DELETE。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `src/features/skill-portal/types.ts` | `SkillApprover` に `approver_role` フィールドを追加。`EvalApproverRow` 型を新規追加 |
| `src/features/skill-portal/queries.ts` | `getEvalApprovers()` を追加 |
| `src/features/skill-portal/actions.ts` | `upsertEvalApprovers()` / `removeEvalApprovers()` を追加 |
| `src/features/skill-portal/components/ApproversManager.tsx` | タブ UI を追加。既存コンテンツをタブ1内に移動 |
| `src/features/skill-portal/components/EvalApproversManager.tsx` | 新規作成：タブ2のフォーム＋テーブル UI |
| `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/approvers/page.tsx` | `getEvalApprovers()` 追加フェッチ。searchParams を受け取りタブ初期値を渡す |

---

## 制約・考慮事項

- `eval_primary` / `eval_secondary` / `eval_confirmer` の UNIQUE 制約は `(tenant_id, employee_id, approver_id, approver_role)` のため、同一従業員に同一人物が複数ロールを持てる
- 既存の `skill_approval` レコードには一切触れない
- タブ2の一覧は従業員ビューのみ（逆引きUIは対象外）
