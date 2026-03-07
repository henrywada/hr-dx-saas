# カラーパレット使用ガイド

このプロジェクトでは、統一されたカラーパレットを使用して、一貫性のあるUIデザインを実現します。

## 🎨 カラーパレット

### Primary (プライマリカラー)
- **Primary**: `#0055FF` - メインボタン、リンク、重要な要素
- **Primary Dark**: `#0044CC` - ホバー時、アクティブ状態
- **Primary Light**: `#E5EBFF` - 薄い背景、ハイライト

### Accent (アクセントカラー)
- **Accent Teal**: `#00C2B8` - 二次ボタン、補助的な要素
- **Accent Orange**: `#FF6B00` - 警告、注意喚起、控えめな強調

## 📝 使用方法

### Tailwind CSSクラスで使用

```tsx
// Primary カラー
<button className="bg-primary hover:bg-primary-dark text-white">
  プライマリボタン
</button>

// Primary Light 背景
<div className="bg-primary-light p-4">
  薄い背景のコンテナ
</div>

// Accent Teal
<button className="bg-accent-teal hover:opacity-90 text-white">
  二次ボタン
</button>

// Accent Orange
<button className="bg-accent-orange hover:opacity-90 text-white">
  警告ボタン
</button>
```

### CSS変数で使用

```css
.custom-element {
  background-color: var(--primary);
  border-color: var(--primary-dark);
}

.custom-element:hover {
  background-color: var(--primary-dark);
}

.highlight-box {
  background-color: var(--primary-light);
}
```

## 🎯 使用例

### ボタンコンポーネント

```tsx
// Primary Button
<button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors">
  送信
</button>

// Secondary Button (Teal)
<button className="bg-accent-teal hover:opacity-90 text-white px-6 py-3 rounded-lg transition-opacity">
  キャンセル
</button>

// Warning Button (Orange)
<button className="bg-accent-orange hover:opacity-90 text-white px-6 py-3 rounded-lg transition-opacity">
  削除
</button>
```

### カード/パネル

```tsx
<div className="bg-white border-l-4 border-primary p-6 rounded-lg shadow-md">
  <h3 className="text-primary font-bold text-lg">重要なお知らせ</h3>
  <p className="text-gray-700 mt-2">コンテンツ...</p>
</div>
```

### ステータスバッジ

```tsx
// アクティブ
<span className="bg-primary-light text-primary px-3 py-1 rounded-full text-sm font-medium">
  アクティブ
</span>

// 処理中
<span className="bg-accent-teal/10 text-accent-teal px-3 py-1 rounded-full text-sm font-medium">
  処理中
</span>

// 警告
<span className="bg-accent-orange/10 text-accent-orange px-3 py-1 rounded-full text-sm font-medium">
  要注意
</span>
```

## 🌓 ダークモード対応

カラーパレットはダークモードでも同じ値を維持します。背景色と前景色のみが変更されます。

```tsx
// ダークモードでも同じカラーが使用されます
<button className="bg-primary hover:bg-primary-dark text-white">
  ボタン
</button>
```

## ✅ ベストプラクティス

1. **一貫性**: 常にこのカラーパレットを使用し、独自の色を追加しない
2. **階層**: Primary > Accent の順で重要度を表現
3. **アクセシビリティ**: テキストとボタンのコントラスト比を確保
4. **ホバー効果**: `hover:bg-primary-dark` または `hover:opacity-90` を使用

## 🚫 避けるべきこと

- ❌ インラインスタイルで独自の色を指定
- ❌ `bg-blue-500` などのTailwindデフォルトカラーを使用
- ❌ カラーパレット外の色を追加

## 📊 カラーコード一覧

| 用途 | 変数名 | HEX | Tailwind |
|------|--------|-----|----------|
| Primary | `--primary` | `#0055FF` | `bg-primary` |
| Primary Dark | `--primary-dark` | `#0044CC` | `bg-primary-dark` |
| Primary Light | `--primary-light` | `#E5EBFF` | `bg-primary-light` |
| Accent Teal | `--accent-teal` | `#00C2B8` | `bg-accent-teal` |
| Accent Orange | `--accent-orange` | `#FF6B00` | `bg-accent-orange` |
