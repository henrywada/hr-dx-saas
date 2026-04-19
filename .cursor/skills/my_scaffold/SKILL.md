---
name: my_scaffold
description: >-
  新機能ドメインのファイル一式（types.ts / queries.ts / actions.ts / page.tsx / loading.tsx / error.tsx）を
  プロジェクトのアーキテクチャルールに従って生成する。
  Use when the user invokes /my_scaffold, asks to scaffold a new feature, 新機能追加, ドメイン作成, or similar.
---

# my_scaffold（新機能スキャフォールド）

## 使い方

```
/my_scaffold <ドメイン名> [対象ユーザー]
```

- `<ドメイン名>`: 英語・kebab-case（例: `attendance`, `stress-check`）
- `[対象ユーザー]`: `employee`（デフォルト）/ `admin` / `saas`

## 生成するファイル

### 1. `src/features/<ドメイン>/types.ts`

```typescript
export type <Domain> = {
  id: string
  tenant_id: string
  created_at: string
}

export type Create<Domain>Input = Omit<<Domain>, 'id' | 'tenant_id' | 'created_at'>
```

### 2. `src/features/<ドメイン>/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

export async function get<Domain>List() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('<table_name>')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

### 3. `src/features/<ドメイン>/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

export async function create<Domain>(input: Create<Domain>Input) {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('<table_name>').insert(input)
  if (error) throw error

  revalidatePath(APP_ROUTES.<domain>)
}
```

### 4. ページファイルの配置先

| 対象ユーザー | 配置先 |
|------------|--------|
| `employee` | `src/app/(tenant)/(default)/<ドメイン>/` |
| `admin` | `src/app/(tenant)/(colored)/adm/<ドメイン>/` |
| `saas` | `src/app/(saas-admin)/saas_adm/<ドメイン>/` |

**page.tsx**
```typescript
import { get<Domain>List } from '@/features/<domain>/queries'

export default async function <Domain>Page() {
  const items = await get<Domain>List()
  return (
    <div>
      {/* TODO: Client Component に渡す */}
    </div>
  )
}
```

**loading.tsx**
```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}
```

**error.tsx**
```typescript
'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-red-600">エラーが発生しました</p>
      <button onClick={reset} className="btn">再試行</button>
    </div>
  )
}
```

## 生成後の確認チェックリスト

- [ ] `APP_ROUTES` に新しいパスを追加したか
- [ ] `queries.ts` に `createAdminClient` を使っていないか
- [ ] `actions.ts` の先頭に `'use server'` があるか
- [ ] `loading.tsx` と `error.tsx` が配置されているか
- [ ] DBテーブルが必要な場合は `/my_migration` を続けて実行する
