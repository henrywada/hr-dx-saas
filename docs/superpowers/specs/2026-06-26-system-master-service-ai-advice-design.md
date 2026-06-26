# /saas_adm/system-master「サービス」タブ：タイトル・説明の自動作成 設計

**日付:** 2026-06-26
**対象画面:** `/saas_adm/system-master` の「サービス」タブ → 「詳細変更」モーダル

## 背景・目的

現在、「詳細変更」モーダルの「AIアドバイスで自動生成」ボタンはモック実装で、サービス名・カテゴリ名を埋め込んだ固定テンプレート文字列を返すだけ（実際のAI呼び出しなし）。

これを、`service.route_path` に対応するページコンポーネント（`page.tsx`）のソースコードを実際に解析し、その処理内容に適した以下を Gemini で生成する機能に置き換える。

- タイトル（最大25文字）
- description（最大100文字）

同時にボタン名称を「タイトル・説明の自動作成」に変更する。

## アーキテクチャ概要

```
ServiceTab.tsx (Client)
  └─ handleAiAdvice()
       └─ generateServiceAiAdvice(routePath, serviceName, categoryName)  [Server Action]
            ├─ resolvePageFilePath(routePath)   [src/lib/route-resolver.ts]
            ├─ fs.readFile(filePath)             — page.tsx のソースを読み込み
            └─ generateGeminiContent({ model: GEMINI_FLASH_MODEL, ... })
                 └─ src/lib/ai/gemini.ts（既存の単一ソース、変更なし）

queries.ts: getServices()
  └─ 各行に ai_advice_available: boolean を付与（resolvePageFilePath の結果で判定）
       └─ ServiceTab に initialServices として渡される（Server Component → props、既存方針）
```

## コンポーネント詳細

### 1. ルート解決ヘルパー（新規: `src/lib/route-resolver.ts`）

```ts
export function resolvePageFilePath(routePath: string): string | null
```

- `src/app` を再帰的に走査する（`node_modules`, `.next` は除外）
- ディレクトリ名が `(xxx)` 形式のルートグループは、実URLのセグメントとしては無視しつつ、配下も探索する（Next.js のルートグループの仕様に対応するため）
- `page.tsx` を発見した時点で、そこまでの非グループセグメントを `/` で連結して実効URLを計算し、`routePath` と一致するか比較する
- 一致したファイルの絶対パスを返す。見つからない場合は `null`
- `routePath` が空文字や `null` の場合は走査せず即座に `null` を返す

設計判断：サービス件数は数十〜100件程度の管理画面であり、呼び出し毎に `src/app` を都度走査する単純な実装で十分（事前のキャッシュやインデックス化は過剰設計と判断し見送る）。

呼び出し元：`src/features/system-master/queries.ts`（`getServices()`）と `src/features/system-master/actions.ts`（`generateServiceAiAdvice`）の2箇所。

### 2. `getServices()` の拡張（`src/features/system-master/queries.ts:42-66`）

既存のクエリ結果（`service.*`）の各行に対し、`resolvePageFilePath(row.route_path) !== null` の結果を `ai_advice_available: boolean` として追加する。サーバー側（Server Component から呼ばれるクエリ関数内）で計算するため、クライアントは追加のリクエストなしにこの情報を取得できる。

### 3. 生成 Server Action（`src/features/system-master/actions.ts`、既存 `generateAiAdvice`(262-284行)を置き換え）

```ts
export async function generateServiceAiAdvice(
  routePath: string,
  serviceName: string,
  categoryName: string
): Promise<
  | { success: true; data: { title: string; description: string } }
  | { success: false; error: string }
>
```

処理内容：

1. `resolvePageFilePath(routePath)` で再解決する（一覧取得時から状態が変わっている可能性に備えた防御的チェック）。`null` の場合は `{ success: false, error: 'ページコンポーネントが見つかりませんでした' }` を返す。
2. ファイルを `fs.readFile`（UTF-8）で読み込む。約8,000文字を超える場合は先頭8,000文字に切り詰める（トークンコスト対策。ページコンポーネントの大半は冒頭でその機能の目的が分かる構造になっている前提）。
3. `generateGeminiContent` を呼び出す（`src/lib/ai/gemini.ts` の既存ヘルパー、変更なし）：
   - `model: GEMINI_FLASH_MODEL`（コピー生成は高度な推論を要しないため、既存のコスト階層付けの方針に従い Flash を使用。`recruitment-ai/actions.ts` 等の Pro 使用ケースとは異なり、軽量タスク）
   - `system`: 「あなたは日本語のSaaSプロダクトのUXコピーライターです。渡されたNext.js/Reactコンポーネントのソースコードを解析し、エンドユーザーが実際に使う機能として何を行うものかを正確に読み取った上で、管理画面のサービス一覧に表示するための、タイトル（全角・半角問わず25文字以内）とdescription（100文字以内）を日本語で作成してください。誇大な煽り文句や事実と異なる効果（具体的な削減率など）は含めないでください。」
   - `prompt`: サービス名・カテゴリ名・ページソースコード（切り詰め後）を含む
   - `responseJsonSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } }, required: ['title', 'description'] }`
