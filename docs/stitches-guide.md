# Stitches の使い方 完全ガイド 🎨

## 📋 目次

1. [基本的な使い方](#基本的な使い方)
2. [コンポーネントの使用](#コンポーネントの使用)
3. [カスタムコンポーネントの作成](#カスタムコンポーネントの作成)
4. [バリアントの使い方](#バリアントの使い方)
5. [レスポンシブデザイン](#レスポンシブデザイン)
6. [実践例](#実践例)

---

## 基本的な使い方

### 1. 既存のコンポーネントを使う

```tsx
import { Button, Input, Card, Flex, Text } from '@/components/ui/stitches'

export default function MyPage() {
  return (
    <Card padding="md">
      <Text size="xl" weight="bold">こんにちは</Text>
      <Button variant="primary">クリック</Button>
    </Card>
  )
}
```

### 2. カスタムスタイルを追加

```tsx
import { Box } from '@/components/ui/stitches'

<Box css={{ 
  mt: '$4',              // margin-top: 1rem
  p: '$6',               // padding: 1.5rem
  backgroundColor: '$primary50',
  borderRadius: '$md'
}}>
  カスタムスタイル
</Box>
```

---

## コンポーネントの使用

### Button（ボタン）

```tsx
import { Button } from '@/components/ui/stitches'

// バリアント
<Button variant="primary">プライマリ</Button>
<Button variant="secondary">セカンダリ</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
<Button variant="danger">危険</Button>

// サイズ
<Button size="sm">小</Button>
<Button size="md">中</Button>
<Button size="lg">大</Button>

// 全幅
<Button fullWidth>全幅ボタン</Button>

// 無効化
<Button disabled>無効</Button>
```

### Input（入力フィールド）

```tsx
import { Input, Label } from '@/components/ui/stitches'

<div>
  <Label htmlFor="email">メールアドレス</Label>
  <Input
    id="email"
    type="email"
    placeholder="your@email.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>

// エラー状態
<Input error placeholder="エラー状態" />

// サイズ
<Input size="sm" />
<Input size="md" />
<Input size="lg" />
```

### Card（カード）

```tsx
import { Card } from '@/components/ui/stitches'

<Card padding="md">
  カードの内容
</Card>

// パディングのバリエーション
<Card padding="none">パディングなし</Card>
<Card padding="sm">小</Card>
<Card padding="md">中</Card>
<Card padding="lg">大</Card>

// ホバーエフェクト
<Card hover padding="md">
  ホバーで浮き上がる
</Card>
```

### Flex（フレックスレイアウト）

```tsx
import { Flex } from '@/components/ui/stitches'

// 横並び
<Flex direction="row" align="center" justify="between" gap="4">
  <div>左</div>
  <div>右</div>
</Flex>

// 縦並び
<Flex direction="column" gap="2">
  <div>上</div>
  <div>下</div>
</Flex>

// 中央揃え
<Flex align="center" justify="center" css={{ height: '100vh' }}>
  <div>中央</div>
</Flex>
```

### Text（テキスト）

```tsx
import { Text } from '@/components/ui/stitches'

<Text size="lg" weight="bold" color="primary">
  テキスト
</Text>

// サイズ
<Text size="xs">極小</Text>
<Text size="sm">小</Text>
<Text size="base">基本</Text>
<Text size="lg">大</Text>
<Text size="xl">特大</Text>
<Text size="2xl">超特大</Text>

// 色
<Text color="primary">プライマリ</Text>
<Text color="secondary">セカンダリ</Text>
<Text color="success">成功</Text>
<Text color="error">エラー</Text>
```

---

## カスタムコンポーネントの作成

### 基本的な作成方法

```tsx
import { styled } from '@/lib/stitches.config'

const MyButton = styled('button', {
  // ベーススタイル
  padding: '$4',
  borderRadius: '$md',
  backgroundColor: '$primary500',
  color: 'white',
  border: 'none',
  cursor: 'pointer',

  // ホバー
  '&:hover': {
    backgroundColor: '$primary600',
  },

  // フォーカス
  '&:focus': {
    outline: '2px solid $primary500',
  },
})

// 使用
<MyButton>カスタムボタン</MyButton>
```

### 既存コンポーネントの拡張

```tsx
import { Button } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

const IconButton = styled(Button, {
  size: '$10',
  borderRadius: '$full',
  padding: 0,
})

<IconButton variant="primary">
  <Icon />
</IconButton>
```

---

## バリアントの使い方

### バリアントの定義

```tsx
import { styled } from '@/lib/stitches.config'

const Alert = styled('div', {
  padding: '$4',
  borderRadius: '$md',
  border: '1px solid',

  variants: {
    type: {
      info: {
        backgroundColor: '$primary50',
        borderColor: '$primary500',
        color: '$primary700',
      },
      success: {
        backgroundColor: '#f0fdf4',
        borderColor: '$success',
        color: '#166534',
      },
      warning: {
        backgroundColor: '#fffbeb',
        borderColor: '$warning',
        color: '#92400e',
      },
      error: {
        backgroundColor: '#fef2f2',
        borderColor: '$error',
        color: '#991b1b',
      },
    },
  },

  defaultVariants: {
    type: 'info',
  },
})

// 使用
<Alert type="success">成功しました！</Alert>
<Alert type="error">エラーが発生しました</Alert>
```

### 複数のバリアント

```tsx
const Badge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '$full',
  fontSize: '$sm',
  fontWeight: '$medium',

  variants: {
    color: {
      primary: { backgroundColor: '$primary100', color: '$primary700' },
      success: { backgroundColor: '#dcfce7', color: '#166534' },
      warning: { backgroundColor: '#fef3c7', color: '#92400e' },
    },
    size: {
      sm: { px: '$2', py: '$1', fontSize: '$xs' },
      md: { px: '$3', py: '$1', fontSize: '$sm' },
      lg: { px: '$4', py: '$2', fontSize: '$base' },
    },
  },

  defaultVariants: {
    color: 'primary',
    size: 'md',
  },
})

// 使用
<Badge color="success" size="sm">新着</Badge>
<Badge color="warning" size="lg">注意</Badge>
```

---

## レスポンシブデザイン

### メディアクエリの使用

```tsx
import { styled } from '@/lib/stitches.config'

const ResponsiveBox = styled('div', {
  padding: '$4',
  fontSize: '$sm',

  '@sm': {
    padding: '$6',
    fontSize: '$base',
  },

  '@md': {
    padding: '$8',
    fontSize: '$lg',
  },

  '@lg': {
    padding: '$10',
    fontSize: '$xl',
  },
})
```

### グリッドレイアウト

```tsx
const Grid = styled('div', {
  display: 'grid',
  gap: '$4',
  gridTemplateColumns: '1fr',

  '@sm': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },

  '@md': {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },

  '@lg': {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
})

<Grid>
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
  <Card>4</Card>
</Grid>
```

---

## 実践例

### 1. フォームの作成

```tsx
'use client'

import { useState } from 'react'
import { Button, Input, Card, Flex, Label, Text } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

const FormGroup = styled('div', {
  mb: '$4',
})

const ErrorMessage = styled('div', {
  color: '$error',
  fontSize: '$sm',
  mt: '$1',
})

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    if (!name) newErrors.name = '名前を入力してください'
    if (!email) newErrors.email = 'メールアドレスを入力してください'
    if (!message) newErrors.message = 'メッセージを入力してください'
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      console.log('送信:', { name, email, message })
    }
  }

  return (
    <Card padding="lg" css={{ maxWidth: '600px', margin: '0 auto' }}>
      <Text size="2xl" weight="bold" css={{ mb: '$6' }}>
        お問い合わせ
      </Text>

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">お名前</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
          />
          {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
          />
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="message">メッセージ</Label>
          <Input
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={!!errors.message}
          />
          {errors.message && <ErrorMessage>{errors.message}</ErrorMessage>}
        </FormGroup>

        <Flex gap="3" css={{ mt: '$6' }}>
          <Button type="submit" variant="primary" fullWidth>
            送信
          </Button>
          <Button type="button" variant="outline" fullWidth>
            キャンセル
          </Button>
        </Flex>
      </form>
    </Card>
  )
}
```

### 2. カードリストの作成

```tsx
import { Card, Flex, Text, Button, Box } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

const Grid = styled('div', {
  display: 'grid',
  gap: '$6',
  gridTemplateColumns: '1fr',

  '@sm': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },

  '@lg': {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
})

const ProductCard = styled(Card, {
  transition: 'all 0.2s ease',

  '&:hover': {
    boxShadow: '$lg',
    transform: 'translateY(-4px)',
  },
})

const products = [
  { id: 1, name: '商品A', price: '¥1,000', description: '説明文A' },
  { id: 2, name: '商品B', price: '¥2,000', description: '説明文B' },
  { id: 3, name: '商品C', price: '¥3,000', description: '説明文C' },
]

export default function ProductList() {
  return (
    <Box css={{ p: '$8' }}>
      <Text size="3xl" weight="bold" css={{ mb: '$8' }}>
        商品一覧
      </Text>

      <Grid>
        {products.map((product) => (
          <ProductCard key={product.id} padding="md">
            <Flex direction="column" gap="3">
              <Text size="xl" weight="semibold">
                {product.name}
              </Text>
              <Text size="sm" css={{ color: '$gray600' }}>
                {product.description}
              </Text>
              <Text size="2xl" weight="bold" color="primary">
                {product.price}
              </Text>
              <Button variant="primary" fullWidth>
                カートに追加
              </Button>
            </Flex>
          </ProductCard>
        ))}
      </Grid>
    </Box>
  )
}
```

### 3. モーダルの作成

```tsx
'use client'

import { useState } from 'react'
import { Button, Card, Flex, Text, Box } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

const Overlay = styled('div', {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '$max',
})

const Modal = styled(Card, {
  maxWidth: '500px',
  width: '90%',
})

export default function ModalExample() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        モーダルを開く
      </Button>

      {isOpen && (
        <Overlay onClick={() => setIsOpen(false)}>
          <Modal padding="lg" onClick={(e) => e.stopPropagation()}>
            <Text size="2xl" weight="bold" css={{ mb: '$4' }}>
              モーダルタイトル
            </Text>
            <Text css={{ mb: '$6', color: '$gray600' }}>
              これはモーダルの内容です。ここに詳細な情報を表示できます。
            </Text>
            <Flex gap="3" justify="end">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                確認
              </Button>
            </Flex>
          </Modal>
        </Overlay>
      )}
    </>
  )
}
```

---

## 🎨 テーマトークンの使用

### 利用可能なトークン

```tsx
// 色
css={{ color: '$primary500' }}
css={{ backgroundColor: '$gray100' }}

// スペース
css={{ m: '$4' }}      // margin: 1rem
css={{ p: '$6' }}      // padding: 1.5rem
css={{ gap: '$3' }}    // gap: 0.75rem

// フォントサイズ
css={{ fontSize: '$sm' }}
css={{ fontSize: '$base' }}
css={{ fontSize: '$xl' }}

// 角丸
css={{ borderRadius: '$md' }}
css={{ borderRadius: '$lg' }}
css={{ borderRadius: '$full' }}

// シャドウ
css={{ boxShadow: '$sm' }}
css={{ boxShadow: '$md' }}
css={{ boxShadow: '$lg' }}
```

---

## 💡 ヒント

### 1. 型安全性を活用

```tsx
import { ComponentProps } from '@stitches/react'
import { Button } from '@/components/ui/stitches'

type ButtonProps = ComponentProps<typeof Button>

function MyButton(props: ButtonProps) {
  return <Button {...props} />
}
```

### 2. 条件付きスタイル

```tsx
<Button variant={isActive ? 'primary' : 'secondary'}>
  ボタン
</Button>
```

### 3. 動的なCSS

```tsx
<Box css={{ 
  color: isError ? '$error' : '$success',
  fontSize: size === 'large' ? '$xl' : '$base'
}}>
  動的スタイル
</Box>
```

---

## 📚 サンプルページ

実際に動くサンプルページを確認できます：

```bash
# 開発サーバーを起動
npm run dev
```

- **ログインページ**: http://localhost:3001/login-stitches
- **ダッシュボード**: http://localhost:3001/dashboard-stitches

---

## 🎨 Tailwind CSSとの併用

### いつTailwindを使うか

- ✅ グローバルなスタイリング
- ✅ ユーティリティクラス
- ✅ 簡単なレイアウト

### いつStitchesを使うか

- ✅ コンポーネントレベルのスタイリング
- ✅ バリアント機能が必要な場合
- ✅ 型安全性が必要な場合
- ✅ 動的なスタイル

### 併用例

```tsx
// Tailwind: グローバルレイアウト
<div className="container mx-auto">
  {/* Stitches: コンポーネント */}
  <Card padding="md">
    <Button variant="primary">ボタン</Button>
  </Card>
</div>
```

---

## 📚 ベストプラクティス

### 1. コンポーネントの分離

```tsx
// ✅ 良い例: 再利用可能なコンポーネント
const Button = styled('button', { /* ... */ })

// ❌ 悪い例: ページ固有のスタイル
const LoginPageButton = styled('button', { /* ... */ })
```

### 2. バリアントの活用

```tsx
// ✅ 良い例
const Button = styled('button', {
  variants: {
    variant: {
      primary: { /* ... */ },
      secondary: { /* ... */ },
    },
  },
})

// ❌ 悪い例
const PrimaryButton = styled('button', { /* ... */ })
const SecondaryButton = styled('button', { /* ... */ })
```

### 3. テーマトークンの使用

```tsx
// ✅ 良い例
const Box = styled('div', {
  padding: '$4',
  color: '$primary500',
})

// ❌ 悪い例
const Box = styled('div', {
  padding: '1rem',
  color: '#0ea5e9',
})
```

---

## ✅ まとめ

Stitchesの基本的な使い方：

1. **既存コンポーネントを使う** - `import { Button } from '@/components/ui/stitches'`
2. **バリアントで見た目を変える** - `<Button variant="primary" size="lg">`
3. **カスタムスタイルを追加** - `css={{ mt: '$4', color: '$primary500' }}`
4. **新しいコンポーネントを作る** - `styled('div', { ... })`
5. **レスポンシブにする** - `'@md': { fontSize: '$lg' }`

---

## 📖 参考リンク

- [Stitches公式ドキュメント](https://stitches.dev/)
- [Stitches GitHub](https://github.com/stitchesjs/stitches)
- [Stitches API](https://stitches.dev/docs/api)

---

## 🚀 インストール情報

### インストール済み
- ✅ `@stitches/react@1.3.1`

### 作成されたファイル
- ✅ `src/lib/stitches.config.ts` - 設定ファイル
- ✅ `src/components/ui/stitches.tsx` - UIコンポーネント
- ✅ `src/app/(auth)/login-stitches/page.tsx` - ログインページ例
- ✅ `src/app/(tenant)/dashboard-stitches/page.tsx` - ダッシュボード例

### 利用可能なコンポーネント
- ✅ Button（5バリアント、3サイズ）
- ✅ Input（エラー状態、3サイズ）
- ✅ Card（4パディング、ホバー）
- ✅ Flex（レイアウト）
- ✅ Text（サイズ、ウェイト、カラー）
- ✅ Label
- ✅ Box

**これでStitchesを使った美しいUIが作れます！** 🎨✨
