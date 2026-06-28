# 機能ブロック別 開発計画（ロードマップ）

> 作成日: 2026-06-27（2026-06-27 knowledge-work-plugins 導入版に再設計）
> 対象: サイドメニューの機能ブロック一覧（画像ベース）
> 参照元: `CLAUDE.md`「基本要件（プロダクトビジョン・権限モデル）」、`src/app/(tenant)/(tenant-admin)/adm/`、`src/features/`、`supabase/migrations/`（`service` / `service_category` テーブル）、`~/.claude/plugins/marketplaces/knowledge-work-plugins/`

---

## 0. 開発プロセスへの knowledge-work-plugins 導入

本ロードマップの実行（5章「次のアクション」以降の各機能ブロック開発）は、Anthropic の `knowledge-work-plugins` マーケットプレイスのプラグインをワークフローに組み込んで進める。**プロダクト機能としてSaaSに組み込むのではなく、この開発プロセス自体を支援するツールとして使う。**

### 0.1 導入が必要なプラグイン

現状、`product-management` / `human-resources` / `design` / `engineering` の4プラグインは別プロジェクト（`dx-toolbox`）にのみ project スコープでインストールされており、本プロジェクト（`hr-dx-saas`）には未導入。着手前に以下を実行する。

```bash
claude plugins add knowledge-work-plugins/product-management
claude plugins add knowledge-work-plugins/engineering
claude plugins add knowledge-work-plugins/design
claude plugins add knowledge-work-plugins/human-resources
```

`human-resources` プラグインは Anthropic 社内の人事運用（オファー作成・人事レポート等）向けだが、本プロジェクトでは **`people-analytics` / `org-planning` / `recruiting-pipeline` 等のスキルをHRドメインの知識リファレンスとして** 利用する（自社の人事運用ツールとしては使わない）。

### 0.2 開発フェーズ × プラグインコマンドの対応

機能ブロックを1つ着手する際は、以下の順でプラグインコマンドを通す。既存の `CLAUDE.md`「新機能の実装手順」「development-workflow.md」のフローに **追加** する形であり、置き換えではない。

| フェーズ | プラグイン / コマンド | 目的 | 既存フローとの関係 |
| --- | --- | --- | --- |
| ① 要求定義 | `product-management` `/write-spec` | 機能ブロックごとのPRD（問題定義・ユーザーストーリー・成功指標）を生成 | `docs/implementation-plan-*.md` 作成前のインプットとする |
| ② ドメイン裏付け | `human-resources` の `people-analytics` / `org-planning` / `recruiting-pipeline` スキル（自動発火） | HR領域の標準的な指標・プロセスでPRDの妥当性を補強 | 2大ゴール（コミュニケーション／組織健康度）との整合チェックに使う |
| ③ ロードマップ更新 | `product-management` `/roadmap-update` | 本ドキュメント（3章の優先順位表）を継続更新 | 本ファイルを正本としつつ、再優先順位付けの都度この手順を通す |
| ④ UI設計 | `design` `/critique`, `/accessibility`, `/ux-copy` | 新規UIのレビュー・WCAG確認・マイクロコピー検討 | **HR-DX Design System（`.claude/rules/design-override.md`）が優先順位の最上位**。デザイントークン・配色・フォント等が競合する提案は採用しない。あくまでフィードバック・監査用途に限定 |
| ⑤ アーキテクチャ | `engineering` `/architecture` | 新規テーブル・Server Actions構成のADR作成 | `architect` agent と併用可。ADRは `docs/implementation-plan-<feature>.md` に格納 |
| ⑥ 実装・レビュー | `engineering` `/review` | コードレビューの補助観点（セキュリティ・性能） | 既存の `code-reviewer` / `security-reviewer` agent による必須レビューを置き換えない（CLAUDE.mdの絶対要件） |
| ⑦ リリース前確認 | `engineering` `/deploy-checklist` | Vercel デプロイ前のチェックリスト生成 | `npm run build` / `npm run type-check` 等の既存コマンドと併用 |

### 0.3 運用ルール

