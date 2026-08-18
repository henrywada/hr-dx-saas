# 調べる（税法・労務法・法令）

**ステータス:** 実装済み（2026-08-19）

**画面:** `/adm/research`（`(tenant-admin)/adm/(research)/research/`）

**位置づけ:** 人事担当者が、実務判断の根拠として法令・通達・裁決事例の**原文**を自分で引くための検索プラットフォーム。AI は取得した原文の要約補助にとどめ、回答の生成主体にはしない。

> 「検索」は手段であり、到達点は原文である。結果一覧ではなく、その先に表示される原文全文（＋出典 URL ＋取得日時）が本機能の成果物。
>
> 「専門情報」とは条文・通達・裁決事例そのもの（一次情報）を指し、専門家による解説記事ではない。解説記事しか読めないことが本機能が解こうとしている問題そのものである（1節参照）。

---

## 1. 問題定義

人事実務者は、日々の業務判断の途中で「根拠となる条文・通達」を確認する必要が繰り返し発生する。年末調整で扶養控除の要件を確かめる、36協定の上限規制の条文を引く、通勤手当の非課税限度額の根拠通達を探す、といった場面である。

現状これらは Google 検索 → 個人ブログや法律事務所の解説記事に着地しがちで、次の問題がある。

1. **二次情報しか読めない** — 解説記事は改正前の内容が残っていることが多く、条文そのものを確認できない
2. **通達に到達できない** — 厚労省法令等データベース・安全衛生情報センター（JAISH）・国税庁の通達は検索エンジンからは非常に引きにくい
3. **AI に聞くと条文番号を捏造する** — 汎用 LLM は存在しない条番号・通達番号を自信を持って出力する

既存の `/adm/hr-assistant` は「AI に相談する」体験であり、法令 RAG に取り込まれた範囲を要約して答える。本機能はこれと役割を分け、**「人事実務者が一次情報の原文を自分で引くためのツール」**として設計する。AI は取得済み原文の要約補助にとどめ、回答の生成主体にはしない。

税法モードも同じ位置づけである。人事実務者が給与・年末調整・退職金の処理中に参照する参考情報であり、税務申告業務を代替するものではない。

## 2. ユーザーストーリー

| #   | 役割       | ストーリー                                                                         |
| --- | ---------- | ---------------------------------------------------------------------------------- |
| 1   | 人事担当   | 36協定の上限規制について、労働基準法の条文そのものを画面上で確認したい             |
| 2   | 人事担当   | ストレスチェックの実施義務の根拠を、安衛法の条文と厚労省通達の両方で押さえたい     |
| 3   | 人事担当   | 年末調整の処理中に、扶養控除・配偶者控除の要件を所得税法の条文で確認したい         |
| 4   | 人事担当   | 通勤手当・社宅・出張手当の非課税限度額の根拠を通達で確認したい                     |
| 5   | 人事担当   | 退職金の課税計算（勤続年数と控除額）の根拠条文を確認したい                         |
| 6   | 人事担当   | 「この手当は課税か非課税か」を税理士に問い合わせる前に、自分で一次情報を当たりたい |
| 7   | 人事責任者 | 長い条文・通達の要点を先に掴んでから、原文を精読したい                             |
| 8   | 人事責任者 | 参照している法令が最新か（直近の改正はいつか）を確認したい                         |
| 9   | 人事担当   | 先週調べた内容をもう一度引き直したい（検索履歴から再実行）                         |

## 3. 要求と優先度