4. 応答（JSON文字列）を `JSON.parse`。`title.slice(0, 25)` / `description.slice(0, 100)` で防御的に切り詰めてから返す（LLMが文字数制約を超える可能性への保険）。
5. `GEMINI_API_KEY` 未設定時の例外、API呼び出し失敗、JSON解析失敗は try/catch で捕捉し、`{ success: false, error: <ユーザー向け日本語メッセージ> }` を返す（例外を投げない）。

### 4. UI変更（`src/features/system-master/components/ServiceTab.tsx`）

- ボタン文言（484行付近）：`AIアドバイスで自動生成` → `タイトル・説明の自動作成`
- `openModal(id)`（145行付近）：対象サービスの `ai_advice_available` を見て、モーダル用 state `aiAdviceAvailable` にセットする。
  - **`ai_advice_available === false` の場合：**
    - 自動作成ボタンを `disabled` にし、`title` 属性等で「対応するページが見つからないため自動生成できません」と表示する
    - `modalTitle` を `'開発中'`、`modalDescription` を `'開発中です。しばらくお待ちください。'` に**常に**セットする（DBに保存済みの値があっても上書きする。未実装ページであることをモーダル上で明示的に伝えるため）
  - **`ai_advice_available === true` の場合：** 既存の動作のまま（保存済みの `title`/`description` を表示、ボタン有効）
- `handleAiAdvice()`（118-143行）：呼び出し先を `generateServiceAiAdvice(svc.route_path, svc.name, cat?.name)` に変更
- 補足：上記の「開発中」表示はモーダルの表示用 state（`modalTitle`/`modalDescription`）に対する初期化処理であり、管理者が保存ボタンを押さない限り `service` テーブルの実データは変更されない。

## エラーハンドリング

| ケース | 挙動 |
|---|---|
| `route_path` が空 / 対応ファイルなし | ボタン disabled、モーダルに「開発中」プレースホルダー表示。生成処理は呼ばれない |
| `GEMINI_API_KEY` 未設定 | `generateServiceAiAdvice` が `{ success: false, error: ... }` を返却、クライアントは既存の `alert()` パターンでエラー表示 |
| Gemini API呼び出し失敗（ネットワーク等） | 同上 |
| 応答JSONの解析失敗 | 同上 |
| 生成された文字列が文字数上限を超える | サーバー側で `.slice()` して切り詰め、エラーにはしない |

## テスト方針

- **単体テスト（既存のテスト基盤に準拠）：**
  - `resolvePageFilePath`：ルートグループを含むパス、ネストしたグループ、存在しないパス、空文字に対する解決結果
  - `generateServiceAiAdvice`：ファイル未検出時に Gemini を呼ばないこと、生成結果の文字数切り詰め、Gemini呼び出し失敗時のエラーハンドリング（`generateGeminiContent` をモック）
- **手動確認：**
  - 実際に存在するサービス（例：`/adm/job-positions`）でボタンを押し、生成されたタイトル・説明がそのページの機能と整合するか確認
  - `route_path` が空のサービスでモーダルを開き、ボタンが disabled かつ「開発中」表示になることを確認
  - 生成後に保存ボタンで実際にDBへ反映されることを確認

## 本番環境（Vercel）でのファイル読み込みに関する注意

このプロジェクトは Vercel にデプロイされ、Server Action はビルド時のファイルトレーシング（`@vercel/nft`）により、実行時に必要なファイルのみがサーバーレス関数にバンドルされる。`src/app/**/page.tsx` は実行時に `fs.readFile` で動的に読むだけであり、コードから `import` されないため、デフォルトではこのトレーシング対象に含まれず、本番では `ENOENT` になる可能性が高い（ローカルの `npm run dev` では問題なく動作する）。

これを回避するため、`next.config.ts` の `experimental.outputFileTracingIncludes` に以下を追加する：

```ts
experimental: {
  // ...既存設定...
  outputFileTracingIncludes: {
    '/saas_adm/system-master/**': ['./src/app/**/page.tsx'],
  },
},
```

これにより、`/saas_adm/system-master` 配下のルートのサーバーレス関数バンドルに、`src/app` 配下の全 `page.tsx` が明示的に含まれる。コード量自体は小さいため、バンドルサイズへの影響は軽微と判断する。

## スコープ外（やらないこと）

- `page.tsx` が import する子コンポーネントの再帰的な読み込み（YAGNI。まずは page.tsx 単体で十分な精度が出るかを見る）
- ルートマップのキャッシュ・インデックス化（管理画面の呼び出し頻度では不要）
- 既存の `tenant_service` / `app_role_service` フィルタ条件のロジックへの変更（本機能とは無関係）