- プラグインのコマンド出力はあくまで**ドラフト・観点提示**であり、CLAUDE.mdの絶対禁止事項・RLS必須・データアクセスパターン等のプロジェクト規約を上書きしない。
- `human-resources` プラグインの `/draft-offer` `/comp-analysis` 等、Anthropic社内向け人事オペレーションコマンドは本プロジェクトでは使用しない（製品ドメインが同じHR領域のため混同しやすい点に注意）。
- 各プラグインの `settings.local.json`（例: `engineering/.claude/settings.local.json`）に本プロジェクトのスタック情報（Next.js 16 / React 19 / Supabase / Tailwind v4）を設定し、出力の精度を上げる。

---

## 1. システム目標に従った全体設計

### 1.1 プロダクトの2大ゴール（再掲・判断基準）

CLAUDE.md に定義済みの中核ゴールを、全機能ブロックの優先順位判断の唯一の基準とする。

1. **コミュニケーションを大切にするシステム** — 従業員間・上長間のコミュニケーションを促進・可視化
2. **組織健康度の可視化** — ストレスチェック・組織診断・残業・離職リスク等を統合し、経営者・人事責任者が組織状態を把握できるようにする

### 1.2 全体アーキテクチャ（5層構造）

サイドメニューの6カテゴリは、データの流れに沿って以下の5層に整理できる。下層（基盤）が整わないと上層（分析・洞察）の精度が出ない、という依存関係を持つ。

```
┌─────────────────────────────────────────────────────────┐
│ 5. 可視化・分析層   サーベイ・分析（組織分析／ストレスチェック）         │
│    → 経営者・人事責任者向けダッシュボード                          │
├─────────────────────────────────────────────────────────┤
│ 4. コミュニケーション層  パルスサーベイ／アンケート／お知らせ／チームコネクト │
│    → ゴール①の中核。日常的な発信・収集の場                        │
├─────────────────────────────────────────────────────────┤
│ 3. ウェルビーイング層   感謝・称賛／コンディション記録／相談窓口／イベント   │
│    → ゴール①②の橋渡し。感情・状態データの収集源                    │
├─────────────────────────────────────────────────────────┤
│ 2. 評価・成長層     パフォーマンス評価／1on1／スキル／eラーニング／キャリア面談│
│    → 個人の成長データ。組織健康度の先行指標にもなる                   │
├─────────────────────────────────────────────────────────┤
│ 1. 基盤層（人材管理） 社員管理／採用管理／オンボーディング／勤怠管理        │
│    → 全データの土台（従業員マスタ・組織階層・在籍状況）               │
└─────────────────────────────────────────────────────────┘
```

- **1. 基盤層** が `employees` / `divisions` / `app_role` のマスタデータを提供し、他の全層がこれに依存する（CLAUDE.md の権限モデル・組織階層を参照）。
- **3. ウェルビーイング層** と **4. コミュニケーション層** が、ゴール①「コミュニケーションを大切にするシステム」の主戦場。現状この2層が最も手薄（後述）。
- **5. 可視化・分析層** は2〜4層のデータを集約してゴール②「組織健康度の可視化」を実現する。既存の `dashboard` / `adm-dashboard` がこの集約ロジックの実装場所。

---

## 2. 機能ブロックごとの「連携・関連」設計

```
                     ┌────────────────┐
                     │ 1. 人材管理（基盤）│
                     │ employees/divisions│
                     └─────────┬──────┘
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                    ▼
   ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │ 2. 評価・成長     │ │ 3. ウェルビーイング │ │ 4. コミュニケーション│
   │ 評価/1on1/スキル/  │←→│ 感謝・称賛/コンディション│←→│ パルス/アンケート/   │
   │ eラーニング/キャリア│ │ /相談窓口/イベント  │ │ お知らせ/チームコネクト│
   └────────┬─────────┘ └─────────┬────────┘ └─────────┬────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  ▼
                     ┌────────────────────────┐
                     │ 5. サーベイ・分析（統合層） │
                     │ ストレスチェック/組織分析  │
                     └────────────────────────┘
```

### 主要な連携ポイント（既存実装ベース）

