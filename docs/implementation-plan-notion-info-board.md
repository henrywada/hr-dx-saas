# 情報掲示板（Notion Info Board）

**ステータス:** 設計完了（実装未着手） / **作成日:** 2026-09-13

**画面 URL:** `/adm/notion_info`

**実装計画（タスク分解）:** `docs/superpowers/plans/2026-09-13-notion-info-board.md`

---

## 0. 依頼パスと実際の配置

依頼は `src/app/adm/(admin)/notion_info` だった。本リポジトリの App Router ではこのパスは存在しない。

| 解釈                | パス                                                                                              | 採用     |
| ------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| テナント管理者画面  | `src/app/(tenant)/(tenant-admin)/adm/(notion_info)/notion_info/page.tsx` → URL `/adm/notion_info` | **採用** |
| 内部管理 `(admin)/` | `src/app/(admin)/`（`/menus` 等。テナント `/adm` ではない）                                       | 不採用   |

理由: ペルソナは中小企業の経営者・人事責任者。`app_role <> 'employee'` のテナント管理者向け機能であり、既存の助成金配信・調べると同じ `/adm` 配下に置く。

---

## 1. 問題定義

人事責任者は、法令改正・助成金・生成 AI の動向を追う必要があるが、情報源が分散している。SaaS 運営側では Notion ワークスペース「SaaS開発」上で Grok Automations が次の 3 DB を自動収集している。

| 画面上のラジオ   | Notion データベース | Data source ID                                      | Database / ページ ID                   |
| ---------------- | ------------------- | --------------------------------------------------- | -------------------------------------- |
| 最新人事トレンド | 人事トレンド        | `collection://3da121bf-139a-8023-829d-000b6e5d44f2` | `3da121bf-139a-80dd-8e33-cecfe7cce9a3` |
| 助成金情報       | Grok助成金          | `collection://3da121bf-139a-8080-a802-000b1f199f7c` | `3da121bf-139a-80a4-bd40-e1569a8433e3` |
| AI最新情報       | AI最新情報          | `collection://3da121bf-139a-805d-a5c1-000be271ce59` | `3da121bf-139a-80ee-92ce-d5e9a8e9fb16` |

現状このデータは Notion 上にしかなく、テナント管理者が HR-DX 画面から参照できない。情報掲示板は **収集済みの外部情報を人事責任者が同じ画面で切り替えて読む** ための閲覧専用ボードである。

2大ゴールとの関係: 組織健康度の可視化（人事トレンド・助成金）と、人事 DX 判断材料（AI 最新情報）を、IT 部門なしで届ける。

既存の `/adm/grant-notifier`（J-グランツ収集 → 自社条件マッチ → メール配信）とは **別物**。本画面は Grok が Notion に貯めた記事・補助金の一覧閲覧であり、テナント条件マッチやメール配信はしない。

---

## 2. ユーザーストーリー

| #   | 役割       | ストーリー                                                                                   |
| --- | ---------- | -------------------------------------------------------------------------------------------- |
| 1   | 人事責任者 | ラジオで「最新人事トレンド / 助成金情報 / AI最新情報」を切り替え、収集済み記事の一覧を見たい |
| 2   | 人事責任者 | 各行で日付・タイトル・要約・出典 URL を一目で把握したい                                      |
| 3   | 人事責任者 | 「要約」ボタンで本文（ページの本文（詳細））をモーダルで読みたい                             |
| 4   | 人事責任者 | 助成金は募集期限が過ぎた行を見たくない。金額・募集開始日・募集期限・区分も見たい             |
| 5   | 人事責任者 | 出典 URL をクリックして元記事を別タブで開きたい                                              |
| 6   | SaaS運営者 | 収集ロジックは既存の Grok Automations のまま、HR-DX は読むだけにしたい                       |

---

## 3. 要求と優先度

| 優先度 | 要求                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Must   | ラジオ 3 種。初期値は「最新人事トレンド」。選択で対応リストを表示                                                            |
| Must   | ラジオは URL クエリ `?tab=hr_trend\|grant\|ai` に反映し、ブックマーク可能                                                    |
| Must   | 各リストは **収集日時の降順（新しい順）**。2026-09-13 に依頼者が確定                                                         |
| Must   | 人事トレンド: 日付=収集日時、タイトル、要約、URL、「要約」ボタン                                                             |
| Must   | 助成金: 上記 + 助成金額・募集開始日・募集期限・区分。募集期限が JST 当日より前の行は出さない。期限なしは出す。期限当日は出す |
| Must   | AI最新情報: 人事トレンドと同じ列構成                                                                                         |
| Must   | 「要約」ボタン → 青ヘッダーの長文モーダルで「ページの本文（詳細）」を表示                                                    |
| Must   | Notion 呼び出しはサーバー専用。トークンを `NEXT_PUBLIC_` にしない                                                            |
| Must   | テナント管理者のみ（`(tenant-admin)` レイアウト）。従業員は入れない                                                          |
| Must   | メニューは `service` + `tenant_service`。カテゴリ UUID はハードコードせず既存 `route_path` で解決                            |
| Must   | `loading.tsx` / `error.tsx`。取得失敗は握り潰さずメッセージ表示                                                              |
| Should | Notion 応答を 5 分キャッシュ（`unstable_cache` または `fetch` の `revalidate`）                                              |
| Should | DataTable のタイトル検索                                                                                                     |
| Could  | 取得失敗時に「Notion を開け」リンクを出す                                                                                    |
| Won't  | Notion → Supabase 同期テーブル（v1。正本は Notion）                                                                          |
| Won't  | 従業員ポータル公開                                                                                                           |
| Won't  | 記事の投稿・編集・削除（HR-DX 側）                                                                                           |
| Won't  | Cursor / Claude の Notion MCP をランタイムに使う                                                                             |
| Won't  | grant-notifier との自動突合                                                                                                  |

