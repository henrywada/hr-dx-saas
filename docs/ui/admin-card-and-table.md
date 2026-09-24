# 管理者向けカード／一覧テーブル

管理者画面のカード・テーブル・フォームの共通規約。

### UI — 管理者向けカード／一覧テーブル（共通）

デザインは HR-DX Design System に準拠する。components/ の Card・DataTable・Badge・StatusIndicator 等を使用する。styles.css をリンクし、tokens/ の CSS 変数でスタイリングする。

#### メイン領域パディング標準（AWS 2 パターン）

AppLayout のメインコンテンツエリアは、ページの用途に応じて 2 パターンから選択：

**パターン A: コンテンツ幅制限型（SES ダッシュボール風）**

最大幅を制限してコンテンツを中央に配置。情報系ダッシュボード・詳細画面向け。

| 画面サイズ | パディング | 説明                 |
| ---------- | ---------- | -------------------- |
| 小〜中     | `px-4`     | モバイル・タブレット |
| 大以上     | `px-6`     | デスクトップ         |

```tsx
<div className="w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">{children}</div>
```

**用途：** ストレスチェック結果、詳細情報、レポート、ダッシュボード

---

**パターン B: フル幅型（EC2 コンソール風）**

画面幅をフルに使ってデータ表示。テーブル・リスト・グリッド向け。

| 画面サイズ | パディング | 説明                 |
| ---------- | ---------- | -------------------- |
| 小〜中     | `px-4`     | モバイル・タブレット |
| 大         | `px-6`     | デスクトップ         |
| 超大       | `px-8`     | 1024px 以上          |

```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">{children}</div>
```

**用途：** テーブル、従業員管理、e-learning 管理、データリスト

---

**選択ガイド：**

| 特徴               | パターン A（制限型） | パターン B（フル幅型） |
| ------------------ | -------------------- | ---------------------- |
| コンテンツ中央配置 | ✓                    |                        |
| 左右余白が大きい   | ✓                    |                        |
| データ表示に最適   |                      | ✓                      |
| テーブル・リスト   |                      | ✓                      |
| 読みやすさ重視     | ✓                    |                        |
| 情報密度重視       |                      | ✓                      |

---

**⚠️ `max-w-*` + `mx-auto` には必ず `w-full` を先に付ける（必須）**