| 優先度 | 要求                                                                                     |
| ------ | ---------------------------------------------------------------------------------------- |
| Must   | ラジオボタンで「税法 / 労務法 / 法令」の3モードを切り替える                              |
| Must   | モードは URL クエリ `?mode=tax\|labor\|law` に反映し、共有・ブックマーク可能とする       |
| Must   | 検索結果から原文全文を表示し、**出典 URL と取得日時を必ず併記**する                      |
| Must   | AI 要約は「その画面で取得済みの原文テキスト」のみを入力とする（検索させない）            |
| Must   | AI 要約はユーザーが明示的にボタンを押したときだけ実行する（自動実行しない）              |
| Must   | 外部 API 呼び出しはすべて Server Actions 内で行う                                        |
| Must   | 全モード共通で「参考情報であり、最終判断は社労士・税理士へ」を恒久表示する               |
| Must   | 取得失敗時は「取得できませんでした」＋出典サイトへの直リンクを表示（無言で握り潰さない） |
| Should | 検索履歴を保存し、履歴から再実行できる                                                   |
| Should | 法令の改正履歴（直近改正日・改正法令番号）を表示する                                     |
| Should | 略称（労基法・安衛法・法基通 等）での検索に対応する                                      |
| Won't  | ブックマーク／お気に入り機能（v2 以降）                                                  |
| Won't  | 取得した原文の DB キャッシュ・RAG 化（既存 `hr_law_chunks` と役割が重複するため）        |
| Won't  | 自然文の質問に AI が回答する Q&A（`/adm/hr-assistant` の担当領域）                       |
| Won't  | 判例・裁判例の検索（本機能のデータソースが対応しない）                                   |
| Won't  | 従業員（`app_role = 'employee'`）への開放                                                |

## 4. データモデル

新規テーブルは `tenant_research_queries` の1本のみ。取得した法令・通達の本文は**保存しない**（常に一次情報を取りに行き、古いキャッシュを見せない）。

```sql
CREATE TABLE IF NOT EXISTS public.tenant_research_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('tax', 'labor', 'law')),
  sub_tab TEXT NOT NULL,
  keyword TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_research_queries_tenant_created
  ON public.tenant_research_queries (tenant_id, created_at DESC);

ALTER TABLE public.tenant_research_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.tenant_research_queries
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );
```

`tenant_id` の `ON DELETE CASCADE` は、テナント削除時に取り残しが出ないようにするため必須（2026-08-18 の CASCADE 化対応と整合させる）。

## 5. 配置ルール

```
src/app/(tenant)/(tenant-admin)/adm/(research)/research/
  page.tsx        Server Component。履歴のみ取得して Client へ渡す
  loading.tsx
  error.tsx

src/features/law-research/
  lib/
    tax-law-client.ts      tax-law-mcp サービス層のラッパ（タイムアウト・エラー変換・正規化）
    labor-law-client.ts    labor-law-mcp サービス層のラッパ
    egov-revision.ts       自前実装: e-Gov 法令API v2 law_revisions
    normalize.ts           3モードの戻り値を共通型へ写像（純粋関数）
    summarize-prompt.ts    AI要約プロンプト生成（純粋関数）
  queries.ts               履歴の SELECT のみ
  actions.ts               検索・原文取得・AI要約・履歴記録の Server Actions
  types.ts
  components/
    ResearchClient.tsx         モード状態と検索状態を保持する親
    ModeRadioGroup.tsx         3モードのラジオボタン
    SearchForm.tsx             モード別の入力フィールド
    ResultList.tsx             DataTable による結果一覧
    SourceDetailPanel.tsx      原文全文・出典URL・取得日時
    AiSummaryCard.tsx          AI要約（明示ボタンで実行）
    HistoryPanel.tsx           検索履歴
    ResearchHelpModalTrigger.tsx
```

### データフロー

```
page.tsx → queries.ts（履歴 SELECT）→ props → ResearchClient
ResearchClient → actions.ts → lib/*-client.ts → 外部API
                            → openRouterChat()（取得済み原文のみ入力）
                            → tenant_research_queries（履歴 INSERT）
```

`createAdminClient()` は使わない（`createClient()` のみ）。`useEffect` + `fetch` によるクライアント側データ取得は行わない。

### 3モードの機能マトリクス

| モード           | サブタブ   | 呼び出す関数                                                                                |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------- |
| 税法 (`tax`)     | 条文       | `tax-law-mcp` `law-service`: `getLawArticle` / `getLawToc` / `searchLaw`                    |
|                  | 通達       | `tax-law-mcp` `tsutatsu-service`: `getTsutatsu` / `listTsutatsuToc`                         |
|                  | 裁決事例   | `tax-law-mcp` `saiketsu-service`: `searchSaiketsu` / `getSaiketsu` / `listSaiketsuTaxTypes` |
| 労務法 (`labor`) | 条文       | `labor-law-mcp` `law-service`: `getLawArticle` / `getLawToc` / `searchLaw`                  |
|                  | 厚労省通達 | `labor-law-mcp` `mhlw-tsutatsu-service`: `searchMhlwTsutatsu` / `getMhlwTsutatsu`           |
|                  | 安衛通達   | `labor-law-mcp` `jaish-tsutatsu-service`: `searchJaishTsutatsu` / `getJaishTsutatsu`        |
| 法令 (`law`)     | 法令検索   | `labor-law-mcp` `law-service`: `searchLaw`                                                  |
|                  | 条文       | `labor-law-mcp` `law-service`: `getLawArticle` / `getLawToc`                                |
|                  | 改正履歴   | 自前 `egov-revision.ts`（e-Gov v2 `law_revisions`）                                         |

