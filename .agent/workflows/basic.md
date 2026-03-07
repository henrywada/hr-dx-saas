---
description: 基本設計
---

### 1. 目的
本設計は、**複数テナント（会社）が同一の業務アプリケーション群を共有しつつ、データは完全に分離された状態で運用するマルチテナントSaaS**のフォルダ構造を定義するものである。

具体的には以下を実現する：
- 同一コードベースの業務アプリ（給与・勤怠等）を複数テナントで共有利用
- テナント間のデータ完全分離（Supabase RLS）
- メニュー構造の動的な増減に対応
- アプリ単位での権限・表示制御
- SaaS管理者（supaUser）によるテナント横断のシステム全体管理
- 保守性・拡張性を最優先としたアーキテクチャ

### 2. 設計方針
| # | 方針 | 説明 |
| --- | --- | --- |
| 1 | **Route Group による関心の分離** | `(auth)` / `(tenant)` / `(saas-admin)` の3グループでレイアウト・認証ガードを完全分離 |
| 2 | **動的ルーティングによるメニュー拡張** | `[categorySlug]` / `[appSlug]` でメニュー・アプリの増減時にルーティング変更不要 |
| 3 | **features/ によるアプリ本体の独立管理** | 業務ロジックを `app/` から分離し、複数ルートから同一アプリを呼び出し可能に |
| 4 | **設定駆動（Config-Driven）のメニュー構造** | メニューツリーを `config/` または DB で管理し、コード変更なしで増減対応 |
| 5 | **Supabase クライアントの一元管理** | `lib/supabase/` に3種のクライアントを集約し、全アプリで共有 |
| 6 | **RLS + tenant_id による行レベル分離** | アプリコード側でテナント分離を意識せず、DB層で自動的にデータを分離 |
| 7 | **SaaS管理者の完全隔離** | `(saas-admin)` グループ + `service_role` キーで、テナント壁を超えた管理を安全に実現 |
| 8 | **Guard コンポーネントの階層適用** | layout.tsx にガードを配置し、配下の全ページに認証・権限チェックを自動適用 

