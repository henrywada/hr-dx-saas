# スキルマップ v2 設計ドキュメント

**作成日:** 2026-05-14
**対象:** HR-DX SaaS — スキルマップ機能のコンセプト変更
**前バージョン:** docs/superpowers/specs/2026-05-13-skill-map-design.md

---

## 背景・目的

旧スキルマップは「習熟度マトリクス型」（従業員×スキル項目の星取表）だったが、実際のニーズは **「誰がどの職種・技能を持っているか」** の把握と管理であることが判明。

コンセプトを以下に変更する：
- **旧：** スキル = 個別の作業項目（旋盤操作・ISO知識等）の習熟度を多軸評価
- **新：** スキル = 職種・技能（旋盤工・プログラマー・会計士等）を従業員に割り当て

これにより「誰が何の職種か」が一目で分かり、兼務・職種変更の履歴も追跡できる。

---

## 対象ユーザー

| ユーザー種別 | 主な操作 |
|---|---|
| テナント管理者（人事） | 技能マスタ管理・従業員への技能割り当て・変更・履歴確認 |

---

## DBスキーマ変更

### 削除するテーブル（旧マトリクス型）

```sql
-- グローバルテンプレート系
DROP TABLE global_proficiency_defs;
DROP TABLE global_skills;
DROP TABLE global_skill_categories;
DROP TABLE global_skill_templates;

-- テナント固有のマトリクス系
DROP TABLE employee_skills;
DROP TABLE skill_proficiency_defs;
DROP TABLE skills;
DROP TABLE skill_categories;
```

### 新規追加するテーブル

```sql
-- テナントの技能マスタ（職種・技能の一覧）
CREATE TABLE public.tenant_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenant_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tenant_skills
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- 従業員への技能割り当て（履歴テーブル兼用）
CREATE TABLE public.employee_skill_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES public.tenant_skills(id) ON DELETE CASCADE,
  started_at  DATE NOT NULL,
  reason      TEXT,
  assigned_by UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_skill_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.employee_skill_assignments
  FOR ALL USING (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.employee_skill_assignments (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_assignments (tenant_id, skill_id);
```

### 維持するテーブル

変更なし：
- `qualifications` / `employee_qualifications`（資格管理）
- `skill_map_drafts`（配置シミュレーション）

---

## 「現在の技能」の定義

`employee_skill_assignments` は履歴テーブル兼用のため、同一 `employee_id × skill_id` の行が複数存在しうる。

**現在有効な割り当て** = `employee_id × skill_id` の組み合わせで `started_at` が最新の行。

```sql
SELECT DISTINCT ON (employee_id, skill_id)
  employee_id, skill_id, started_at, reason
FROM employee_skill_assignments
WHERE tenant_id = current_tenant_id()
ORDER BY employee_id, skill_id, started_at DESC;
```

---

## アプリケーション構成

### ルート構成

```
src/app/(tenant)/(colored)/adm/
└── skill-map/
    ├── page.tsx                    # メイン画面（タブ切り替え）
    ├── loading.tsx / error.tsx
    ├── qualifications/
    │   └── page.tsx                # 資格管理（既存のまま）
    └── simulation/
        └── page.tsx                # 配置シミュレーション（既存のまま）
```

SaaS管理者向け `global-skill-templates` 画面は削除する。

### フィーチャー構成

```
src/features/skill-map/
  components/
    SkillMapTabs.tsx              # 従業員ビュー ⇔ 技能ビュー タブ
    EmployeeSkillTable.tsx        # 従業員起点テーブル（バッジ表示）
    SkillGroupView.tsx            # 技能起点グループビュー
    AssignSkillModal.tsx          # 技能割り当て・変更モーダル
    SkillHistoryPanel.tsx         # 変更履歴タイムライン
    SkillBadge.tsx                # 技能バッジ（color_hex対応）
    TenantSkillManager.tsx        # 技能マスタ管理（追加・編集・削除）
  queries.ts
  actions.ts
  types.ts
```

### 削除するファイル

```
src/features/skill-map/components/SkillMatrix.tsx
src/features/skill-map/components/SkillMatrixCell.tsx
src/features/skill-map/components/SkillCoverageBar.tsx
src/features/skill-map/components/SetupWizard.tsx
src/features/global-skill-templates/（ディレクトリごと削除）
src/app/(saas-admin)/saas_adm/global-skill-templates/（削除）
```

