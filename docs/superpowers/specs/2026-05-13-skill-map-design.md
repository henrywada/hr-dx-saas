# スキルマップ起点UI 設計ドキュメント

**作成日:** 2026-05-13  
**対象:** HR-DX SaaS — テナント管理者向け「スキルマップ起点UI」  
**優先度:** フェーズA（最初の差別化機能）

---

## 背景・目的

カオナビの「顔写真」重視UIに対し、製造業・IT業の現場ニーズに即した「スキル・資格起点」のUIを構築する。スキルマトリクス（星取表）・配置シミュレーション・資格期限管理を一体化し、競合製品に対する最大の差別化ポイントとする。

---

## 対象ユーザー

| ユーザー種別 | 主な操作 |
|---|---|
| テナント管理者（人事） | スキル定義・マトリクス編集・配置シミュレーション・資格管理 |
| SaaS管理者（supaUser） | グローバルテンプレートのCRUD |

---

## DBスキーマ

### グローバルテンプレート（tenant_id なし・全テナントSELECT可）

```sql
global_skill_templates
  id UUID PK
  industry_type TEXT  -- 'manufacturing' | 'it'
  name TEXT
  description TEXT
  is_active BOOLEAN DEFAULT true

global_skill_categories
  id UUID PK
  template_id UUID REFERENCES global_skill_templates
  name TEXT
  sort_order INTEGER

global_skills
  id UUID PK
  template_id UUID REFERENCES global_skill_templates
  category_id UUID REFERENCES global_skill_categories
  name TEXT
  description TEXT
  sort_order INTEGER

global_proficiency_defs
  id UUID PK
  template_id UUID REFERENCES global_skill_templates
  level INTEGER        -- 製造業: 1-4 / IT: 1-5
  label TEXT           -- 例: '独力OK' / '★★★★★'
  color_hex TEXT       -- ヒートマップ色
```

**RLS:** `SELECT` 全ユーザー許可。`INSERT/UPDATE/DELETE` は `service_role` のみ。

### テナント固有（全テーブルに tenant_id + RLS）

```sql
skill_categories
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  name TEXT
  source_template_id UUID REFERENCES global_skill_templates  -- コピー元（nullable）
  sort_order INTEGER

skills
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  category_id UUID REFERENCES skill_categories
  name TEXT
  description TEXT
  sort_order INTEGER

skill_proficiency_defs
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  level INTEGER
  label TEXT
  color_hex TEXT

employee_skills
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  employee_id UUID REFERENCES employees(id)
  skill_id UUID REFERENCES skills(id)
  proficiency_level INTEGER
  evaluated_at TIMESTAMPTZ
  evaluated_by UUID REFERENCES employees(id)

qualifications
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  name TEXT
  issuing_body TEXT
  renewal_years INTEGER  -- 更新年数（nullは無期限）

employee_qualifications
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  employee_id UUID REFERENCES employees(id)
  qualification_id UUID REFERENCES qualifications(id)
  acquired_date DATE
  expiry_date DATE        -- nullは無期限
  cert_number TEXT

skill_map_drafts
  id UUID PK
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  name TEXT
  created_by UUID REFERENCES employees(id)
  status TEXT DEFAULT 'draft'  -- 'draft' | 'confirmed'
  snapshot JSONB   -- { "employee_id": "division_id", ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()
```

**RLS:** 全テーブルに `tenant_id = public.current_tenant_id()` ポリシー（既存パターンと同一）。

---

## テンプレートコピーフロー

```
セットアップウィザード（テナント管理者）
  → 業種選択（製造業 / IT業 / カスタム）
  → Server Action: copyTemplateToTenant(templateId, tenantId)
      → global_skill_categories を skill_categories へ一括INSERT
      → global_skills を skills へ一括INSERT
      → global_proficiency_defs を skill_proficiency_defs へ一括INSERT
      → source_template_id に出自を記録
  → 以降はテナントが自由に編集可能
```

---

## アプリケーションアーキテクチャ

### ルート構成

```
src/app/(tenant)/(colored)/adm/
└── skill-map/
    ├── page.tsx                    # スキルマトリクス（Server Component）
    ├── loading.tsx / error.tsx
    ├── setup/
    │   └── page.tsx                # 業界テンプレート選択ウィザード
    ├── qualifications/
    │   └── page.tsx                # 資格管理一覧
    └── simulation/
        ├── page.tsx                # 下書き一覧
        └── [draftId]/
            └── page.tsx            # D&Dシミュレーション編集画面

src/app/(saas-admin)/saas_adm/
└── global-skill-templates/
    └── page.tsx                    # グローバルテンプレートCRUD
```

### フィーチャー構成

```
src/features/skill-map/             # テナント管理者向け
  components/
    SkillMatrix.tsx                  # ヒートマップ形式メインマトリクス
    SkillMatrixCell.tsx              # 習熟度セル（色・アイコン）
    QualificationBadge.tsx           # 資格バッジ（期限アラート付き）
    SetupWizard.tsx                  # テンプレート選択UI
    SimulationBoard.tsx              # D&Dシミュレーション（dnd-kit）
    SkillCoverageBar.tsx             # チームスキル充足率インジケータ
    EmployeeSidePanel.tsx            # 従業員詳細パネル（資格・評価履歴）
  queries.ts                         # SELECT（createClient + RLS）
  actions.ts                         # INSERT/UPDATE/DELETE Server Actions
  types.ts

src/features/global-skill-templates/ # SaaS管理者向け
  components/
    TemplateEditor.tsx               # ※ skill-map/components/ を再利用
  queries.ts                         # SELECT（createAdminClient）
  actions.ts                         # CRUD（createAdminClient）
  types.ts
```