| 連携 | 内容 | 実装状況 |
| --- | --- | --- |
| 1on1 → 組織分析 | 1on1実施率・頻度を組織分析のeNPS/離職リスク指標に反映 | `adm-dashboard` の `getAdmDashboardSummary()` で一部実装済み（1on1ラベル集計あり） |
| パルスサーベイ → ストレスチェック | `stress-check × Echo パルス` クロス分析 | DBレベルで定義済み（service名「ストレスチェック × Echo クロス分析」）。UI実装は要確認 |
| 採用 → 人材管理 | 内定者が `employees` に登録され基盤層へ合流 | `offer-validation` → `onboarding`/`lifecycle` 連携部分は要強化（後述） |
| 残業管理 → 組織分析 | 残業時間が労務コンプライアンス・組織健康度の指標に | `labor_compliance` ダッシュボードが存在、`hr_kpi` と統合余地あり |
| 感謝・称賛/コンディション記録 → 組織分析 | ウェルビーイング層の生データが可視化層の先行指標になる | **未実装**（最大のギャップ。3章で優先度最上位に設定） |
| 社内お知らせ → 全層 | 各機能ブロックの更新通知のハブ | `dashboard` の `AnnouncementTable` で実装済み。チームコネクト等との連携は今後 |

### 設計上の注意（CLAUDE.md 厳守事項との関係）

- 新規ブロックも `src/features/[domain]/{queries.ts, actions.ts, components/}` パターンに従う。
- 新規テーブルは必ず RLS（テナント分離）を設定。`tenant_service` / `app_role_service` で機能ON/OFFと役割別アクセスを制御する既存メニュー制御の仕組みに乗せる。
- メニュー追加時は `service_category` → `service` → `app_role_service` / `tenant_service` の順でマスタ投入し、`src/config/routes.ts` に `APP_ROUTES` を追加する。

---

## 3. 開発順位リスト（ニーズの優先順位 × 現状の開発状況）

優先度は「**ゴール①②への貢献度（高/中/低）**」×「**現状の充足度（既存/部分/ゼロ）**」のマトリクスで決定。**ゴール直結かつ未着手のブロックを最優先**とする。

| 順位 | 機能ブロック | ゴール貢献度 | 現状充足度 | 優先理由 | 着手時に通すプラグインコマンド |
| --- | --- | --- | --- | --- | --- |
| **1** | ウェルビーイング（感謝・称賛／コンディション記録／相談窓口／社内イベント・表彰） | ①②直結・最高 | ゼロ〜ごく一部 | プロダクトの2大ゴールに直結する4機能が**実質未着手**。最大のギャップであり、最優先で着手すべき | `/write-spec`（4機能分のPRD）→ HR `org-planning`/`people-analytics` で指標裏付け → `/architecture`（投稿・チェックイン・チケット管理のデータモデルADR） |
| **2** | コミュニケーション（チームコネクト） | ① 高 | ゼロ | パルス/アンケート/お知らせは既存。チームコネクトのみ欠落。比較的小さい追加投資で①の面を完成させられる | `/write-spec` → `/critique`（組織図・ディレクトリUIの観点出し、トークンはHR-DX Design System準拠） |
| **3** | 評価・成長（キャリア面談） | ② 中〜高 | ゼロ（隣接機能のsuccessionは存在） | 1on1/評価/スキル/eラーニングが揃う中、キャリア面談だけが欠落。既存の1on1基盤を流用しやすく低コストで穴埋め可能 | `/write-spec` → HR `org-planning` スキルでキャリアパス設計の観点補強 → `/architecture`（1on1基盤の再利用範囲のADR） |
| **4** | 人材管理（オンボーディング） | ① 中・基盤 | 部分（ダッシュボードのみ） | 新入社員の早期コミュニケーション・能力活用の起点。タスク管理・チェックリストが未実装で「3件」表示の実体が薄い | HR `org-planning` スキルでチェックリスト標準項目を参照 → `/write-spec` → `/architecture` |
| **5** | サーベイ・分析（組織分析の統合強化） | ② 最高・既存強化 | 既存（個別ダッシュボードは充実、横断統合が弱い） | ウェルビーイング層のデータが揃い始めた段階で、それらを束ねる統合ダッシュボードの強化が効果を最大化する。優先度1〜3の後続として位置づけ | HR `people-analytics` スキルで統合指標を定義 → `/metrics-review` → `/architecture` |
| 6 | 評価・成長（既存機能の連携強化） | ② 中 | 既存（個別機能は完成度高） | パフォーマンス評価／1on1／スキル／eラーニングは実装済み。組織分析との連携強化が中心 | `/roadmap-update` で連携要件を再整理 → `/architecture` |
| 7 | 人材管理（既存機能の最適化） | 基盤・中 | 既存（充実） | 社員管理／採用管理／勤怠管理は完成度高い。保守・最適化フェーズ | `/review`（既存コードの保守観点） → `/deploy-checklist` |
| 8 | コミュニケーション（既存機能の最適化） | ① 中 | 既存（充実） | パルスサーベイ／アンケート／お知らせは実装済み。チームコネクト追加後に全体最適化 | `/roadmap-update` → `/ux-copy`（既存UIの文言見直し） |

