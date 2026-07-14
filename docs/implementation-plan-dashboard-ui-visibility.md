# 実装計画: ダッシュボード UI 表示制御

## 1. 問題定義

一般画面（`/top`）と管理画面（`/adm`）のダッシュボード上のカード・ボタン・セクション等はコード固定で描画されており、テナント契約（`tenant_service`）とは別に「このテナントではこのカードだけ隠す」といった UI 粒度の制御ができない。サイドメニューは既に `tenant_service` × `app_role_service` で制御されているが、ダッシュボード本体は対象外だった。

## 2. ユーザーストーリー

| As a                  | I want to                                              | So that                                  |
| --------------------- | ------------------------------------------------------ | ---------------------------------------- |
| SaaS管理者            | テナントごとにダッシュボード要素の表示を ON/OFF したい | 契約・提供方針に合わせて画面を調整できる |
| テナント従業員 / 人事 | 自社で有効な機能のカード・ボタンだけ見たい             | 未契約・非表示の機能に迷わない           |

## 3. 要求（優先度別）

**Must**

1. 二層制御: ①`tenant_service`（`service_id` 紐付け時）→ ②`tenant_ui_dashboard_element.is_visible`
2. 行なし＝表示（オプトアウト）。明示 `is_visible=false` のみ非表示
3. 書込は SaaS管理者のみ。テナントユーザーは自テナントの SELECT のみ
4. `/top`・`/adm` の主要カード／ボタン／セクション／クイックアクセスをマスタ化

**Should** 5. system-master に「ダッシュボード表示」タブ（テナント選択＋トグル）

**Won't（今回）**

- サイドメニュー制御の変更
- テナント管理者による自社 UI 設定
- 役割単位のダッシュボード要素制御
- カード内リンクや NEW バッジ単体の制御

## 4. データモデル

### `ui_dashboard_element`（要素マスタ）

| カラム                  | 型                            | 説明                                                                   |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| id                      | UUID PK                       |                                                                        |
| element_key             | TEXT UNIQUE NOT NULL          | コード参照キー                                                         |
| screen                  | TEXT NOT NULL                 | `top` \| `adm`                                                         |
| element_type            | TEXT NOT NULL                 | `card` \| `button` \| `section` \| `quick_access` \| `kpi` \| `notice` |
| label                   | TEXT NOT NULL                 | 管理画面表示名                                                         |
| description             | TEXT                          |                                                                        |
| service_id              | UUID NULL → service(id)       | 契約連動。NULL＝契約不要                                               |
| sort_order              | INT NOT NULL DEFAULT 0        |                                                                        |
| is_active               | BOOLEAN NOT NULL DEFAULT true |                                                                        |
| created_at / updated_at | TIMESTAMPTZ                   |                                                                        |

### `tenant_ui_dashboard_element`（テナント別オーバーライド）

| カラム                                     | 型                                   | 説明           |
| ------------------------------------------ | ------------------------------------ | -------------- |
| id                                         | UUID PK                              |                |
| tenant_id                                  | UUID NOT NULL → tenants              |                |
| ui_dashboard_element_id                    | UUID NOT NULL → ui_dashboard_element |                |
| is_visible                                 | BOOLEAN NOT NULL DEFAULT true        | false で非表示 |
| updated_by                                 | UUID NULL                            |                |
| created_at / updated_at                    | TIMESTAMPTZ                          |                |
| UNIQUE(tenant_id, ui_dashboard_element_id) |                                      |                |

### 表示判定

```
visible =
  (element.service_id == null || hasTenantService(tenantId, element.service_id))
  && (override?.is_visible !== false)
```

## 5. 配置ルール

```
src/features/dashboard-ui-visibility/
├── queries.ts   # getVisibleDashboardElementKeys, list for SaaS UI
├── actions.ts   # setTenantUiElementVisibility（SaaS / admin client）
├── types.ts
└── components/
    └── TenantDashboardUiTab.tsx  # system-master タブ
```

利用側: `top/page.tsx`・`adm/page.tsx`・QuickAccess・AdmKpiOverviewSection

## 6. 初期マスタ（element_key）

### top

`top.button.hr_inquiry`, `top.card.condition_checkin`, `top.card.important_task`, `top.card.stress_check`, `top.section.announcements`, `top.notice.consultation`, `top.notice.kudos`, `top.notice.questionnaire`, `top.notice.lifecycle`, `top.section.quick_access`, `top.quick_access.interview_booking`, `top.quick_access.qr_clock`, `top.quick_access.overtime_approve`, `top.quick_access.telework`

### adm

`adm.button.hr_kpi`, `adm.button.manual`, `adm.button.ai_hr_assistant`, `adm.button.consultation_pending`, `adm.kpi.headcount`, `adm.kpi.hired_this_month`, `adm.kpi.turnover`, `adm.kpi.open_positions`, `adm.section.wellbeing`, `adm.card.pulse`, `adm.card.one_on_one`, `adm.card.stress_check`, `adm.card.kudos`, `adm.card.condition`, `adm.card.consultation`, `adm.card.events`, `adm.section.growth`, `adm.card.skill_map`, `adm.card.evaluation`, `adm.card.career`, `adm.card.elearning`, `adm.card.survey`, `adm.section.toolbox`

## 7. 成功指標

- SaaS管理者がテナントを選び、要素トグルで `/top`・`/adm` の表示が即座に変わる
- 既存テナントでオーバーライド行が無い場合、現状どおり全要素が表示される（破壊的変更なし）
- `service_id` 付き要素は未契約テナントでは非表示