### 外部パッケージの利用方法（重要）

`npx -y tax-law-mcp` 等の **stdio MCP サーバーとしての起動は採用しない**。Vercel のサーバーレス関数はコールドスタートごとに npm ダウンロードとプロセス spawn が発生し、プロセスを常駐できないため成立しない。

両パッケージは `package.json` に `exports` マップを持たず `files: ["dist/**/*"]` で全ファイルを同梱しているため、サービス層を直接 import する。MCP プロトコルも子プロセスも介さない。

```ts
import { getLawArticle } from 'labor-law-mcp/dist/lib/services/law-service.js'
import { searchSaiketsu } from 'tax-law-mcp/dist/lib/services/saiketsu-service.js'
```

内部パスへの依存になるため、`package.json` でバージョンを**完全固定**する（`tax-law-mcp: 0.5.4` / `labor-law-mcp: 0.2.1`）。破壊的変更の影響は `lib/*-client.ts` に閉じ込め、UI 層へ波及させない。

### `hourei-mcp-server` を採用しない理由

「法令を調べる」モードの実装候補だったが、以下の理由で不採用とし、`labor-law-mcp` の `law-service` ＋ 自前の改正履歴クライアントで代替する。

1. 接続先が e-Gov 法令API **v1**（旧版）。`tax-law-mcp` / `labor-law-mcp` は v2 を使用しており、API 世代が混在する
2. 依存が `@modelcontextprotocol/sdk ^0.5.0`（現行 1.26 系に対して極端に古い）
3. 最終更新 2025-10-28 で以後停止
4. `index.js` 6KB の単一ファイルで、処理が MCP リクエストハンドラに直書きされている。**サービス層が無く import できない**
5. 提供3ツールのうち「法令名検索」「条文取得」は `labor-law-mcp` で完全に代替でき、固有の価値は「改正履歴」のみ。改正履歴は e-Gov v2 の `law_revisions` エンドポイントで取得できることを検証済み（下記 8. 参照）

## 6. マスタ登録

`services` に1件だけ登録する（モードは画面内のラジオボタンなので、サービスは分割しない）。

| 項目              | 値                                                                         |
| ----------------- | -------------------------------------------------------------------------- |
| `route_path`      | `/adm/research`                                                            |
| `name`            | 調べる                                                                     |
| `title`           | 税法・労務法・法令の条文と通達を原文で確認する                             |
| `target_audience` | `adm`（テナント管理者向けサービスの実値。`saas_adm` / `all_users` と区別） |
| `release_status`  | 公開                                                                       |

`service_category_id` は **`/adm/hr-assistant` の `service_category_id` から `route_path` 経由で解決する**。`service` / `service_category` は環境間で UUID がドリフトするマスタのため、UUID を直書きすると本番適用時に FK 違反を起こす。解決できなかった場合は `RAISE WARNING` でスキップし、マイグレーション自体は失敗させない（既存の `20260814140000_data_migration_service_menu.sql` と同じ書き方に揃える）。

`tenant_service` / `app_role_service` で契約テナント・役割別に表示制御する。`app_role = 'employee'` には割り当てない。

## 7. 成功指標

| 指標                              | 目標                                                      |
| --------------------------------- | --------------------------------------------------------- |
| 検索から原文表示までの体感時間    | 95 パーセンタイルで 3 秒以内                              |
| 原文取得の成功率                  | 95% 以上（外部サイト起因の失敗を除く）                    |
| AI 要約の条文番号・通達番号の誤り | 0 件（原文からの転記のみのため構造的に発生しない設計）    |
| 月間利用テナント率                | 契約テナントの 30% 以上が月1回以上利用                    |
| 検索履歴からの再実行率            | 全検索の 10% 以上（繰り返し参照される実務ニーズの裏付け） |