### 開発順位の要約（実行順）

1. ウェルビーイング層を新規構築（感謝・称賛 → コンディション記録 → 相談窓口 → 社内イベント・表彰の順、下記4章参照）
2. チームコネクトを新規構築
3. キャリア面談を新規構築（1on1基盤を再利用）
4. オンボーディングのタスク管理機能を追加開発
5. 組織分析ダッシュボードにウェルビーイング層データを統合
6. 既存ブロックの連携強化・最適化（評価/成長 → 人材管理 → コミュニケーション）

---

## 4. 機能ブロックごとのモジュール状況（完成済 / 開発中 / 未開発）

凡例: ✅ 完成済　🟡 開発中・部分実装　⬜ 未開発

### 4.1 人材管理

| モジュール | 状況 | 実装場所 |
| --- | --- | --- |
| 社員管理 | ✅ | `adm/(base_mnt)/employees`, `adm/(base_mnt)/divisions` |
| 採用管理 | ✅ | `adm/(recurit)/{funnel, hellowork, job-branding, job-positions, market-analysis, offer-validation, pulse, recruitment-ai, recruitment-ai-log, referral}`, `features/recruitment-ai`, `features/job-postings`, `features/offer-validation` |
| 勤怠管理 | ✅ | `adm/(qr_atendance)`, `adm/(csv_atendance)`, `adm/(pc_atendance)`, `adm/(overtime)`, `features/telework`, `features/attendance`, `features/overtime` |
| オンボーディング | 🟡 | `adm/(lifecycle)/lifecycle/page.tsx`（ダッシュボードのみ、タスク・チェックリスト管理が**未実装**） |

### 4.2 ウェルビーイング

| モジュール | 状況 | 実装場所 |
| --- | --- | --- |
| 感謝・称賛（Kudos） | ⬜ | 該当ディレクトリ・テーブル無し。`features/engagement` は集計ダッシュボード（複数施策の指標統合）のみで、称賛投稿そのものは未実装 |
| コンディション記録（日次/週次チェックイン） | ⬜ | 未実装。近接機能の `pulse-stress`（パルス×ストレスのクロス分析）はあるが、個人の日次コンディション記録UIは無し |
| 悩み・相談窓口 | ⬜ | 未実装。`features/inquiry-chat` は別用途（旧 portal inquiry chat、`20260412120000_remove_portal_inquiry_chat_service.sql` で一部削除済み）のため転用要検討 |
| 社内イベント・表彰 | ⬜ | 未実装 |

### 4.3 評価・成長

