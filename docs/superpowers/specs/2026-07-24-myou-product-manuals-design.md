# mYou 製品取扱説明書メニュー（公開ページ）設計

**日付:** 2026-07-24  
**対象:** `/p/myou/product-manuals`（製品ラベル QR からの購入客向け取扱説明書メニュー）

## 背景・目的

ミュー株式会社（mYou）の製品ラベルに貼付した QR コードを、製品を購入した一般顧客がスマホでスキャンし、取扱説明書メニューを表示する。エアコン用・浴室用の各説明書（外部 ChatGPT 共有 URL）へ同一タブで遷移するのみとする。

テナント従業員や SaaS 認証とは無関係。ログイン状態は完全に無視する。

## 要件（確定）

| 項目     | 内容                                                        |
| -------- | ----------------------------------------------------------- |
| URL      | `/p/myou/product-manuals`（QR 印刷用）                      |
| 利用者   | 製品購入客（テナント従業員ではない）                        |
| 認証     | 完全無視（既存 middleware の `/p/` 判定を利用。変更なし）   |
| 見出し   | 「取扱説明書」。会社名はフッターに小さく「ミュー株式会社」  |
| メニュー | ①エアコン用取扱説明書 ②浴室用取扱説明書（各アイコン＋文言） |
| リンク   | 同一タブで外部 URL を開く（`target` なし）                  |
| データ   | DB なし。定数で URL を保持                                  |

外部 URL:

- エアコン用: `https://chatgpt.com/s/m_6a62d057d7788191be18f5781f4aa98b`
- 浴室用: `https://chatgpt.com/s/m_6a62d07c27508191a834d50cff41a6e8`

## アーキテクチャ

静的ページのみ（案1）。features の queries / actions、Supabase、認証チェックは使わない。

```
製品ラベル QR
  → /p/myou/product-manuals（公開・認証無視）
       → エアコン用 ChatGPT URL（同一タブ）
       → 浴室用 ChatGPT URL（同一タブ）
```

- 配置: `src/app/p/myou/product-manuals/`（既存公開ページ `/p/myou/trace/[id]` と同系列）
- middleware: 変更不要（`pathname.startsWith('/p/')` で未認証・認証済みとも通過）
- `(auth)/signup` 配下には置かない（ログイン済みだと `/top` へリダイレクトされるため購入客 QR に不向き）

## ファイル構成

| ファイル                                                           | 役割                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/config/routes.ts`                                             | `APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUALS = '/p/myou/product-manuals'` を追加 |
| `src/app/p/myou/product-manuals/manuals.ts`                        | メニュー定数（label / href / icon）                                         |
| `src/app/p/myou/product-manuals/page.tsx`                          | ページ本体・metadata・UI                                                    |
| `docs/superpowers/specs/2026-07-24-myou-product-manuals-design.md` | 本設計正本                                                                  |

## UI 詳細

既存公開 trace ページのモバイルカード見た目に寄せつつ、説明書メニュー向けに簡素化（緑系ヘッダーは使わない）。

- 中央寄せ・スマホ幅 `max-w-md`
- タイトル「取扱説明書」
- 2 行の大きなタップ領域: Lucide アイコン（エアコン=`Wind`、浴室=`Bath`）＋ラベル＋右に chevron
- 各行は `<a href={url}>`（同一タブ）
- フッター: `ミュー株式会社`（会社名テキストのみ）
- SaaS ログイン・他機能への導線は一切なし

## セキュリティ境界（やらないこと）

- `getServerUser` / Session 依存の分岐
- `createClient` / DB アクセス
- `/myou/*`（テナント内）や `/login` へのリンク
- サービスメニュー・`tenant_service` 登録
- 別プロジェクト作成

## テスト方針

- 自動テストは追加しない（静的 UI・外部リンクが主）
- 手動確認:
  1. 未ログインで `/p/myou/product-manuals` が表示される
  2. ログイン済みでも `/top` に飛ばず同ページが表示される
  3. エアコン／浴室タップで同一タブで各 ChatGPT URL に遷移する
  4. ページ内に SaaS 内 URL へのリンクがない
