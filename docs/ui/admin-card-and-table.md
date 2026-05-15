# 管理者向けカード＋テーブル（一覧レイアウト統一）

**Cursor Rules / Claude Code / Codex / エージェント共通の準拠文書。**  
`(tenant)/(colored)/adm/` 配下など、管理者向けの一覧ページでカードレイアウトや `<table>` を新規・改修するときは、ここと参照実装に揃える。

## 単一ソース（実装としてコピーの基準）

- ページの骨格（パスバー・カード・ヘッダー・本文）  
  `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx`
- 白サブヘッダー＋ピル型ビュー切替・副次ボタン  
  `src/features/skill-map/components/SkillMapTabs.tsx`
- データテーブル（`<thead>` 色・ゼブラ行・ホバー）  
  `src/features/skill-map/components/EmployeeSkillTable.tsx`  
  `src/features/skill-map/components/SkillRequirementsTable.tsx`

---

## カード（ページ内メインコンテナ）

1. **ページパス領域（一覧では推奨）**  
   `border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600`  
   表示文言: `{APP_ROUTES に対応するパス文字列} — ページ名`

2. **ページ外周**: コンテンツラッパは `p-6` を目安にする。

3. **メインカード本体**  
   `overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm`

4. **メイン見出し帯（カードヘッダー）** — そのページ内テーブルの `<thead>` と**同じ灰色トーン**に揃える。  
   `bg-gray-200 border-b border-gray-300 px-6 py-5`

   - タイトル: `text-2xl font-bold tracking-tight text-gray-900`
   - 主アクション（リンク）: `rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm`，`APP_ROUTES` + `next/link` の `<Link>` を使用。

5. **カード本文**  
   メイン見出し帯の直下に `p-6` を敷き、その内側にフィルター・サブヘッダー・テーブルなどを置く。

## サブヘッダー（ビュー切替／フィルタ行）

- 見出し帯の直下〜一覧直前は、既定で **`bg-white`** とする。境界は `border-b border-gray-200`。
- メイン見出し帯と同色のサブヘッダーにはしない。
- カードの `p-6` と段差なく帯を伸ばす例（スキルマップと同型）:  
  `-mx-6 -mt-6 px-6 py-3.5 mb-6 border-b border-gray-200 bg-white`
- サブヘッダーが白のとき、ピル等非選択状態は **`bg-gray-50` + `border-gray-200`** 等でホワイトオン白を避ける。

## データテーブル

1. **ラッパー**  
   `overflow-hidden rounded-xl border border-gray-200 bg-white`  
   横スクロールが必要なら内側を `overflow-x-auto` で包む。

2. **`<thead>`**  
   - `<tr className="bg-gray-200">`  
   - `<th>` 共通: `border-b border-gray-300 px-4 py-3`，ラベルは `text-sm font-semibold text-gray-800`。列に応じ `text-left` / `text-center`。

3. **`<tbody>` の行**

   - **ゼブラ**: 行インデックスで `bg-white` / `bg-gray-50` を交互に適用する。
   - **ホバー**:  
     `transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]`
   - 行の下線: `border-b border-gray-100`

4. **操作列**  
   `text-xs text-primary hover:underline` 等、既存のスキルマップ表記に合わせる。

## ピル型フィルタ／タブ

- **選択時**: `bg-primary text-white shadow-sm`，形状は `rounded-full px-4 py-1.5 text-sm font-medium`
- **非選択時**（白サブヘッダー上）: `border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100` など

## やってはいけないこと（要約）

| NG | 理由 |
|----|------|
| メイン見出し帯と `<thead>` で背景トーンが大きく異なる | 一覧の頭出しがしづらくなるため |
| 業務一覧を阻害する過剰な装飾・動き | 可読性と操作速度を優先 |
| 同一画面内だけヘッダー濃さ・シャドウのルールが混在する | 差分レビューやユーザー学習負荷を増やす |

例外が必要な場合は、レビューや事前合意のうえ、そのサブ機能の範囲に限定する。

---

### 運用メモ（エージェント向け）

- **Cursor**: `.cursor/rules/admin-card-table-style.mdc` が該当パス編集時に参照される。
- **Claude Code**: `CLAUDE.md`・`.claude/rules/admin-card-table.md` と本ファイル。
- **Codex**: `AGENTS.md` と本ファイル。
