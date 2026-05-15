# 管理者向けカード／テーブル一覧 UI

`(colored)/adm/` などで **メインカード＋データテーブル（一覧）** を新規または改修するときは、次を必ず開いて準拠する。

- **`docs/ui/admin-card-and-table.md`**（共通仕様・Tailwind クラス一覧・禁止事項）
- **参照実装**: `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` および同一機能の `SkillMapTabs` / `EmployeeSkillTable` / `SkillRequirementsTable`

ヘルプ系モーダルは別ルール **`.cursor/rules/help-modal-style.mdc`** と混同しないこと。