---

## 4. データモデル

**v1 で新規業務テーブルは作らない。** 正本は Notion。HR-DX は読み取りプロキシ。

メニュー登録のみマイグレーションする（`service` / `tenant_service`）。`DROP` / `TRUNCATE` / `db reset` はしない。

### 4.1 Notion プロパティ対応（2026-09-13 実スキーマ）

画面列名は **タイトル**（「テーマ」ではない）。値は次の優先順で解決する。

1. プロパティ `タイトル`（text）
2. その DB の title プロパティ（人事トレンド・AI最新情報は `名前`、Grok助成金は `Status`）。人事トレンドには `タイトル` 列が無いためここへ落ちる。

| 画面列           | 人事トレンド                       | Grok助成金                            | AI最新情報                          |
| ---------------- | ---------------------------------- | ------------------------------------- | ----------------------------------- |
| 日付             | `収集日時` (date)                  | 同左                                  | 同左                                |
| タイトル         | `名前`（title。`タイトル` 列なし） | `タイトル`（text。title は `Status`） | `タイトル`（text。title は `名前`） |
| 要約             | `要約`                             | `要約`                                | `要約`                              |
| URL              | `URL`                              | `URL`                                 | `URL`                               |
| 本文（モーダル） | `ページの本文（詳細）`             | 同左                                  | 同左                                |
| 助成金額         | —                                  | `助成金額`                            | —                                   |
| 募集開始日       | —                                  | `募集開始日`                          | —                                   |
| 募集期限         | —                                  | `募集期限`                            | —                                   |
| 区分             | —                                  | `区分`                                | —                                   |

表示しないが存在する列: `External ID`、`テキスト`（人事トレンド）、`国名`（AI）、`ステータス`（助成金）。v1 では出さない。

### 4.2 アプリ側の型（イメージ）

```typescript
type NotionInfoTab = 'hr_trend' | 'grant' | 'ai'

type NotionInfoItem = {
  id: string
  collectedAt: string | null // ISO
  title: string
  summary: string
  url: string | null
  body: string // ページの本文（詳細）。<br> は改行に正規化
  amount: string | null
  openDate: string | null // YYYY-MM-DD
  deadline: string | null // YYYY-MM-DD
  category: string | null
}
```

---

## 5. アーキテクチャ

```
page.tsx（Server Component）
  → getServerUser()  ※レイアウト側で employee は既に弾く
  → src/features/notion-info/queries.ts
       → notion-client.ts（Bearer NOTION_API_KEY、Notion-Version: 2022-06-28）
       → databases.query × 3（Promise.all）
       → map-page.ts で Notion プロパティを NotionInfoItem へ
       → filterExpiredGrants()（助成金のみ、JST 暦日）
       → sortByCollectedAtDesc()
  → NotionInfoBoardClient（ラジオ + DataTable + 本文モーダル）
```

- `page.tsx` に `supabase.from` も Notion fetch も書かない。
- `createAdminClient()` は使わない（本機能は Supabase 業務データを読まない）。
- Cursor の Notion MCP（`user-notion`）は開発時のスキーマ確認専用。本番ランタイムには出さない。
- `@notionhq/client` は v1 では入れない。`databases.query` だけなので `fetch` で足りる。

### 5.1 採用した方針と却下した案

| 案                                      | 内容                                                  | 判断     |
| --------------------------------------- | ----------------------------------------------------- | -------- |
| A. ライブ Notion API + 短時間キャッシュ | 常に Grok 投入と一致。テーブル不要                    | **採用** |
| B. Notion → Supabase 同期               | SQL で期限切れを切れるが、ジョブ・RLS・二重管理が必要 | v1 却下  |
| C. ハイブリッド                         | 過剰                                                  | v1 却下  |

コンテンツは全テナント共通の運営掲示。テナント行隔離の対象データではない。画面アクセス制御はテナント管理者ロールと `tenant_service` で行う。

### 5.2 配置ルール