## 8. 技術検証記録（2026-08-18 実施）

設計判断の根拠として、実際にパッケージを取得し実データで検証した結果を記録する。

### パッケージの実在確認

| パッケージ          | 版    | ライセンス | 公開 / 最終更新         | 判定   |
| ------------------- | ----- | ---------- | ----------------------- | ------ |
| `tax-law-mcp`       | 0.5.4 | MIT        | 2026-03-01 / 2026-03-08 | 採用   |
| `labor-law-mcp`     | 0.2.1 | MIT        | 2026-03-03 / 2026-03-08 | 採用   |
| `hourei-mcp-server` | 1.0.6 | MIT        | 2025-10-27 / 2025-10-28 | 不採用 |

`tax-law-mcp` と `labor-law-mcp` は同一作者（kentaroajisaka）・同一設計で、`dist/lib/services/` に純粋関数のサービス層を持つ。

### レイテンシ実測（deep import 経由・実データ取得）

| 呼び出し                                  | 実測    |
| ----------------------------------------- | ------- |
| `getLawArticle`（労基法36条）             | 169ms   |
| `getLawArticle`（法人税法22条）           | 605ms   |
| `getMhlwTsutatsu`（厚労省通達本文）       | 172ms   |
| `listTsutatsuToc`（法人税基本通達）       | 146ms   |
| `listSaiketsuTaxTypes`                    | 145ms   |
| `searchMhlwTsutatsu`（36協定）            | 292ms   |
| `searchLaw`（育児）                       | 927ms   |
| `searchJaishTsutatsu`（ストレスチェック） | 1,352ms |
| `searchSaiketsu`（交際費）                | 1,367ms |

最重量でも約 1.4 秒であり、同期 Server Actions で成立する。全画面ローディングではなくパネル単位のスケルトンで足りる。

### プリセット外法令のフォールバック確認

`labor-law-mcp` の `LAW_ID_MAP` は労働・社会保険系45法令のプリセットだが、プリセット外でも e-Gov 検索フォールバックで取得できることを確認した。

- `getLawArticle({ lawName: '民法', article: '709' })` → 1,172ms で取得成功
- `getLawToc({ lawName: '個人情報の保護に関する法律' })` → 895ms で取得成功
- 略称 `{ lawName: '労基法', article: '32' }` → 209ms で「労働基準法」に解決

したがって「法令を調べる」モードは全法令を対象にできる。

### e-Gov 法令API v2 の改正履歴エンドポイント確認

```
GET https://laws.e-gov.go.jp/api/2/law_revisions/322AC0000000049  → HTTP 200 (12,299 bytes)
{"law_info":{"law_id":"322AC0000000049","law_num":"昭和二十二年法律第四十九号",
              "promulgation_date":"1947-04-07"},
 "revisions":[{"law_revision_id":"322AC0000000049_20281223_508AC0000000046",
               "law_title":"労働基準法","abbrev":"労基法","category":"労働",
               "updated":"2026-07-23T15:54:56+09:00", ...}, ...]}
```

将来施行分を含む改正履歴が取得できる。`egov-revision.ts` は約40行の薄いクライアントで足りる。

## 9. AI 要約レイヤの設計

ハルシネーションを構造的に発生させないため、以下を設計制約とする。

1. **入力は取得済み原文テキストのみ。** モデルに検索させない、Web 検索ツールを与えない、RAG も引かない
2. ユーザーが明示的に「要約する」ボタンを押したときのみ実行（自動実行しない＝コスト制御）
3. プロンプト制約：
   - 与えられた原文のみを根拠に要約する
   - 原文に無いことは書かない
   - 判断できない場合は「原文からは判断できません」と返す
   - 条番号・通達番号は原文の表記をそのまま転記する
4. 要約の下に**必ず出典 URL・取得日時・原文全文へのリンク**を併記する。要約は補助であり、正本は原文
5. `openRouterChat` に `maxTokens: 4000` を明示指定する

### 既存 `openRouterChat` への追加変更

