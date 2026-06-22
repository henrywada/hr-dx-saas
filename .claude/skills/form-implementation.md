---
name: form-implementation-guide
description: HR-DX SaaS フォーム実装ガイド — 標準幅・レイアウト・パターン
---

# フォーム実装ガイド

検索フォーム、フィルタフォーム、登録フォーム等、プロジェクト全体で統一したフォーム実装の標準仕様。

## フォーム幅指示パターン

開発指示時に以下のいずれかの方法でフォーム幅を指定：

### パターン 1: Skill 参照（推奨・最も推奨）

**指示例：**
```
フォームを /layout-padding-standard に従い、
メイン領域の標準パディング (px-4 sm:px-6 lg:px-8) で実装してください
```

**メリット：**
- スキル更新時に自動で最新の仕様が反映される
- 開発者が標準をガイドで確認できる
- 将来的な変更に対応しやすい

**実装例：**
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  <SearchForm />
</div>
```

---

### パターン 2: Tailwind クラスを明示指定

**指示例：**
```
フォームコンテナを <div className="px-4 sm:px-6 lg:px-8"> でラップしてください
```

**メリット：**
- 指示が確実・明確
- クラスを直接見えて分かりやすい

**デメリット：**
- 標準変更時に個別修正が必要

**実装例：**
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  <form className="space-y-4">
    {/* フォーム内容 */}
  </form>
</div>
```

---

### パターン 3: ガイド参照（簡潔指示）

**指示例：**
```
フォームをメイン領域の標準幅で実装してください
（CLAUDE.md 「フォーム実装ガイド」参照）
```

**メリット：**
- 指示が簡潔
- CLAUDE.md で詳細を確認できる

**デメリット：**
- 開発者が CLAUDE.md を見に行く必要がある

---

## フォーム幅チェックリスト

新規フォーム実装時は以下を確認：

- [ ] フォームコンテナに `px-4 sm:px-6 lg:px-8` が適用されている
- [ ] モバイル (320px) での表示が詰まっていない
- [ ] タブレット (768px) での表示が標準的
- [ ] デスクトップ (1024px) での左右余白が適切
- [ ] 最大幅が `max-w-[1920px]` で制限されている（必要に応じて）

## フォーム実装パターン

### 検索フォーム

```tsx
export function SearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <form onSubmit={(e) => { e.preventDefault(); onSearch(query) }} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索..."
          className="flex-1 px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#FD7601] text-white rounded-lg text-sm font-medium hover:bg-orange-700"
        >
          検索
        </button>
      </form>
    </div>
  )
}
```

### フィルタフォーム

```tsx
export function FilterForm({ filters, onFilterChange }: FilterFormProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 bg-white border-b border-[#e2e6ec]">
      <div className="space-y-4">
        <div className="flex gap-4">
          <select
            value={filters.division}
            onChange={(e) => onFilterChange({ ...filters, division: e.target.value })}
            className="px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm"
          >
            <option value="">全部署</option>
            {/* オプション */}
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm"
          >
            <option value="">全ステータス</option>
            {/* オプション */}
          </select>
        </div>
      </div>
    </div>
  )
}
```

### モーダルフォーム

```tsx
export function CreateUserModal({ onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold mb-4">ユーザー作成</h2>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="text" placeholder="名前" className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg" />
            <input type="email" placeholder="メール" className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg" />
            
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#e2e6ec] rounded-lg text-sm font-medium hover:bg-[#f6f8fa]"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#FD7601] text-white rounded-lg text-sm font-medium hover:bg-orange-700"
              >
                作成
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

## よくある誤り

### ❌ パディング指定なし
```tsx
<form>
  {/* 幅が max-width なしでぐねぐね */}
</form>
```

### ✅ 標準パディング適用
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  <form>
    {/* 標準幅を継承 */}
  </form>
</div>
```

### ❌ 固定パディングのみ
```tsx
<form className="px-6">
  {/* 小画面で窮屈 */}
</form>
```

### ✅ レスポンシブパディング
```tsx
<form className="px-4 sm:px-6 lg:px-8">
  {/* 画面に応じて調整 */}
</form>
```

## 指示テンプレート集

### 検索フォーム作成指示

```
src/features/[domain]/components/SearchForm.tsx を作成してください

要件:
- メイン領域の標準パディング (px-4 sm:px-6 lg:px-8) を適用
- 検索入力フィールド + 検索ボタン
- HR-DX Design System のカラー (ボタン: #FD7601, ボーダー: #e2e6ec)
- onSearch コールバックを実装
```

### フィルタフォーム作成指示

```
フィルタフォームを実装してください

仕様:
- 部署フィルタ / ステータスフィルタのセレクトボックス
- メイン領域の標準パディングで配置（/layout-padding-standard 参照）
- DataTable の上に配置
- onChange で親コンポーネントのフィルタ状態を更新
```

### 登録フォーム作成指示

```
ユーザー作成フォームをモーダルで実装してください

パターン:
- メイン領域標準パディング (px-4 sm:px-6 lg:px-8) を適用
- キャンセルボタン / 作成ボタン
- onSubmit で Server Action を呼び出し
- 完了後はモーダルを閉じて画面をリフレッシュ
```

## 参考実装

- **AssignmentListClient.tsx** — 検索フォーム + DataTable 統合例
- **EmployeeTable.tsx** — フィルタセレクト + ソート + DataTable 統合例

## 更新履歴

- 2026-06-22：初版作成。フォーム幅指示パターンの標準化