---

## 画面仕様

### メイン画面（`/adm/skill-map`）

- 部署フィルタ（チップ選択、全部署 + 各部署）
- タブ：👤 従業員ビュー / 🏷️ 技能ビュー

#### 従業員ビュータブ

| カラム | 内容 |
|---|---|
| 従業員名 | 氏名 |
| 部署 | 所属部署名 |
| 現在の技能 | 有効な割り当て全件をバッジ表示（color_hex） |
| 直近変更日 | 最新 started_at |
| 操作 | ✏️ 編集 / 📋 履歴 |

- 技能未設定の行は「＋ 割り当て」を表示
- ✏️ 編集 → AssignSkillModal（追加 or 削除）
- 📋 履歴 → SkillHistoryPanel

#### 技能ビュータブ

- 技能ごとにグループカード
- カード内：技能名・人数・従業員名（部署付き）
- 技能マスタ管理ボタン（追加・色変更・削除）

### AssignSkillModal

| フィールド | バリデーション |
|---|---|
| 技能名（Select + 新規作成） | 必須 |
| 開始日 | 必須、DATE |
| 変更理由・メモ | 任意 |

ドロップダウン末尾に「── 新しい技能を作成...」オプションを配置。

### SkillHistoryPanel

- タイムライン形式（新→旧）
- 各エントリ：技能名・started_at・reason・assigned_by
- 下部に「＋ 技能を追加・変更」ボタン

---

## データフロー

```
page.tsx（Server Component）
  → queries.ts: getSkillMapData()
      ├── employees + divisions
      ├── tenant_skills（全マスタ）
      └── employee_skill_assignments（DISTINCT ON で現在有効分）
  → SkillMapTabs（Client Component）に props 渡し

AssignSkillModal
  → actions.ts: assignSkill({ employeeId, skillId, startedAt, reason })
      → INSERT INTO employee_skill_assignments
  → actions.ts: removeSkillAssignment({ id })
      → DELETE FROM employee_skill_assignments（物理削除）
  → revalidatePath('/adm/skill-map')

TenantSkillManager
  → actions.ts: createSkill / updateSkill / deleteSkill
```

---

## 実装フェーズ

| # | 内容 | 完了条件 |
|---|---|---|
| 1 | マイグレーション（旧DROP → 新CREATE + RLS） | `supabase migration up` 成功 |
| 2 | types.ts / queries.ts / actions.ts | 型安全・RLS通過 |
| 3 | 従業員ビュー（SkillMapTabs・EmployeeSkillTable・SkillBadge） | 一覧表示・部署フィルタ動作 |
| 4 | AssignSkillModal（割り当て追加・削除） | 保存・削除が画面に反映 |
| 5 | SkillHistoryPanel（履歴タイムライン） | 全履歴が時系列表示 |
| 6 | 技能ビュー（SkillGroupView） | 技能ごとのグループ表示 |
| 7 | TenantSkillManager（マスタ管理） | 追加・色変更・削除が動作 |
| 8 | 旧コンポーネント・ページ削除 | `npm run build` エラーなし |

---

## 検証方法

1. **RLS:** 別テナントの技能データが参照・更新できない
2. **割り当て追加:** モーダル保存→バッジが一覧に表示される
3. **履歴:** 同スキルの再割り当てで履歴行が増える
4. **削除:** 物理削除で履歴から消える
5. **技能ビュー:** タブ切り替えでグループ表示される
6. **マスタ管理:** 技能名・色変更がバッジに即反映
7. **ビルド:** `npm run build` エラーなし

---

## 関連ファイル

- [src/features/organization/types.ts](../../../src/features/organization/types.ts) — Employee・Division 型
- [src/lib/supabase/server.ts](../../../src/lib/supabase/server.ts) — createClient()
- [src/lib/auth/server-user.ts](../../../src/lib/auth/server-user.ts) — getServerUser()
- [src/config/routes.ts](../../../src/config/routes.ts) — APP_ROUTES
- [supabase/migrations/20260513000000_skill_map_schema.sql](../../../supabase/migrations/20260513000000_skill_map_schema.sql) — 削除対象テーブルの定義