`src/lib/ai/openrouter.ts` の `openRouterChat` は `max_tokens: 2000` 固定で、thinking の無効化を行っていない。既定モデル `google/gemini-2.5-flash` は Gemini 2.5 系のため thinking が既定で有効であり、thinking トークンが出力予算を食い潰して要約が途中終了するリスクがある。

`OpenRouterChatOptions` に `reasoning?: { exclude?: boolean }` を1フィールド追加し、本機能からは thinking を無効化して呼び出す。既存呼び出し側の挙動は変えない（未指定時は現状維持）。

## 10. UI 方針

HR-DX Design System に準拠する。

- レイアウトは**パターンB（フル幅型）**：`px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full max-w-[1920px]`。検索結果テーブルが主体のため。`w-full` を `max-w-*` `mx-auto` より先に必ず付ける
- 画面上部から：モードラジオ（3択） → サブタブ → 検索フォーム
- モードラジオの選択状態はブランドカラー `#FD7601` をアクセントに使う。3モードは対等に並べる（税法だけ扱いを変えない）
- 検索フォームは AWS 風シャープ設計：`gap-3` / 入力 `px-2.5 py-1.5 text-xs` / ボタン `px-3 py-1.5 text-xs` / `rounded-lg`
- 結果一覧は共通 `DataTable`（`py-1` コンパクト密度）。行クリックで右側 `SourceDetailPanel` に原文全文を表示
- 検索中はパネル単位のスケルトン（最遅 1.4 秒のため全画面ローディングにしない）
- フッターに全モード共通の恒久注記：「本機能は参考情報です。最終的な判断は社会保険労務士・税理士等の専門家にご確認ください。」

## 11. テスト方針

| 種別     | 対象                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| ユニット | `normalize.ts`（3モードの戻り値写像）、`summarize-prompt.ts`、`egov-revision.ts` のレスポンスパース（fetch はモック） |
| 統合     | Server Actions のエラー系（外部 API 5xx / タイムアウト / 該当なし / 不正なモード値）、履歴 INSERT のテナント分離      |
| E2E      | 3モードの切替 → 検索 → 原文表示 → AI要約 の主要導線                                                                   |

国税庁・厚労省・JAISH はスクレイピング依存で不安定なため、**外部サイトへの実通信テストは CI に含めない**。

## 12. リスクと対応

| リスク                                                                                      | 対応                                                                                                             |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tax-law-mcp` / `labor-law-mcp` は公開間もなくメンテナ1名。deep import が内部パスに依存する | バージョン完全固定。ラッパ層 `lib/*-client.ts` で影響を隔離。アップデートは手動検証を挟む                        |
| 国税庁・厚労省・JAISH はスクレイピング。HTML 構造変更で壊れる                               | 失敗時は「取得できませんでした」＋出典サイトへの直リンクを表示。無言で握り潰さない。エラーはサーバー側にログ出力 |
| 外部サイト側の負荷・レート制限                                                              | 検索は明示操作時のみ実行（インクリメンタルサーチにしない）                                                       |
| 法的助言と誤認される                                                                        | 全モード共通の恒久注記を表示。AI 要約にも同じ注記を併記                                                          |
| `/adm/hr-assistant` との役割が混同される                                                    | 本機能＝原文を自分で引く、hr-assistant＝AI に相談する、と説明文で明示。相互に導線を張る                          |

## 13. オープンクエスチョン（v1 の決定）

| 論点                       | v1 の決定                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| 回答形態                   | ハイブリッド（原文検索が主・AI要約は補助）。自然文 Q&A は `/adm/hr-assistant` の担当     |
| `hourei-mcp-server` の採用 | 不採用。`labor-law-mcp` ＋ 自前 `law_revisions` で代替                                   |
| 履歴の保存範囲             | 検索履歴のみ（キーワード・モード・件数）。ブックマークは v2 以降                         |
| 原文の DB キャッシュ       | しない。常に一次情報を取得し、古い内容を見せない                                         |
| 開放範囲                   | テナント管理者のみ（`app_role <> 'employee'`）。`app_role_service` で役割別に制御        |
| 税法モードの位置づけ       | 人事実務者が給与・年末調整・退職金処理の際に参照する参考情報。税務申告業務の代替ではない |
