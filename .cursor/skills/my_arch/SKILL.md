---
name: my_arch
description: >-
  hr-dx-saas のコアアーキテクチャを AI に理解させるプリフライトチェックリスト。
  開発セッション開始時に必ず読み込む。ルーティング・レイアウト・認証・データアクセスの
  基本的な仕組みを確認し、CLAUDE.md のルールと合わせて遵守する。
---

# hr-dx-saas アーキテクチャガイド（AIプリフライト）

このスキルを読み込んだら、以下を **声に出して確認** し、理解を示してから開発に進む。

**正典は CLAUDE.md。** アーキテクチャ・権限モデル・基本要件（目標・ペルソナ・app_role定義・メニュー制御テーブル・divisions階層）の詳細な記述はすべて `CLAUDE.md` に集約されている。このスキルはCursor上で開発を始める前に声に出して確認するための要点のみを保持する（重複する詳細表は持たない）。

---

## 0. 基本要件（要点・詳細はCLAUDE.mdの「基本要件」参照）

- **目標**：IT部門に余裕のない中小企業へSaaSを販売し、組織の活性化を支援する。「人を大切に、コミュニケーションを大切に、従業員の能力を活かす組織形成」が理念。
- **ペルソナ**：日本の中小企業（従業員50〜1000名）の経営者・人事責任者
- **権限判定**：`app_role.app_role = 'employee'` → テナントユーザ（管理操作不可） ／ `<> 'employee'` → テナント管理者（役割区分あり） ／ `= 'developer'`（コード上は `user.role === 'supaUser'` とのOR条件もある）→ SaaS管理者
- **メニュー制御**：`service_class` → `service_category` → `services` を `tenant_service`・`app_role_service` の **両方** でフィルタして表示する
- **組織階層**：`divisions`（`layer` / `parent_id`）。集計SQL・フルパス表示等の詳細は `/my_divisions` を使う

---

## 1. 画面の種類とルーティング

hr-dx-saas には **3 種類のルートグループ** があり、URL に応じて異なるレイアウトが適用される。

```
src/app/
├── (tenant)/
│   ├── (tenant-users)/    → variant="portal"  白背景 (#F9FAFB)
│   │   └── top/page.tsx   ← 一般従業員 TOP（URL: /top）
│   └── (tenant-admin)/
│       └── adm/page.tsx   ← テナント管理者 TOP（URL: /adm）
│           layout.tsx     → variant="admin"   グリーン背景 (#f2f8f8)
│                            ロールガードあり（employeeは/topへリダイレクト）
└── (saas-admin)/
    └── saas_adm/page.tsx  ← SaaS管理者 TOP（URL: /saas_adm）
        layout.tsx         → variant="saas" + ロールガード
```

**ルートグループの () は URL に現れない。** `/top` は `(tenant)/(tenant-users)/top/` にある。

**新機能追加時、対象ユーザーに合ったルートグループに `page.tsx` を配置する。**（配置先の対応は上記「0. 基本要件」参照）

---

## 2. AppLayout と共通外枠

すべての認証済み画面は `AppLayout` で包まれる。

```tsx
// src/components/layout/AppLayout.tsx
<AppLayout variant="portal | admin | saas">
  {children}   ← ここに各 page.tsx の戻り値が入る
</AppLayout>
```

`AppLayout` 内部の構造:

```
AuthProvider（useAuth() フック用）
  TenantProvider（useTenant() フック用）
    MobileMenuProvider
      AppHeader(variant)     ← ヘッダー・ナビ
      AppSidebar(variant)    ← サイドバーメニュー
      <main>
        {children}           ← page.tsx の中身
      </main>
      Footer                 ← vX.Y.Z 表示
```

---

## 3. 認証とユーザー情報（getServerUser）

**すべての Server Component は `src/lib/auth/server-user.ts` の `getServerUser()` でユーザーを取得する。** 返り値（`AppUser` 型の各フィールド：`appRole` / `tenant_id` / `planType` / `employee_id` / `division_id` / `is_manager` 等）の詳細は CLAUDE.md の「ユーザー情報（AppUser 型）」表を参照する（重複保持しない）。

---

## 4. データアクセスパターン（厳守）

```
page.tsx（Server Component） → src/features/[domain]/queries.ts（SELECT のみ） → Client Component へ Props で渡す
Client Component → src/features/[domain]/actions.ts（INSERT/UPDATE/DELETE, Server Actions）
```

ボイラープレートのコード例は `/my_scaffold` を使う。Supabaseクライアントの使い分け（`createClient()` / `createAdminClient()`）はCLAUDE.mdの「Supabaseクライアントの使い分け」参照。

**⚠️ エンドユーザーが触れる actions.ts で `createAdminClient()` を絶対に使わない。**

---

## 5. 新機能の実装チェックリスト

```
□ src/config/routes.ts に APP_ROUTES 定数を追加したか
□ 正しいルートグループ（portal/admin/saas-admin）に page.tsx を配置したか
□ features/[domain]/ に queries.ts / actions.ts / types.ts を作成したか（/my_scaffold で生成可）
□ page.tsx の中で直接 supabase.from() を呼んでいないか
□ 新テーブルに RLS ポリシーを設定したか（/my_migration で生成可）
□ URL をハードコードせず APP_ROUTES を使っているか
□ loading.tsx と error.tsx を配置したか
□ コードコメントは日本語で書いているか
```

---

## 6. 絶対禁止事項（要確認）

詳細・理由はCLAUDE.mdの「絶対禁止」表を参照（同一内容を重複保持しない）。要点：`supabase db reset` 禁止／エンドユーザー向け`actions.ts`で`createAdminClient()`禁止／RLSなし新テーブル禁止／`app/api/`への不要なAPI Route追加禁止／URLハードコード禁止／`npx supabase`禁止。

---

## 7. よく使う機能とその場所

| 機能 | feature ディレクトリ | 主なURL |
|------|--------------------|---------| 
| 勤怠・出退勤 | `attendance/`, `qr-punch/`, `telework/` | `/adm/attendance/` |
| 残業管理 | `overtime/` | `/adm/overtime-settings` |
| ストレスチェック | `stress-check/` | `/adm/high-stress` |
| eラーニング | `e-learning/` | `/adm/el-courses` |
| スキルマップ | `skill-map/`, `skill-portal/` | `/adm/skill-map` |
| 評価 | `evaluation/` | `/adm/evaluation` |
| アンケート | `survey/`, `questionnaire/` | `/adm/Survey` |
| 採用AI | `recruitment-ai/`, `job-postings/` | `/adm/(recurit)/` |
| テナント管理 | `tenant-management/` | `/saas_adm/tenants` |

---

## AI への確認事項

このスキルを読み込んだ後、以下を確認してから開発を始める：

1. **基本要件（目標・ペルソナ・権限モデル）を理解したか？**
2. **作業対象のページはどのルートグループに属するか？** （portal / admin / saas-admin）
3. **対象ユーザーは誰か？** （一般従業員 / テナント管理者 / SaaS管理者）
4. **データ取得は queries.ts、書き込みは actions.ts に分離されているか？**
5. **新テーブルを作る場合、RLS ポリシーは設定したか？**

確認後、「アーキテクチャ確認完了。[作業内容] を開始します。」と宣言してから作業に入る。