## プロジェクト構造
src/
│
├── app/                                    # ===== Next.js App Router ルート =====
│   ├── layout.tsx                          # ルートレイアウト：全Providers注入
│   │                                       #   （AuthProvider, TenantProvider, ThemeProvider等）
│   ├── page.tsx                            # ルート "/" → /login へリダイレクト
│   ├── not-found.tsx                       # 404 カスタムページ
│   ├── error.tsx                           # グローバルエラーバウンダリ
│   ├── loading.tsx                         # グローバルローディングUI
│   │
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   │   【認証グループ】ログイン前のユーザーが通るルート
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   ├── (auth)/                             # 認証関連（URLに "auth" は出ない）
│   │   ├── layout.tsx                      # 認証ページ共通レイアウト（ロゴ+中央配置等）
│   │   ├── login/
│   │   │   └── page.tsx                    # ログイン画面（メール/パスワード, OAuth）
│   │   ├── signup/
│   │   │   └── page.tsx                    # 新規登録画面（テナント初期登録フロー）
│   │   ├── forgot-password/
│   │   │   └── page.tsx                    # パスワードリセット要求
│   │   ├── reset-password/
│   │   │   └── page.tsx                    # パスワード再設定
│   │   └── callback/
│   │       └── route.ts                    # Supabase OAuth コールバック（Route Handler）
│   │
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   │   【テナントグループ】ログイン後の一般ユーザー・テナント管理者が使うルート
│   │   画像の「ログイン → TOPメニュー → 管理者メニュー / 業務メニュー」に対応
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   ├── (tenant)/                           # テナント側（URLに "tenant" は出ない）
│   │   ├── layout.tsx                      # テナント共通レイアウト
│   │   │                                   #   - 認証チェック（未ログイン → /login）
│   │   │                                   #   - tenant_id 解決・注入
│   │   │                                   #   - サイドバー + ヘッダー + パンくず
│   │   │
│   │   ├── top/                            # ── TOPメニュー ──
│   │   │   └── page.tsx                    # ダッシュボード（権限に応じたメニュー表示）
│   │   │                                   # 管理者メニュー / 業務メニューへの入口
│   │   │
│   │   ├── admin/                          # ── 管理者メニュー ──
│   │   │   ├── layout.tsx                  # 管理者ロール（admin）ガード
│   │   │   │                               # admin以外 → /top へリダイレクト
│   │   │   ├── page.tsx                    # 管理者ダッシュボード
│   │   │   │                               # 配下の業務管理メニュー一覧を表示
│   │   │   │
│   │   │   └── [categorySlug]/            # ── 業務管理メニュー（動的） ──
│   │   │       │                           # 例: /admin/hr → 人事管理
│   │   │       │                           # 例: /admin/finance → 経理管理
│   │   │       ├── page.tsx                # カテゴリ配下のアプリ一覧
│   │   │       │
│   │   │       └── [appSlug]/             # ── 管理系アプリ（動的） ──
│   │   │           └── page.tsx            # features/ から動的にアプリ読み込み
│   │   │                                   # 例: /admin/hr/payroll-settings
│   │   │
│   │   └── biz/                            # ── 業務メニュー ──
│   │       ├── layout.tsx                  # 業務ユーザー権限ガード
│   │       ├── page.tsx                    # 業務メニュー一覧
│   │       │                               # 権限に応じたアプリのみ表示
│   │       │
│   │       ├── [categorySlug]/            # ── 業務カテゴリ（動的・ネスト対応） ──
│   │       │   │                           # 例: /biz/hr → 人事業務
│   │       │   │                           # 例: /biz/accounting → 経理業務
│   │       │   ├── page.tsx                # カテゴリ内のアプリ + サブカテゴリ一覧
│   │       │   │
│   │       │   ├── [appSlug]/             # ── 業務アプリ（動的） ──
│   │       │   │   └── page.tsx            # features/ から動的にアプリ読み込み
│   │       │   │                           # 例: /biz/hr/payroll（給与アプリ）
│   │       │   │                           # 例: /biz/hr/attendance（勤怠アプリ）
│   │       │   │
│   │       │   └── [subCategorySlug]/     # ── サブ業務メニュー（ネスト） ──
│   │       │       ├── page.tsx            # 画像の「業務メニュー > 業務メニュー」に対応
│   │       │       └── [appSlug]/
│   │       │           └── page.tsx        # 最深部のアプリ
│   │       └── ...
│   │
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   │   【SaaS管理者グループ】supaUser専用・テナント横断管理
│   │   画像の「SaaS管理者メニュー」に対応
│   │── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
│   └── (saas-admin)/                       # SaaS管理者（URLに "saas-admin" は出ない）
│       ├── layout.tsx                      # supaUser 専用認証ガード
│       │                                   #   - role !== 'supaUser' → 即リダイレクト
│       │                                   #   - service_role クライアント使用
│       │                                   #   - 専用管理UIレイアウト
│       ├── page.tsx                        # SaaS管理ダッシュボード（全体KPI等）
│       │
│       ├── tenants/                        # テナント管理
│       │   ├── page.tsx                    # 全テナント一覧・検索
│       │   └── [tenantId]/
│       │       └── page.tsx                # 個別テナント詳細・設定変更
│       │
│       ├── users/                          # 全ユーザー管理（テナント横断）
│       │   └── page.tsx
│       │
│       ├── apps/                           # アプリ管理（有効化/無効化）
│       │   └── page.tsx
│       │
│       ├── billing/                        # 課金・プラン管理
│       │   └── page.tsx
│       │
│       └── system/                         # システム監視・ログ
│           └── page.tsx
│
│
├── features/                               # ===== 業務アプリ本体（共有モジュール） =====
│   │                                       # app/ から分離することで：
│   │                                       #   - 同一アプリを admin/ と biz/ の両方から呼べる
│   │                                       #   - テナントA も B も同じコードを使う
│   │                                       #   - アプリ追加 = フォルダ追加のみ
│   │
│   ├── payroll/                            # 例：給与アプリ
│   │   ├── components/                     # アプリ固有のUIコンポーネント
│   │   │   ├── PayrollTable.tsx
│   │   │   ├── PayslipDetail.tsx
│   │   │   └── PayrollForm.tsx
│   │   ├── hooks/                          # アプリ固有のカスタムフック
│   │   │   ├── usePayrollData.ts
│   │   │   └── usePayrollCalculation.ts
│   │   ├── actions/                        # Server Actions（DB操作）
│   │   │   ├── getPayrolls.ts
│   │   │   ├── createPayroll.ts
│   │   │   └── updatePayroll.ts
│   │   ├── schemas/                        # Zod バリデーションスキーマ
│   │   │   └── payroll.schema.ts
│   │   ├── types.ts                        # アプリ固有の型定義
│   │   └── index.ts                        # barrel export（公開API）
│   │
│   ├── attendance/                         # 例：勤怠アプリ（同構造）
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── schemas/
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── [新規アプリ名]/                      # ← フォルダ追加だけで拡張可能
│       └── ...                             #    同一構造を踏襲
│
│
├── lib/                                    # ===== 共有ライブラリ =====
│   │
│   ├── supabase/                           # ── Supabase クライアント（全アプリ共有） ──
│   │   ├── client.ts                       # ブラウザ用（anon key）
│   │   │                                   #   createBrowserClient() を export
│   │   ├── server.ts                       # Server Component / Server Action 用
│   │   │                                   #   createServerClient() + cookie 連携
│   │   ├── admin.ts                        # SaaS管理者専用（service_role key）
│   │   │                                   #   RLS バイパス → テナント横断アクセス
│   │   │                                   #   ⚠ (saas-admin) グループ内でのみ使用
│   │   ├── middleware.ts                   # Middleware 用クライアント生成ヘルパー
│   │   └── types.ts                        # DB型定義（supabase gen types で自動生成）
│   │
│   ├── tenant/                             # ── テナント管理 ──
│   │   ├── context.tsx                     # TenantProvider（React Context）
│   │   │                                   #   tenant_id / tenant_name をアプリ全体に提供
│   │   ├── resolve.ts                      # リクエストからtenant_idを解決
│   │   │                                   #   JWT claims / ヘッダー / サブドメイン等
│   │   └── guard.ts                        # テナント境界チェックユーティリティ
│   │                                       #   他テナントのリソースへのアクセスを防止
│   │
│   ├── auth/                               # ── 認証・認可 ──
│   │   ├── context.tsx                     # AuthProvider（ユーザー情報 + ロール）
│   │   ├── roles.ts                        # ロール定義
│   │   │                                   #   supaUser / admin / manager / member
│   │   ├── permissions.ts                  # アプリ単位の権限マップ
│   │   │                                   #   { appSlug: Role[] } 形式
│   │   └── helpers.ts                      # getServerUser() 等のヘルパー関数
│   │
│   └── menu/                               # ── メニュー管理 ──
│       ├── registry.ts                     # アプリ登録レジストリ
│       │                                   #   appSlug → features/ のコンポーネントマッピング
│       ├── types.ts                        # MenuNode 型定義（ツリー構造）
│       ├── filter.ts                       # 権限ベースのメニューフィルタリング
│       │                                   #   ユーザーのロール → 表示可能メニューのみ返す
│       └── builder.ts                      # メニューツリー構築ユーティリティ
│                                           #   DB or config → MenuNode[] 変換
│
│
├── components/                             # ===== 共通UIコンポーネント =====
│   │
│   ├── ui/                                 # 汎用UI部品（Button, Input, Modal, Card等）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── card.tsx
│   │   ├── data-table.tsx                  # 汎用データテーブル
│   │   └── ...
│   │
│   ├── layout/                             # レイアウト部品
│   │   ├── Sidebar.tsx                     # 動的メニューサイドバー
│   │   │                                   #   MenuNode[] を受け取りツリー描画
│   │   ├── Header.tsx                      # ヘッダー（テナント名・ユーザー情報）
│   │   ├── Breadcrumb.tsx                  # 動的パンくずリスト
│   │   └── Footer.tsx
│   │
│   └── guards/                             # アクセス制御コンポーネント
│       ├── AuthGuard.tsx                   # 認証チェック（未ログイン → /login）
│       ├── RoleGuard.tsx                   # ロールチェック（権限不足 → /top）
│       └── AppGuard.tsx                    # アプリ単位アクセス制御
│                                           #   テナントがそのアプリを契約しているか確認
│
│
├── config/                                 # ===== 設定ファイル =====
│   ├── menu.config.ts                      # メニュー構造定義
│   │                                       #   初期は静的定義 → 将来DB移行可能
│   ├── apps.config.ts                      # アプリ登録マスタ
│   │                                       #   { slug, name, featureKey, icon, description }
│   ├── permissions.config.ts               # 権限マトリクス
│   │                                       #   どのロールがどのアプリにアクセス可能か
│   └── site.config.ts                      # サイト全体設定（名称・ロゴ・テーマ等）
│
│
├── middleware.ts                            # ===== Next.js Middleware =====
│                                           #   全リクエストで実行：
│                                           #   1. Supabase セッション更新（cookie refresh）
│                                           #   2. 未認証 → /login リダイレクト
│                                           #   3. tenant_id 解決 → ヘッダー注入
│                                           #   4. supaUser 以外の (saas-admin) アクセス拒否
│
│
├── types/                                  # ===== グローバル型定義 =====
│   ├── database.types.ts