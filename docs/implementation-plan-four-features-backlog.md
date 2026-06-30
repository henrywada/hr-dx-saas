# 1on1 / 評価 / スキル / eラーニング Should/Could バックログ

> 参照: `complete-hr-four-features` 運用レベルMVP計画、`implementation-plan-evaluation-growth-linkage.md`
> 最終更新: 2026-06-30

MVP（フェーズ0〜5）は完了済み。以下は Should/Could の残件整理と消化状況。

---

## 横断連携（P6 評価・成長）

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| EG-M1 | Must | `/adm` 評価・キャリア面談カード | ✅ 完了 |
| EG-S1 | Should | turnover-risk 成長因子（1on1/評価/スキル/eL） | ✅ 完了 |
| EG-C1 | Could | engagement ダッシュボードへの成長KPI統合 | ✅ 完了 |

---

## 1on1

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| O-S1 | Should | 従業員向け 受けた1on1履歴閲覧（`/my-one-on-one`） | ✅ 完了 |
| O-C1 | Could | リマインド通知・アジェンダ事前共有 | ✅ 完了（2026-06-30） |
| O-C2 | Could | AI 要約 | ✅ 完了（2026-06-30） |

---

## 評価

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| EV-S1 | Should | 評価期間選択 UI（`/adm` カード） | ✅ 完了 |
| EV-C1 | Could | リマインドメール | ✅ 完了（2026-06-30） |

MVP フェーズ2（上司評価UI・シート詳細・等級確定）は完了済み。

---

## スキル

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| SK-S1 | Should | 資格管理 UI（`qualifications` 系） | ✅ 完了（2026-06-30） |
| SK-C1 | Could | `skill_map_drafts` 再接続 | ✅ 完了（2026-06-30） |

MVP フェーズ3（規約是正・SaaSテンプレ説明・未使用スキーマ明示）は完了済み。

---

## eラーニング

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| EL-S1 | Should | 受講期限超過アラート（管理者） | ✅ 完了 |
| EL-S2 | Should | 部署別受講集計 | ✅ 完了 |
| EL-C1 | Could | 修了証 PDF（印刷） | ✅ 完了（2026-06-30） |
| EL-C2 | Could | SCORM / xAPI | ✅ MVP完了（2026-06-30） |

MVP フェーズ4（進捗UI・AI生成接続・URL規約）は完了済み。

---

## 推奨次ステップ

1. ~~サービスマスタに `/my-one-on-one` を登録（メニュー到達）~~ ✅ 完了（`20260630170000_add_growth_features_service_masters.sql` — 4機能ルート一括登録）
2. ~~EV-S1 評価期間選択（`/adm` カード）~~ ✅ 完了
3. ~~エンタープライズ拡張（O-C1/EV-C1/EL-C1）~~ ✅ フェーズ1完了 — [implementation-plan-enterprise-expansion.md](./implementation-plan-enterprise-expansion.md)
4. ~~エンタープライズ拡張フェーズ2（O-C2/SK-S1/SK-C1/E-O2）~~ ✅ 完了（2026-06-30）
5. ~~**EL-C2** SCORM / xAPI~~ ✅ MVP完了 — [implementation-plan-el-c2-scorm-xapi.md](./implementation-plan-el-c2-scorm-xapi.md)
