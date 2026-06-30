# 1on1ミーティング支援機能 設計書（PRD）

> 管理職（上長）と部下の定期 1on1 を計画・記録・可視化し、コミュニケーション促進と組織健康度把握につなげる。
> 本ドキュメントは「4機能 運用レベルMVP化」（`~/.cursor/plans/complete-hr-four-features`）フェーズ1の正本記録。

---

## 問題定義

中小企業では 1on1 が「実施されているか」「形骸化していないか」を人事が把握できない。
属人的な口頭運用に留まり、実施率・テーマ・所感が記録・集計されない。

## プロダクト2大ゴールとの対応

- **コミュニケーションを大切にするシステム**：1on1 の実施そのものを支援・記録する中核機能。
- **組織健康度の可視化**：管理職別・部署別の実施率を可視化し、コミュニケーションの「抜け」を検知する。

## ユーザーストーリー

- 管理職として、部下との 1on1 を記録し、前回からの経過日数を把握したい。
- 管理職として、過去の 1on1 の所感（notes）を後から参照・修正したい。
- 人事として、組織全体・部署別の 1on1 実施率を俯瞰し、未実施の部署にフォローしたい。

---

## 権限モデル

- アクセス・記録可能：管理職（`employees.is_manager = true`）またはテナント管理者ロール（`app_role.app_role <> 'employee'`）。
- 判定は `canConductOneOnOne(appRole, isManager)`（`src/features/one-on-one/types.ts`）に集約。
  page / actions の両方で同一関数を用い、権限定義の不整合を排除した。

## データモデル（既存テーブル）

| テーブル | 用途 |
| --- | --- |
| `one_on_one_sessions` | 1on1 セッション記録（実施日・対象者・テーマ・所感等） |
| `one_on_one_theme_templates` | テーマテンプレート（有効/無効フラグで論理削除） |

## 配置（CLAUDE.md ルートグループ準拠）

```
src/app/(tenant)/(tenant-admin)/adm/(one_on_one)/one-on-one/page.tsx   # 管理ダッシュボード
src/features/one-on-one/
├── queries.ts      # SELECT（従業員一覧・ダッシュボード・部署別実施率）
├── actions.ts      # record/update/delete セッション・テーマ追加/無効化
├── types.ts        # 型 + canConductOneOnOne
└── components/      # ダッシュボード・履歴テーブル・フォーム・チャート・テンプレート管理
```

---

## MVP 実装範囲（本フェーズで完了）

1. **権限不整合の是正**：page と actions で `canConductOneOnOne` に統一。
2. **記録後の即時反映**：`SessionFormModal` で `router.refresh()`。
3. **セッション CRUD**：`updateOneOnOneSession` / `deleteOneOnOneSession` を追加。履歴テーブルに notes 展開・編集・削除を実装。
4. **テーマテンプレート管理 UI**：`ThemeTemplateManager`（追加・無効化）を `addThemeTemplate` / `deactivateThemeTemplate` に接続。
5. **部署別実施率**：`getDepartmentImplementationRates` を追加し、`ImplementationRateChart` に「管理職別／部署別」切替を実装。
6. **規約是正**：`page.tsx` 内の `supabase.from('employees')` 直叩きを `getActiveEmployeesForOneOnOne()` へ移動。

## スコープ外（将来フェーズ）

- ~~従業員向けの自分が受けた 1on1 履歴閲覧画面。~~ → **O-S1 として `/my-one-on-one` に実装済み（2026-06-30）**
- リマインド通知・アジェンダ事前共有・AI 要約。

## 成功指標

- 管理職の 1on1 実施率（過去 N か月に 1 回以上記録した管理職の割合）。
- 部署別実施率のばらつき低減。

## オープンクエスチョン

- 従業員側の閲覧範囲（所感をどこまで本人に開示するか）。
