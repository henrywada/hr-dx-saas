# スキル管理機能 設計書（PRD）

> 職種・スキル項目・要件を定義し、従業員のスキル習得・申請・承認・育成ジャーニーを管理する。
> 本ドキュメントは「4機能 運用レベルMVP化」（`~/.cursor/plans/complete-hr-four-features`）フェーズ3の正本記録。

---

## 問題定義

中小企業では「誰がどのスキルを持つか」「次に何を伸ばすべきか」が暗黙知に留まり、
育成計画・配置・評価に活かせない。スキルの自己申告と上長承認の運用が整理されていない。

## プロダクト2大ゴールとの対応

- **組織健康度の可視化**：保有スキルの分布・ギャップを可視化し、育成投資の判断材料にする。
- **コミュニケーションを大切にするシステム**：育成ジャーニー・目標提案を通じて上長と部下の対話を促す。

## ドメイン構成

スキル機能は3ドメインで構成（完成度が高く、本フェーズは整合性確保が中心）：

| ドメイン | 概要 |
| --- | --- |
| `skill-map` | 職種・スキル項目・要件・レベルのマスタ管理（テナント管理者） |
| `skill-portal` | 従業員の自己評価・申請・承認・育成ジャーニー |
| `global-skill-templates` | SaaS 共通の参照テンプレート |

## 配置（CLAUDE.md ルートグループ準拠）

```
src/app/(tenant)/(tenant-admin)/adm/(skill_map)/...     # スキルマップ管理
src/app/(tenant)/(tenant-users)/(skill_portal)/...      # 従業員ポータル・承認・育成ジャーニー
src/app/(saas-admin)/saas_adm/(skill_templates)/...     # グローバルテンプレート
src/features/skill-map/ , src/features/skill-portal/ , src/features/global-skill-templates/
```

---

## MVP 実装範囲（本フェーズで完了）

1. **規約是正**：`skill-approvals/journey/[employeeId]/propose/page.tsx` の `supabase.from(...)` 直叩きを
   `getProposeGoalData()`（`src/features/skill-portal/queries.ts`）経由へ修正。
2. **SaaS グローバルテンプレートの説明整合**：`global-skill-templates` は「スキルレベルセット（評価段階の定義）」のみに
   縮小済み。`/saas_adm/skill-templates` の画面説明文を実装に合わせて修正（業種・職種・スキル項目は各テナントの
   スキルマップで設定する旨を明記）。
3. **未使用スキーマの方針明示（非破壊）**：以下を「MVP未使用 / 予約」として `COMMENT ON TABLE` で明示。
   データ保持方針により **DROP は行わない**（マイグレーション `20260629150000_mark_unused_skill_schema.sql`）。
   - `qualifications` / `employee_qualifications`（資格）
   - `skill_map_drafts`（v1残存・未接続）

## スコープ外（将来フェーズ）

- 資格管理 UI（`qualifications` 系の機能化）。
- スキルマップ下書き（`skill_map_drafts`）の再接続。

## 成功指標

- スキル自己評価・要件達成申請の起票数 / 承認リードタイム。
- 育成ジャーニーで設定された目標の達成率。

## オープンクエスチョン

- 資格管理を MVP 後に正式機能化するか、テーブルごと整理するか。
