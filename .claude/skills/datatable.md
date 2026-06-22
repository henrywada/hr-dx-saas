---
name: datatable-implementation
description: HR-DX SaaS DataTable コンポーネント実装ガイド — コンパクトテーブル設計の統一基準
---

# DataTable 実装ガイド

プロジェクト全体で一貫性のあるテーブルコンポーネントを実装するための標準仕様。

## 概要

`src/components/ui/DataTable.tsx` は、AWS コンソール風のコンパクトテーブルコンポーネント。以下の特徴を持つ：

- **コンパクト密度：** `py-1`（上下 4px）で行間を詰める
- **汎用性：** ジェネリック `<T>` で任意のデータ型に対応
- **機能豊富：** 検索・ソート・ページネーション・チェックボックス対応
- **外部制御可能：** ソートロジックをコンポーネント外で管理可能

## 実装チェックリスト

新しいテーブルを実装する際は以下を確認：

### 1. Column 定義

```typescript
const columns: Column<DataType>[] = [
  {
    key: 'name',
    label: '名前',
    sortable: true,
    render: (value, item) => <span className="font-medium">{value}</span>
  },
  {
    key: 'status',
    label: 'ステータス',
    sortable: true,
    render: (_, item) => <Badge>{item.status}</Badge>
  },
  {
    key: 'actions',
    label: '操作',
    sortable: false,
    width: 'w-16',
    render: (_, item) => (
      <button onClick={() => handleDelete(item.id)}>削除</button>
    )
  }
]
```

**ルール：**
- `key` には必ず実際のデータフィールドを指定
- `sortable: true` はソート可能な列のみ
- `render` 関数を使って複雑な表示ロジックを実装
- 最後の列（操作）は `sortable: false`

### 2. DataTable 呼び出し

```typescript
<DataTable
  columns={columns}
  data={filteredItems}
  searchable={true}
  searchPlaceholder="ユーザー名で検索..."
  searchKey="name"
  selectable={true}
  selectedIds={selectedIds}
  onSelectChange={setSelectedIds}
  sortKey={sortColumn}
  sortOrder={sortDirection}
  onSortChange={handleSort}
  getRowId={item => item.id}
  itemsPerPage={20}
/>
```

**必須プロップ：**
- `columns`：Column 配列
- `data`：表示データ配列

**オプション（よく使う）：**
- `searchable={true}`：検索機能有効
- `searchKey`：検索対象フィールド
- `selectable={true}`：チェックボックス有効
- `selectedIds` / `onSelectChange`：選択状態管理

**ソート制御（外部管理）：**
- `sortKey`：現在のソートキー
- `sortOrder`：昇順/降順
- `onSortChange`：ソート変更時のコールバック

### 3. レイアウト標準（重要）

**行の上下パディング**
```css
py-1  /* 4px — 必須。コンパクト密度 */
```

**コンテンツ表示**
```tsx
// テキスト
<div className="text-sm font-medium text-[#24292f]">
  {value}
</div>

// セカンダリテキスト
<div className="text-sm text-[#57606a]">
  {value}
</div>

// ステータスバッジ
<Badge variant="success">{status}</Badge>

// アイコンボタン
<button className="text-[#FD7601] hover:text-orange-700">
  <Edit className="w-4 h-4" />
</button>
```

**左右パディング**
```css
px-4  /* 16px — セルの左右余白 */
```

### 4. 複雑なソートロジック

DataTable は内部でシンプルなソートを実装。複雑なロジックが必要な場合は、コンポーネント外で管理：

```typescript
// ❌ DataTable 内でやらない
// DataTable に複雑なソート関数を渡さない

// ✅ 親コンポーネントで管理
const handleSort = (key: keyof Item | null, order: 'asc' | 'desc' | null) => {
  setSortColumn(key)
  setSortDirection(order)
}

const filteredAndSorted = useMemo(() => {
  let result = [...items]
  
  // 検索フィルタ
  if (searchQuery) {
    result = result.filter(...)
  }
  
  // 部署フィルタ
  if (selectedDivision) {
    result = result.filter(...)
  }
  
  // 日本語対応ソート
  if (sortColumn) {
    result.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      
      // 日本語は localeCompare を使用
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'ja')
          : bVal.localeCompare(aVal, 'ja')
      }
      
      // 数値の場合
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })
  }
  
  return result
}, [items, searchQuery, selectedDivision, sortColumn, sortDirection])

// DataTable に外部状態を渡す
<DataTable
  data={filteredAndSorted}
  sortKey={sortColumn}
  sortOrder={sortDirection}
  onSortChange={handleSort}
  {...otherProps}
/>
```

### 5. チェックボックスと一括削除

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

const handleBulkDelete = async () => {
  if (selectedIds.size === 0) return
  if (!confirm(`${selectedIds.size}件を削除しますか？`)) return
  
  startTransition(async () => {
    for (const id of selectedIds) {
      await deleteItem(id)
    }
    setSelectedIds(new Set())
    router.refresh()
  })
}

return (
  <div className="space-y-4">
    <DataTable
      selectable={true}
      selectedIds={selectedIds}
      onSelectChange={setSelectedIds}
      {...otherProps}
    />
    
    {selectedIds.size > 0 && (
      <div className="flex items-center gap-3 p-4 bg-[#FD7601] bg-opacity-10 border border-[#FD7601] rounded-lg">
        <p className="text-sm font-medium text-[#FD7601]">
          {selectedIds.size} 件を選択
        </p>
        <button
          onClick={handleBulkDelete}
          className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
        >
          選択項目を削除
        </button>
      </div>
    )}
  </div>
)
```

## パディング値の根拠

| スタイル | 値   | 用途                                  |
| -------- | ---- | ------------------------------------- |
| `py-1`   | 4px  | 行の上下パディング（**コンパクト**）  |
| `px-4`   | 16px | セルの左右パディング                  |
| `py-2`   | 8px  | （使用禁止）広すぎる                  |

AWS コンソールのテーブルはデータ密度を優先するため、上下パディングを最小化。これにより一度に見えるデータ行数が増加。

## トラブルシューティング

### ソートが反応しない
- `sortKey` と `onSortChange` が正しく渡されているか確認
- `onSortChange` コールバックで `setSortColumn` / `setSortDirection` が呼ばれているか確認
- `filteredAndSorted` が実際にソートされているか確認（useMemo の依存配列）

### 検索が動作しない
- `searchable={true}` か確認
- `searchKey` が正しいデータフィールドか確認
- `searchPlaceholder` は UI 用（検索ロジックには影響なし）

### パディングが異なる
- ヘッダー行：`py-1` 必須
- データ行：`py-1` 必須
- セル内パディング：`px-4` 必須
- `py-2` や `py-3` は使用禁止（コンパクト性が失われる）

### ページネーション表示されない
- `itemsPerPage` より `data` が多い場合のみページネーション表示
- デフォルト 20 件/ページ。必要に応じて調整

## 参考実装

- **AssignmentListClient.tsx** — 基本的な使用例（e-learning）
- **EmployeeTable.tsx** — 複雑なソート + フィルタの例（組織管理）

## 更新履歴

- 2026-06-22：初版作成。コンパクトパディング（py-1）の標準化
