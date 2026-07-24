# mYou 資料一覧（doc-index）設計

**日付:** 2026-07-24  
**対象:** `/myou/doc-index`（製品トレーサビリティ関連資料の目次ページ）

## 背景・目的

mYou（製品トレーサビリティ・有効期限管理）向けに、静的なマニュアル資料へアクセスできる「本の目次」風ページを追加する。画像・PDF は画面内モーダルでプレビューし、システム仕様書（既存ユーザマニュアル）は既存画面へ遷移する。

## 要件（確定）

| 項目       | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| URL        | `/myou/doc-index`                                                    |
| 見た目     | 本の「目次ページ」風（カードだらけにしない）                         |
| 導線       | ページ本体のみ作成（サービスメニュー登録・他画面リンクは今回しない） |
| プレビュー | 画像・PDF とも画面内モーダル                                         |
| データ     | DB なし。`public/myou/manual/` の既存アセットを参照                  |

### 目次3項目

| #   | 表示名                           | 操作           | 挙動                         |
| --- | -------------------------------- | -------------- | ---------------------------- |
| 1   | 製品トレーサビリティ管理の全体像 | ボタン「開く」 | モーダルで画像表示           |
| 2   | 簡単操作マニュアル               | ボタン「開く」 | モーダルで PDF（iframe）表示 |
| 3   | システム仕様書                   | ボタン「進む」 | `/myou/manual` へ遷移        |

アセットパス（`public` 起点の URL）:

- 画像: `/myou/manual/img/製品トレーサビリティ管理の全体像.png`
- PDF: `/myou/manual/pdf/簡単操作マニュアル.pdf`

## アーキテクチャ

静的ページ＋ Client コンポーネントでモーダル制御する（案1）。features の queries / actions は不要。

```
page.tsx（Server）
  → DocIndexClient（Client）
       → DocPreviewModal（画像 or PDF）
       → Link / router → APP_ROUTES.MYOU.MANUAL
```

### ファイル構成

| ファイル                                                              | 役割                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/config/routes.ts`                                                | `APP_ROUTES.MYOU.DOC_INDEX = '/myou/doc-index'` を追加 |
| `src/app/(tenant)/(tenant-users)/myou/doc-index/page.tsx`             | ページ本体・metadata                                   |
| `src/app/(tenant)/(tenant-users)/myou/components/DocIndexClient.tsx`  | 目次 UI・開閉状態・遷移                                |
| `src/app/(tenant)/(tenant-users)/myou/components/DocPreviewModal.tsx` | 画像／PDF プレビューモーダル                           |

既存の `myou/loading.tsx` / `error.tsx` を親で共有利用する（doc-index 専用の追加は必須としない）。

## UI 詳細

### 目次ページ

- 見出し「資料一覧」、副題として「目次」
- 各行: `◆` ＋ タイトル ＋ 右寄せボタン
- 右上に `MyouBackLink`（既存 mYou パターン）
- フォント・余白は `/myou/receiving-scan` と同系統（青系タイトル）

### プレビューモーダル

- `@/components/ui/dialog` を使用
- ヘッダーはヘルプモーダルと同系統（`bg-sky-600`、白タイトル、白閉じるボタン）
- 幅: `max-w-4xl` 前後、高さ: `max-h-[85vh]`
- 画像: `<img object-contain>`、本文エリアはスクロール可
- PDF: `<iframe>`（`title` 必須、高さおおよそ `70vh`）
- a11y: `DialogTitle` ＋ `DialogPrimitive.Description`（`sr-only`）

## 影響範囲

- 新規ページとルート定数、mYou 配下のコンポーネント2つ
- 既存 `/myou/manual` の表示ロジックは変更しない（遷移先として利用するのみ）
- メニューマスタ・`tenant_service` / `app_role_service` は変更しない

## テスト方針

- 自動テストは追加しない（静的 UI・アセット表示が主）
- 手動確認:
  1. `/myou/doc-index` が目次風に表示される
  2. 「全体像」→ 画像モーダルが開く／閉じる
  3. 「簡単操作マニュアル」→ PDF が iframe で表示される
  4. 「システム仕様書」→ `/myou/manual` に遷移する
  5. 「← 戻る」が動作する

## スコープ外（やらないこと）

- サービスメニュー・subMenu への登録
- 他画面からのリンク追加
- DB テーブル・マイグレーション
- アセットのコピーやファイル名変更
- Markdown ヘルプ基盤（`HelpMarkdownModal`）への本文登録
