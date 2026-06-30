# 社内イベント・表彰 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度1位（ウェルビーイング層）
> プラグイン活用: `product-management` `/write-spec` 相当の構成で作成

## 1. 問題定義

社内イベント告知・参加管理、および表彰（月間MVP等）の仕組みが存在しない。①コミュニケーションの「場」と「称賛の積み上げ先」が欠落しており、優先度1位の感謝・称賛機能とも連携させることで効果が最大化する。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 一般従業員 | 社内イベント（懇親会・研修・表彰式等）の告知を見て参加表明したい | 参加可否を簡単に伝えられる |
| テナント管理者 | イベントを作成し参加者を管理したい | 開催準備を一元管理できる |
| テナント管理者 | 月間/四半期の表彰（MVP・バリュー賞等）を登録・発表したい | 称賛文化を仕組み化できる |
| 一般従業員 | 過去の表彰受賞者一覧を見たい | 組織の称賛文化を実感できる |

## 3. 要求（優先度別）

**Must（MVP）**
1. イベント作成（タイトル、日時、場所/オンラインURL、説明）
2. イベント一覧・参加表明（出席/欠席/未回答）
3. 表彰登録（受賞者、表彰名、コメント、対象期間）
4. 表彰一覧（社内お知らせ連携で発表）

**Should**
5. 感謝・称賛機能の月間集計から表彰候補を自動提示 — ✅ 2026-06-30 完了（`/adm/events-awards` の MVP 候補パネル + ワンクリック表彰登録）
6. イベント参加率の組織分析への提供 — ⬜ v1 Won't（E-O2 設計判断。v2 で engagement/hr-kpi 連携を検討）

**Could**
7. イベントカレンダー表示（月表示） — ✅ 2026-06-30 完了（/events リスト/カレンダー切替）

**Won't**
- 座席表・会場予約管理等の詳細運営機能（スコープ外）
- ~~v1: 部署限定イベント~~ → **E-O1 v2 実装済み**（全社/部署限定 + 配下部署可視。複数部署は対象外）

## 4. データモデル（新規テーブル案・未作成）

```sql
CREATE TABLE public.internal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  audience_type TEXT NOT NULL DEFAULT 'tenant', -- tenant | division
  division_id UUID REFERENCES public.divisions(id),
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.internal_event_attendees (
  event_id UUID NOT NULL REFERENCES public.internal_events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  rsvp_status TEXT NOT NULL DEFAULT 'pending', -- pending/attending/declined
  PRIMARY KEY (event_id, employee_id)
);

CREATE TABLE public.awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  recipient_employee_id UUID NOT NULL REFERENCES public.employees(id),
  award_type TEXT NOT NULL, -- 例: 'monthly_mvp', 'value_award'
  period_label TEXT NOT NULL, -- 例: '2026-06'
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.internal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.internal_events
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid())
  );
-- awards / internal_event_attendees も同様のtenant_idベースポリシーを適用
```

## 5. 配置ルール

```
src/features/internal-events/
├── queries.ts        # getUpcomingEvents, getEventAttendees, getAwardHistory
├── actions.ts         # createEvent, updateRsvp, createAward
├── types.ts
└── components/
    ├── EventList.tsx
    ├── EventRsvpButton.tsx
    └── AwardBoard.tsx

src/app/(tenant)/(tenant-users)/events/page.tsx
src/app/(tenant)/(tenant-admin)/adm/(engagement)/events-awards/page.tsx
```

## 6. マスタ登録（メニュー表示）

「ウェルビーイング」カテゴリに `service` 追加。`route_path: /events`。表彰登録の管理画面は `app_role_service` で `hr_manager`/`tenant_admin` 系ロールのみ許可。

## 7. 成功指標

- イベント参加率（RSVP回答率・出席率）
- 表彰登録の継続率（毎月発表されているか）

## 8. オープンクエスチョン（2026-06-30 更新）

- ~~感謝・称賛連携~~ → E-S2 / K-C1 完了
- ~~イベントの対象範囲（全社/部署限定）~~ → **E-O1 v2 実装済み**（`audience_type` + `division_id`、RLS 配下部署対応。詳細: `implementation-plan-wellbeing-backlog.md` §9）
- ~~イベント参加率の組織分析~~ → **E-O2 決定: v1 Won't。v2 で engagement/hr-kpi 連携を検討**