`AppLayout` の children ラッパー（[AppLayout.tsx:51-52](src/components/layout/AppLayout.tsx#L51-L52)）は `flex flex-col` のため、各ページのルート `<div>` は **flex アイテム**になる。Flexbox には「flex アイテムに `margin: auto`（= `mx-auto`）を付けると、その軸方向は伸長（stretch）されず、余った空間を auto マージンが吸収する」という仕様があるため、`w-full` を書かないと：

- 要素はコンテンツ幅までしか広がらない
- **`max-width` が事実上まったく効かない**（`max-w-[1200px]` を指定しても幅が変わらない）
- `px-*` を増減しても見た目がほとんど変化しないため、原因の特定が極端に難しい

```tsx
// NG: max-w が効かず「パディングを変えても見た目が変わらない」状態になる
<div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">

// OK: w-full で幅を確定させてから max-width で頭打ちにする
<div className="w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
```

**「パディング／幅を変更したのに画面が変わらない」と報告を受けたら、まずこの `w-full` 欠落を疑う。** ブラウザキャッシュや dev server の再起動を疑う前に確認すること（過去に切り分けだけで 1.5 時間を要した実績のある罠）。

#### カード間隔標準（AWS 風シャープ設計）

ダッシュボール（/top）のカード間隔をデフォルト化。AWS コンソール風のシャープで精密な情報密度を実現。

| 項目                       | 値               | 説明                                               |
| -------------------------- | ---------------- | -------------------------------------------------- |
| **セクション間隔**         | `space-y-4`      | セクション（タスク、情報）間の上下マージン（16px） |
| **カード横間隔**           | `gap-3`          | 2 列グリッド内のカード間隔（12px）                 |
| **コンテナパディング上下** | `py-5`           | メインコンテナの上下パディング（20px）             |
| **コンテナパディング左右** | `px-4 sm:px-6`   | レスポンシブ左右パディング                         |
| **カード内パディング**     | `p-5`            | カード内コンテンツパディング（20px）               |
| **ボーダーラウンド**       | `rounded-lg`     | カードコーナー丸み（8px）                          |
| **シャドウ**               | `shadow-xs`      | 微細な影                                           |
| **max-width**              | `max-w-[1200px]` | コンテンツ幅制限（1200px）                         |

**実装例：**

```tsx
<div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      {/* タスクカード */}
    </div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      {/* 情報カード */}
    </div>
  </div>
</div>
```

**変更履歴（AWS 風シャープ化）：**

- 2026-06-23：`py-6` → `py-5`、`gap-4` → `gap-3`、`p-6` → `p-5`、`rounded-2xl` → `rounded-lg`、`shadow-sm` → `shadow-xs`

#### フォーム実装ガイド（AWS 風シャープ設計）

フォーム（検索・フィルタ・登録等）は AWS 風シャープ設計をデフォルト値として実装。スキルを参照してください。

**デフォルト値：**

| 要素                       | 値                          | 説明               |
| -------------------------- | --------------------------- | ------------------ |
| **コンテナ上下パディング** | `py-5`                      | 20px（コンパクト） |
| **コンテナ左右パディング** | `px-4 sm:px-6 lg:px-8`      | レスポンシブ       |
| **フォーム内ギャップ**     | `gap-3`                     | 12px（コンパクト） |
| **入力フィールド**         | `px-2.5 py-1.5` / `text-xs` | 小さく精密         |
| **ボタン**                 | `px-3 py-1.5` / `text-xs`   | 小さく精密         |
| **ボーダーラウンド**       | `rounded-lg`                | 8px（シャープ）    |

**推奨指示方法：**

**パターン 1: Skill 参照（推奨・最も推奨）**

```
フォームを /form-implementation-guide に従って、AWS 風シャープ設計で実装してください
```

→ スキル更新時に自動で最新の仕様が反映される

**パターン 2: クラスを明示指定**

```
フォームコンテナを <div className="px-4 sm:px-6 lg:px-8 py-5"> でラップし、
内部ギャップを gap-3 で、入力フィールドを px-2.5 py-1.5 text-xs で実装してください
```

→ 確実だが、標準変更時に個別修正が必要

**パターン 3: ガイド参照（簡潔指示）**

```
フォームを AWS 風シャープ設計でメイン領域に実装してください
（CLAUDE.md 「フォーム実装ガイド」参照）
```

→ 開発者が本ガイドを参照して実装

#### DataTable コンポーネント仕様

`src/components/ui/DataTable.tsx` はプロジェクト全体で再利用可能なテーブルコンポーネント。AWS コンソール風のコンパクト設計。

**レイアウト標準（重要）：**

- ヘッダー行・データ行：`py-1`（上下パディング 4px）← コンパクト密度
- 左右パディング：`px-4`（16px）
- 行の高さ：自動（コンテンツに応じて調整）
- ホバー背景：`#f6f8fa`（淡いグレー）
- ボーダー：1px `#e2e6ec`（淡いグレー）

**機能：**

- `searchable={true}`：検索バー表示（テーブル上部）
- `selectable={true}`：チェックボックス列表示
- `sortable={true}`：ソート可能な列（ヘッダーにアイコン表示）
- `onSortChange`：外部ソート制御（複雑なソートロジックはコンポーネント外で管理）
- `itemsPerPage`：デフォルト 20 件/ページ

**使用例：**

```tsx
<DataTable
  columns={columns}
  data={items}
  searchable={true}
  searchPlaceholder="検索..."
  searchKey="name"
  selectable={true}
  selectedIds={selectedIds}
  onSelectChange={setSelectedIds}
  sortKey={sortColumn}
  sortOrder={sortDirection}
  onSortChange={handleSort}
  getRowId={item => item.id}
/>
```

**Column<T> インターフェース：**

- `key`：データキー（`keyof T`）
- `label`：ヘッダーテキスト
- `sortable?`：ソート可能か（デフォルト false）
- `render?`：カスタムセルレンダリング関数
- `width?`：列幅（Tailwind クラス、例：`w-20`）