| モジュール | 状況 | 実装場所 |
| --- | --- | --- |
| パフォーマンス評価 | ✅ | `adm/(evaluation)`, `features/evaluation`, `(tenant-users)/my-evaluation`, `my-evaluation-360`, `features/global-evaluation-templates` |
| 1on1/フォローアップ | 🟡 | `adm/(one_on_one)/one-on-one/page.tsx`（基本実装あり、フォローアップ機能の深さは要検証） |
| スキル・能力向上 | ✅ | `adm/(skill_map)`, `features/skill-map`, `features/skill-portal`, `(tenant-users)/(skill_portal)/{my-skills, skill-approvals}`, `features/global-skill-templates` |
| eラーニング | ✅ | `adm/(el)`, `features/e-learning`, `(tenant-users)/(el)/el-courses` |
| キャリア面談 | ⬜ | 未実装。近接機能の `features/succession-plan`（後継者計画）はあるが、個人のキャリア面談記録・面談予約機能は無し |

### 4.4 コミュニケーション

| モジュール | 状況 | 実装場所 |
| --- | --- | --- |
| パルスサーベイ | ✅ | `adm/(puls)`, `adm/(org_health)/pulse-stress`, `features/candidate-pulse`（採用候補者向け）, `recurit/pulse`（採用パルス） |
| アンケート | ✅ | `adm/(questionnaire)`, `features/questionnaire`, `(tenant-users)/{survey, answers}`, `features/survey` |
| 社内お知らせ | ✅ | `adm/(base_mnt)/announcements`, `features/dashboard/components/{AnnouncementTable, AnnouncementFormDialog}` |
| チームコネクト | ⬜ | 未実装。組織図・社内ディレクトリ・社内SNS的な機能は現状無し |

### 4.5 サーベイ・分析

| モジュール | 状況 | 実装場所 |
| --- | --- | --- |
| ストレスチェック | ✅ | `adm/(org_health)/{stress-check, high-stress, gov-report, establishments}`, `features/stress-check`, `(tenant-users)/stress-check` |
| 組織分析 | 🟡 | `adm/(org_health)/survey/dashboard`, `features/hr-kpi`, `features/turnover-risk`, `features/labor-compliance`, `features/organization`, `features/adm-dashboard`（`getAdmDashboardSummary()`）— 個別ダッシュボードは充実だが、ウェルビーイング層データを含む**横断統合ビュー**は未完成 |

### 4.6 その他（サイドメニュー外・基盤機能として既存）

| モジュール | 状況 | 補足 |
| --- | --- | --- |
| AI採用アシスタント / AI職場改善 | ✅ | `features/hr-assistant`, `adm/(ai_agent)`, Gemini移行対応済み（memory: `project_openai_to_gemini_migration.md`） |
| 産業医連携 | ✅ | `adm/(company_doctor)` |
| SaaS管理（テナント管理・システムマスタ） | ✅ | `(saas-admin)/saas_adm`, `features/tenant-management`, `features/system-master` |

---

## 5. 次のアクション

1. `claude plugins add knowledge-work-plugins/{product-management,engineering,design,human-resources}` を実行し、0章のプラグインを本プロジェクトに導入する。
2. 優先度1位「ウェルビーイング」から着手。`product-management` の `/write-spec` で感謝・称賛／コンディション記録／相談窓口／社内イベント・表彰の4機能分PRDを作成し、`docs/implementation-plan-<feature-name>.md` に格納する。
3. PRD作成時、`human-resources` プラグインの `people-analytics` / `org-planning` スキルを自動発火させ、HRドメインの標準的な指標・プロセスでゴール①②との整合を確認する。
4. UI設計時は `design` プラグインの `/critique` `/accessibility` でフィードバックを得つつ、最終的な配色・トークン・フォントは必ず HR-DX Design System（`.claude/rules/design-override.md`）に従う。
5. データモデル確定時は `engineering` プラグインの `/architecture` でADRを作成し、`tdd-guide` agent によるTDDワークフローで実装に着手する。
6. 新規テーブルは `service_category` / `service` マスタへの投入と RLS ポリシー設定を伴うため、`my_db_table` / `my_migration` skill のフローに従う。
7. 実装完了後は既存必須レビュー（`code-reviewer` / `security-reviewer` agent）に加え、`engineering` プラグインの `/review` `/deploy-checklist` を通してリリース前確認を行う。
8. 機能ブロック1つが完了するたびに `product-management` の `/roadmap-update` を実行し、本ドキュメント3章の優先順位表・開発状況（4章）を更新する。
