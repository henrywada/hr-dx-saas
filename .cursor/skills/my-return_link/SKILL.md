---
name: my-return_link
description: >-
  指定した page.tsx または画面コンポーネントに「← 戻る」（router.back）リンクを右寄せで追加する。
  Use when the user invokes /my-return_link, asks to add 戻るリンク, back link, TenantBackLink,
  前画面に戻る, or to audit pages missing back navigation.
---

# my-return_link（← 戻るリンク追加）

## 使い方

```
/my-return_link <ページパス>
```

例:

```
/my-return_link src/app/(tenant)/(tenant-admin)/adm/(recurit)/offer-validation/page.tsx
/my-return_link src/app/(saas-admin)/saas_adm/(puls)/el-templates/page.tsx
/my-return_link src/features/echo-template/components/EchoTemplateListClient.tsx
```

複数指定可。ディレクトリ指定時は配下の `page.tsx` を列挙し、対象をユーザーに示してから一括対応する。

## 要件（ユーザー指示・厳守）

1. **「← 戻る」**（前画面に遷移する）リンクを作る。
2. **右寄せ**の位置に配置する。
3. **適当な行**：なるべく、無駄に 1 行を増やさないよう、デザインを考慮した位置に設置

## ワークフロー

### 1. 対象ファイルを読む

- `page.tsx` が薄いラッパー（Client Component に委譲のみ）なら、**実際のヘッダーがある Client Component** を編集する。
- 既に `TenantBackLink` / `MyouBackLink` / 同等の戻る UI があるか確認する。

### 2. 追加しない画面（スキップ）

| 種別                   | 例                                                                      |
| ---------------------- | ----------------------------------------------------------------------- |
| ハブ・メニュー TOP     | `top/page.tsx`, `subMenu/page.tsx`, `adm/page.tsx`, `saas_adm/page.tsx` |
| リダイレクト専用       | `redirect()` のみの page                                                |
| 詳細画面で一覧戻り済み | `← テンプレート一覧`, `〇〇一覧に戻る` 等、親一覧への明示リンク         |
| ツリー／パンくず内蔵   | `DivisionTree`, `EmployeeTable` 等、既存ナビで戻れる UI                 |

### 3. 使うコンポーネント

| 対象                                        | コンポーネント   | import                                  |
| ------------------------------------------- | ---------------- | --------------------------------------- |
| 一般（従業員・テナント管理者・SaaS 管理者） | `TenantBackLink` | `@/components/common/TenantBackLink`    |
| mYou 配下のみ                               | `MyouBackLink`   | `../components/MyouBackLink` 等相対パス |

**原則**: 新規コンポーネントは作らない。`router.back()` を `<a href>` で代用しない。

`TenantBackLink` の仕様:

- Client Component（`'use client'` 内でそのまま import 可）
- ラベル: `← 戻る`
- 遷移: `router.back()`
- Props: `className?`, `variant?: 'default' | 'light'`（暗いヘッダーは `light`）

### 4. 配置パターン（右寄せ・行を増やさない）

既存行を `flex` で左右分割し、**右端に置く**。専用の空行 `<div>` は作らない。

**A. タイトル行（最も多い）**

```tsx
<div className="mb-6 flex items-start justify-between gap-3">
  <div>
    <h1>画面タイトル</h1>
    <p className="text-sm text-gray-500 mt-1">説明</p>
  </div>
  <TenantBackLink />
</div>
```

**B. カードヘッダー（管理者カード型）**

```tsx
<div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
  <div className="flex min-w-0 items-start gap-3">{/* アイコン + h1 + 説明 */}</div>
  <TenantBackLink className="self-start shrink-0" />
</div>
```

**C. タブ行**

```tsx
<div className="flex items-center justify-between border-b border-gray-200">
  <nav className="-mb-px flex gap-6">{/* タブ */}</nav>
  <TenantBackLink className="mb-3 shrink-0" />
</div>
```

**D. ヘッダー + アクションボタン**

戻るはボタン群の**左**、全体は右寄せ:

```tsx
<div className="flex items-center justify-between">
  <div>{/* h1 */}</div>
  <div className="flex items-center gap-2 shrink-0">
    <TenantBackLink />
    <button>新規作成</button>
  </div>
</div>
```

**E. タイトル横にバッジ等（mYou）**

```tsx
<div className="mb-8 flex items-start justify-between">
  <h1>タイトル</h1>
  <div className="flex flex-col items-end gap-1">
    <MyouBackLink />
    {/* バッジ等 */}
  </div>
</div>
```

### 5. パターン選択の目安

| 画面構造                   | 採用               |
| -------------------------- | ------------------ |
| h1 のみ / h1 + 説明        | A                  |
| グレー `header` + 白カード | B                  |
| タブ切替が最上部           | C                  |
| h1 左 + 右に CTA ボタン    | D                  |
| mYou 系                    | E + `MyouBackLink` |

### 6. 実装後チェック

- [ ] import 追加済み
- [ ] ラベルが `← 戻る`（表記ゆれなし）
- [ ] 右寄せ（`justify-between` / `justify-end` / `items-end`）
- [ ] 余計な 1 行を増やしていない
- [ ] 重複する戻るリンクがない
- [ ] `npm run type-check` が通る

## 参照実装

| 画面                       | ファイル                                                       | パターン |
| -------------------------- | -------------------------------------------------------------- | -------- |
| eラーニング テンプレート   | `saas_adm/(puls)/el-templates/page.tsx`                        | A        |
| 評価グローバルテンプレート | `saas_adm/(evaluation)/evaluation-global-templates/page.tsx`   | B        |
| テナント管理               | `features/tenant-management/components/SaasTenantsTabPage.tsx` | C        |
| Echo テンプレート          | `features/echo-template/components/EchoTemplateListClient.tsx` | D        |
| mYou 入荷登録              | `(tenant-users)/myou/receiving-scan/page.tsx`                  | E        |

## 出力

作業完了時、次を簡潔に報告する:

- 追加したファイル一覧
- スキップしたファイルと理由
- 配置パターン（A〜E）の内訳