**UIコンポーネントは `features/skill-map/components/` に一元化し、SaaS管理者画面も同じコンポーネントを import することでコード重複を排除する。**

### データフロー

```
page.tsx (Server Component)
  → queries.ts でスキル×従業員データを一括取得
  → SkillMatrix（Client Component）に props 渡し
  → セル編集 → actions.ts（Server Action）→ revalidatePath
```

---

## スキルマトリクスUI仕様

| 軸 | 内容 |
|---|---|
| 縦軸 | 従業員（部署フィルタ切替可能） |
| 横軸 | スキル（カテゴリでグループ化） |
| セル | 習熟度ヒートマップ（製造業4段階 / IT5段階） |
| 行末 | 従業員ごとのスキル充足率 % |
| 列末 | スキルごとの習得率 %（部署の穴を可視化） |

**習熟度カラーマッピング（製造業デフォルト）:**

| レベル | ラベル | 色 |
|---|---|---|
| 4 | 独力OK | 🟢 `#16a34a` |
| 3 | 指導あり | 🟡 `#ca8a04` |
| 2 | 見習い | 🟠 `#ea580c` |
| 1 | 未習得 | ⬜ `#e5e7eb` |

**インタラクション:**
- セルクリック → インラインドロップダウンで習熟度を即時更新（Server Action保存）
- 行クリック → 従業員サイドパネル（資格バッジ・評価履歴）
- 列ヘッダークリック → 昇順/降順ソート

---

## 配置シミュレーション（D&D）仕様

```
左ペイン: 従業員カード一覧（現部署表示）
右ペイン: 部署ツリー（ドロップ先）

ドラッグ中リアルタイム計算:
  ドロップ先部署の「スキル充足率」を即座に再計算 → SkillCoverageBar 更新
  スキル不足の場合は赤色ハイライト表示

下書き保存: skill_map_drafts.snapshot に JSONB { employee_id: division_id } を保存
確定:       「この配置を適用」→ employees.division_id を一括 UPDATE
```

**外部ライブラリ:** `@dnd-kit/core` + `@dnd-kit/sortable`（軽量・アクセシブル）

---

## 資格管理・アラート仕様

**バッジ表示:**
- 有効: 通常バッジ（グリーン）
- 期限30日以内: 警告バッジ（オレンジ）
- 期限切れ: 危険バッジ（レッド）

**アラート通知（3段階）:**

| タイミング | チャネル |
|---|---|
| 期限30日前 | メール（本人 + 管理者）+ アプリ内通知 |
| 期限7日前 | メール（本人 + 管理者）+ アプリ内通知 |
| 期限当日 | メール（本人 + 管理者）+ アプリ内通知 |

**実装:** Supabase Edge Function + `pg_cron`（毎朝8:00 JST）。既存の overtime 通知パターンを踏襲。

---

## 実装フェーズ

| フェーズ | 内容 | 完了条件 |
|---|---|---|
| 1 | DBスキーマ・マイグレーション・グローバルテンプレートシード | マイグレーション適用成功 |
| 2 | テンプレートコピーウィザード・スキル定義CRUD | テナントがスキルを定義できる |
| 3 | スキルマトリクス表示・習熟度編集 | マトリクスが正しく描画・更新される |
| 4 | 資格管理・バッジ表示 | 資格の登録と期限バッジが機能する |
| 5 | 配置シミュレーション（D&D・下書き保存） | ドラッグ配置と充足率計算が動作する |
| 6 | アラートバッチ（Edge Function + pg_cron） | メール・アプリ内通知が送信される |
| 7 | SaaS管理者テンプレートCRUD画面 | グローバルテンプレートの追加・編集ができる |

---

## 検証方法

1. **マイグレーション:** `supabase migration up` が正常完了
2. **RLS:** 別テナントのスキルデータが参照できないことを確認
3. **テンプレートコピー:** 業種選択後にスキル項目が正しくテナントへコピーされる
4. **マトリクス表示:** 部署フィルタ切替で正しい従業員・スキルが表示される
5. **習熟度更新:** セルクリック → 保存 → リロード後も値が保持される
6. **充足率計算:** D&Dで従業員を移動した際に充足率がリアルタイム更新される
7. **資格バッジ:** 期限30日前の資格にオレンジバッジが表示される
8. **アラートバッチ:** Edge Function をローカルで手動実行してメール送信を確認

---

## 関連ファイル（既存・参照用）

- [src/features/organization/types.ts](../../../src/features/organization/types.ts) — Employee・Division 型
- [src/lib/supabase/server.ts](../../../src/lib/supabase/server.ts) — createClient()
- [src/lib/supabase/admin.ts](../../../src/lib/supabase/admin.ts) — createAdminClient()
- [src/lib/auth/server-user.ts](../../../src/lib/auth/server-user.ts) — getServerUser()
- [src/config/routes.ts](../../../src/config/routes.ts) — APP_ROUTES（URLはここに追加）
- [supabase/migrations/20260502100000_division_establishments_stress_enhancements.sql](../../../supabase/migrations/20260502100000_division_establishments_stress_enhancements.sql) — RLSポリシーパターン参考