| 種別            | パス                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| ページ          | `src/app/(tenant)/(tenant-admin)/adm/(notion_info)/notion_info/page.tsx` |
| loading / error | 同ディレクトリ                                                           |
| ドメイン        | `src/features/notion-info/`                                              |
| ルート定数      | `APP_ROUTES.TENANT.ADMIN_NOTION_INFO` = `'/adm/notion_info'`             |
| メニュー SQL    | `supabase/migrations/<timestamp>_notion_info_board_menu.sql`             |

`actions.ts` は v1 不要（書き込みなし。モーダル本文は一覧取得時に載せる。3 DB とも数十件規模）。

### 5.3 画面仕様

レイアウトは管理者向けパターン B（フル幅、`w-full` を `max-w-[1920px]` より先）。準拠: `docs/ui/admin-card-and-table.md` / `.cursor/rules/admin-card-table-style.mdc`。

1. タイトル行: 左「情報掲示板」、右 `TenantBackLink`
2. 説明 1 行: Notion に収集した人事トレンド・助成金・AI 情報を閲覧する、と明記
3. ラジオ（`ModeRadioGroup` と同系統。ブランド `#FD7601`）
   - 最新人事トレンド / 助成金情報 / AI最新情報
4. 選択タブの `DataTable`
   - `searchable`、`searchKey="title"`
   - URL は外部リンク（`target="_blank"` `rel="noopener noreferrer"`）
   - 「要約」は行の `body` をモーダルに渡す。空ならボタン disable + ツールチップ相当の文言
5. モーダル: `HelpMarkdownModal` と同じシェル（`bg-sky-600`、`max-h-[80vh]`、`max-w-[800px]`）。本文は外部 HTML を生描画しない。`<br>` を改行にし、残りタグは除去して `whitespace-pre-wrap`（または安全な Markdown）

空一覧: 「この分類の情報はまだありません」（助成金で期限切れ除外後ゼロのときも同様）。

### 5.4 募集期限フィルタ

基準日は `toJSTDateString(new Date())`（`src/lib/datetime.ts`）。

- `deadline` が null / 空 → 表示
- `deadline`（`YYYY-MM-DD`）>= 今日（JST）→ 表示
- `deadline` < 今日 → 非表示

Notion の date timezone に依存せず、プロパティの `date.start` の日付部分だけを使う。

### 5.5 認証・秘密情報

| 変数                    | 用途                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `NOTION_API_KEY`        | Internal Integration のシークレット。サーバーのみ              |
| `NOTION_DB_HR_TREND_ID` | 人事トレンド DB ID（ハイフン有無どちらでも可、正規化して使う） |
| `NOTION_DB_GRANT_ID`    | Grok助成金 DB ID                                               |
| `NOTION_DB_AI_ID`       | AI最新情報 DB ID                                               |

未設定時はページを 500 にせず、カード内に「情報掲示板の接続設定がありません。運営者に連絡してください。」を出す。

**運用前提:** Notion 側で Integration を作成し、3 DB をその Integration に Share する。Share 漏れは API が `object_not_found` を返す。

---

## 6. マスタ登録

- 新カテゴリは作らない。`/adm/auto-distribution` の `service_category_id` を解決し、同じ「ツールボックス」に並べる（grant-notifier と同じ）。解決失敗時はカテゴリ名 `ツールボックス` にフォールバック。それでも駄目なら WARNING してメニューだけスキップ。
- `service.id`（環境間固定）: `f30f07bd-ed29-4ca3-ab52-9abc83c70c7b`
- `name` / `title`: 情報掲示板
- `route_path`: `/adm/notion_info`
- `target_audience`: `adm`、`release_status`: `公開`
- `app_role_service` には入れない（テナント管理者の全役割で表示）
- `tenant_service`: 兄弟サービス `/adm/auto-distribution` と同じテナントへ INSERT。兄弟が無い場合は全テナントへ割当（task-health 方式）せず WARNING（grant-notifier に合わせ、意図しない全社開放を避ける）

`migration up` のみ。`supabase db reset` は禁止。

---

## 7. 成功指標

| 指標           | 合格条件                                                                |
| -------------- | ----------------------------------------------------------------------- |
| 切替           | ラジオ 3 種で列構成が仕様どおり切り替わる                               |
| ソート         | 収集日時が新しい順                                                      |
| 助成金フィルタ | 募集期限 < 今日（JST）の行が無い。当日・未来・期限なしは残る            |
| モーダル       | 「要約」で本文が表示され、閉じられる。HTML は実行されない               |
| 権限           | 従業員で `/adm/notion_info` はポータルへリダイレクト                    |
| 秘密           | ブラウザ JS / Network に Notion トークンが現れない                      |
| メニュー       | ツールボックスに「情報掲示板」が出る（tenant_service 割当済みテナント） |

---

## 8. 確定した判断（2026-09-13）

1. 並びは収集日時の **新しい順（降順）**。
2. 画面列は **タイトル**。値は Notion の `タイトル` を優先し、無い DB（人事トレンド）は title プロパティ `名前`。
3. Notion Internal Integration トークンは運営側で `.env` / Vercel に置く。
4. 助成金額・区分は Notion の値をそのまま表示する。
