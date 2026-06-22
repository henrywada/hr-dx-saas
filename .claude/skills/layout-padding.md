---
name: layout-padding-standard
description: HR-DX SaaS レイアウトパディング標準 — メイン領域の AWS風レスポンシブパディング
---

# レイアウトパディング標準

メイン領域（AppLayout 内のコンテンツエリア）のパディングを AWS コンソール風で設定する標準仕様。

ページの用途に応じて **2 パターン** から選択します。

---

## メイン領域パディング 2 パターン

### パターン A：コンテンツ幅制限型（SES ダッシュボール風）

**用途：** ダッシュボール、詳細情報、レポート、情報表示系

**特徴：**
- コンテンツを中央に配置
- 左右に大きな余白
- 読みやすさ重視
- 行の長さが制限される（快適な読み取り）

**パディング設定：**

| ブレークポイント | 画面幅   | パディング | 最大幅 |
| --------------- | ------- | --------- | ---- |
| デフォルト      | 小       | `px-4`    | 1200px |
| `sm`            | 中以上   | `px-6`    | 1200px |

**実装クラス：**
```tsx
<div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
  {children}
</div>
```

**実装例：**
```tsx
// ストレスチェック結果表示
<div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
  <h1>ストレスチェック結果</h1>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* 結果カード */}
  </div>
</div>
```

---

### パターン B：フル幅型（EC2 コンソール風）

**用途：** テーブル、データリスト、従業員管理、一覧表示系

**特徴：**
- 画面幅をフルに使用
- 左右パディングは最小限
- 情報密度重視
- データを最大限表示

**パディング設定：**

| ブレークポイント | 画面幅     | パディング | 最大幅  |
| --------------- | --------- | --------- | ------- |
| デフォルト      | 小        | `px-4`    | 1920px  |
| `sm`            | 中        | `px-6`    | 1920px  |
| `lg`            | 大以上    | `px-8`    | 1920px  |

**実装クラス：**
```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
  {children}
</div>
```

**実装例：**
```tsx
// 従業員テーブル
<div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
  <DataTable columns={columns} data={employees} />
</div>
```

---

## パターン選択フローチャート

```
ページの主要コンテンツは？

├─ テーブル・リスト・グリッド
│  └─ パターン B（フル幅型）px-4 sm:px-6 lg:px-8, max-w-[1920px]
│
├─ ダッシュボール・カード
│  └─ パターン A（制限型）px-4 sm:px-6, max-w-[1200px]
│
├─ 詳細情報・レポート
│  └─ パターン A（制限型）px-4 sm:px-6, max-w-[1200px]
│
└─ 検索・フィルタフォーム
   ├─ テーブル上部 → パターン B に合わせる
   └─ 単独フォーム → パターン A
```

---

## 指示テンプレート

## 実装パターン

### AppLayout での使用（推奨）

`src/components/layout/AppLayout.tsx` のメインコンテンツディブを以下のように更新：

```tsx
<div className="mx-auto w-full min-w-0 max-w-[1920px] px-4 sm:px-6 lg:px-8 py-6">
  {children}
</div>
```

**変更ポイント：**
- 固定の `px-[24px]` → `px-4 sm:px-6 lg:px-8`（レスポンシブ）
- `py-6` は維持（上下パディングは固定）

### 各ページコンポーネント での使用

page.tsx または共通レイアウト内で同じパディングクラスを適用：

```tsx
<section className="px-4 sm:px-6 lg:px-8 py-6">
  {/* セクションコンテンツ */}
</section>
```

## パディング値の根拠

| 値  | 解説                                                  |
| --- | ----------------------------------------------------- |
| `px-4` (16px) | 小画面でのコンパクト表示。ハンバーガーメニュー横   |
| `px-6` (24px) | 中画面での標準余白。タブレット横持ち               |
| `px-8` (32px) | 大画面での読みやすさ。デスクトップ・大型モニター   |

**背景：**
- AWS コンソールはコンテンツを中央に配置
- 左右に均等な余白を設けることで、大型モニターでも行が長くなりすぎない
- レスポンシブ設計により、小画面では余白を削減

## 使用する Tailwind ブレークポイント

```
デフォルト (0px)  ──→ px-4   (16px)
         ↓
sm: 640px  ────→ px-6   (24px)
         ↓
lg: 1024px ────→ px-8   (32px)
```

## 組み合わせ例

### 完全なレイアウト例

```tsx
export function MyPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <h1 className="text-3xl font-bold mb-6">ページタイトル</h1>
      
      {/* DataTable の場合 */}
      <DataTable
        columns={columns}
        data={items}
        // ... other props
      />
      
      {/* グリッドレイアウトの場合 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {/* カード等 */}
      </div>
    </div>
  )
}
```

### セクション分割の場合

```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6">
  <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold mb-4">セクション 1</h2>
      {/* コンテンツ */}
    </div>
    
    <div>
      <h2 className="text-2xl font-bold mb-4">セクション 2</h2>
      {/* コンテンツ */}
    </div>
  </section>
</div>
```

## よくある誤り

### ❌ 固定パディングを使う
```tsx
<div className="px-6 py-6">  // 常に 24px — 小画面で詰まる
  {children}
</div>
```

### ✅ レスポンシブパディングを使う
```tsx
<div className="px-4 sm:px-6 lg:px-8 py-6">  // 画面に応じて変動
  {children}
</div>
```

### ❌ AppLayout と page.tsx で異なるパディング
```tsx
// AppLayout.tsx
<div className="px-6">  // 24px

// page.tsx
<div className="px-4">  // 16px

// → 内部ネストで不揃い
```

### ✅ 統一してレスポンシブ
```tsx
// AppLayout.tsx
<div className="px-4 sm:px-6 lg:px-8">

// page.tsx 内
{children}  // AppLayout のパディング継承

// または同じクラスを適用
<section className="px-4 sm:px-6 lg:px-8">
```

## タブレット・モバイル対応チェック

新規ページ実装時は以下を確認：

- [ ] メイン領域に `px-4 sm:px-6 lg:px-8` が適用されている
- [ ] テーブル / グリッド内容が小画面で窮屈に見えない
- [ ] テキスト行の長さが大画面で読みやすい（60-80 文字程度）
- [ ] タブレット横持ち (768px) で表示に問題がない

## 参考実装

- **AppLayout.tsx** — メインレイアウトコンテナ
- **管理者向けページ** — `/adm/employees`, `/adm/el-assignments` 等

## 更新履歴

- 2026-06-22：初版作成。AWS 風レスポンシブパディング標準化
