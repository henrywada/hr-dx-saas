# 感謝・称賛（Kudos）機能 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度1位（ウェルビーイング層）
> プラグイン活用: `product-management` `/write-spec` 相当の構成（問題定義・ユーザーストーリー・要求優先度・成功指標）で作成

## 1. 問題定義

従業員間の日常的な感謝・称賛を可視化する手段が現状ゼロ。サイドメニューには「感謝・称賛」が NEW として表示されているが実装が無く、プロダクトの2大ゴールのうち**①コミュニケーションを大切にするシステム**の中核機能が欠落している。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 一般従業員 | 同僚に短文の感謝・称賛メッセージを送りたい | 日々の貢献を気軽に可視化・共有できる |
| 一般従業員 | 自分宛・全社の称賛フィードを見たい | チームの活気や貢献を実感できる |
| テナント管理者 | 称賛の発生頻度・部署別傾向を見たい | 組織のコミュニケーション活性度を把握できる |
| テナント管理者 | 称賛にバリュー（行動指針）タグを付けたい | 称賛と企業バリューを結びつけて浸透させたい |

## 3. 要求（優先度別）

**Must（MVP）**
1. 称賛メッセージ投稿（宛先従業員1名以上、本文、任意でバリュータグ）
2. 全社フィード表示（新着順、自分が関係する投稿のハイライト）
3. リアクション（いいね相当の絵文字スタンプ、1種類で十分）
4. 通知（受信者への社内お知らせ連携 or 簡易通知）

**Should**
5. 部署別・個人別の称賛件数ランキング（組織分析への提供データ）
6. バリュータグのテナント管理者によるカスタマイズ

**Could（後続フェーズ）**
7. 月間MVP自動集計（社内イベント・表彰機能と連携）

**Won't（今回スコープ外）**
- 称賛のポイント化・金銭的インセンティブ連携（要件不明確、別途検討）

## 4. データモデル（新規テーブル案・未作成）

```sql
CREATE TABLE public.kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sender_employee_id UUID NOT NULL REFERENCES public.employees(id),
  message TEXT NOT NULL,
  value_tag TEXT, -- テナント管理者が定義するバリュー名（NULL可）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.kudos_recipients (
  kudos_id UUID NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  PRIMARY KEY (kudos_id, employee_id)
);

CREATE TABLE public.kudos_reactions (
  kudos_id UUID NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  PRIMARY KEY (kudos_id, employee_id)
);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.kudos
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid())
  );
-- kudos_recipients / kudos_reactions は kudos 経由の JOIN ポリシーで同様にテナント分離
```

## 5. 配置ルール

```
src/features/recognition/
├── queries.ts        # getKudosFeed, getKudosStatsByDivision
├── actions.ts         # createKudos, toggleReaction
├── types.ts
└── components/
    ├── KudosFeed.tsx
    ├── KudosComposer.tsx
    └── KudosReactionButton.tsx

src/app/(tenant)/(tenant-users)/kudos/page.tsx        # 一般従業員フィード
src/app/(tenant)/(tenant-admin)/adm/(engagement)/kudos-stats/page.tsx  # 管理者向け集計（既存engagementカテゴリに合流）
```

## 6. マスタ登録（メニュー表示）

`service_category`（既存「コミュニケーション」相当のカテゴリ、または新規）に `service` 行を追加し、`route_path` を `/kudos` に設定。`app_role_service` で全ロールに許可、`tenant_service` でプラン別ON/OFFを設定（CLAUDE.mdのメニュー制御フローに準拠）。`src/config/routes.ts` に `APP_ROUTES.TENANT.KUDOS` を追加。

## 7. 成功指標（組織分析への提供データ）

- 週次アクティブ称賛送信者数 / 全従業員数（コミュニケーション活性度の先行指標）
- 部署別称賛件数（既存 `adm-dashboard` の eNPS/離職リスク指標と相関分析する素材として `features/hr-kpi` に提供）

## 8. オープンクエスチョン

- バリュータグのマスタ管理場所（テナント設定 or グローバル既定値）は要決定。
- 通知は専用テーブルを持たず `dashboard` の `AnnouncementTable` に乗せるか、別途簡易通知センターを設けるかは要検討。
