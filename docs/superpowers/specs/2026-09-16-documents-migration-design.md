# 文書ホルダー（documents）機能移植 設計書

**作成日**: 2026-09-16  
**ステータス**: 設計確定・実装計画待ち  
**移植元**: `/home/hr-dx/ai-projects/dx-sensor`（`/documents`, `/documents/new`）  
**移植先**: `hr-dx-saas` `src/app/(tenant)/(tenant-users)/tool/documents/`  
**参考**: `docs/superpowers/specs/2026-09-15-picture-report-migration-design.md`

---

## 1. 背景・目的

dx-sensor で先行実装済みの「文書ホルダー」機能（名刺・請求書・発注書・領収書の撮影・AI読み取り・一覧・CSVエクスポート）を、マルチテナント SaaS である hr-dx-saas へ移植する。

プロダクトの2大ゴールとの関係：

- **コミュニケーションを大切にするシステム**：現場から証憑・名刺情報を共有し、上長が状況を把握できる
- **組織健康度の可視化**：経理・購買・経費の証憑をデジタル化し、部門マネージャーが把握できる

移植元はテナント付きだが、権限モデル（`company_visible` + tenant admin 編集）と API Route 中心のデータアクセスが hr-dx-saas 規約と異なるため、以下を作り直す。

1. タイプ別のハイブリッド可視範囲（下記）
2. 編集・削除は本人のみ
3. `app/api/` を使わず Server Actions に集約
4. サービスマスタ登録（8エントリ）
5. OCR は Gemini を維持（日本語精度優先）

---

## 2. 要件確定事項（壁打ちの結論）

| 項目               | 決定内容                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| 移植範囲（第1波）  | 4種類すべて（`business_card` / `invoice` / `purchase_order` / `receipt`）                               |
| 名刺の閲覧         | 本人 ＋ `company_visible=true` ならテナント全員。非公開名刺は本人 ＋ 同一 `division_id` の `is_manager` |
| その他タイプの閲覧 | 本人 ＋ 同一 `division_id` の `is_manager`（部門階層は辿らない）                                        |
| 公開フラグ         | `company_visible` を踏襲。UIトグルは名刺のみ。他タイプは常に `false`                                    |
| 編集・削除         | 全タイプとも本人のみ。マネージャーは閲覧のみ                                                            |
| OCR                | Gemini（`GEMINI_API_KEY` 等を hr-dx-saas に追加）                                                       |
| CSVエクスポート    | 第1波に含める（請求書・発注書。dx-sensor の exportCsv 移植）                                            |
| メニュー           | 種類×2（新規／一覧）で8エントリ                                                                         |
| 分類               | `service_class`: 「便利ツール」／ `service_category`: 「文書ホルダー」（新規）                          |
| ルーティング       | `/tool/documents`・`/tool/documents/new`＋`?type=`（dx-sensor と同じクエリ方式）                        |
| アーキテクチャ     | プラグイン構成維持 + API→Server Actions（Approach 1）                                                   |
| コスト計測テーブル | dx-sensor の `image_analysis_runs` 連携は **スコープ外**（hr-dx-saas に当該テーブルなし）               |

---

## 3. ディレクトリ構成

```
src/app/(tenant)/(tenant-users)/tool/documents/
  page.tsx                      # 一覧（?type=...）
  DocumentsAlbumHost.tsx        # タイプ別 Album 振り分け
  loading.tsx
  error.tsx
  new/
    page.tsx                    # 撮影（?type=...）
    CaptureHost.tsx             # タイプ別 CaptureForm 振り分け
    loading.tsx
    error.tsx

src/features/documents/
  queries.ts
  actions.ts
  types.ts
  canMutateDocument.ts
  plugins/                      # registry + 4 types
  components/                   # Capture* / *Album / Overlay 等

src/lib/documents/
  storagePaths.ts
  tokyoDate.ts
  findDuplicate.ts
  lineItems.ts
  exportCsv.ts
  cleanupTmp.ts

src/lib/image-analysis/
  types.ts
  gemini/gemini.ts
  document-ocr/documentOcr.ts
  document-ocr/parseVisionJson.ts
```

`src/config/routes.ts` に以下を追加（既存 `TOOL_PICTURE_REPORT` と同階層）:

```ts
TOOL_DOCUMENTS: '/tool/documents',
TOOL_DOCUMENTS_NEW: '/tool/documents/new',
```

メニューの `route_path` はクエリ付きで登録する（例: `/tool/documents/new?type=business_card`）。

---

## 4. データモデル

### 4.1 マイグレーション方針

移植元 `0019`〜`0021` を hr-dx-saas 向けに1本化。`CREATE TABLE IF NOT EXISTS`、`ON DELETE CASCADE`、`current_tenant_id()` / `current_employee_division_id()` / `current_employee_is_manager()` を使用。`image_analysis_runs` への FK は作らない。

### 4.2 `captured_documents`

主要カラム（dx-sensor 踏襲 + 追加）:

- `tenant_id`, `owner_user_id`, `division_id`（投稿当時の所属・必須 ※未配属ユーザーは投稿不可とする）
- `document_type`, `document_mode`（receipt 用。他は null）
- `company_visible`（名刺以外はアプリ層で常に false）
- `title`, `counterparty`, `context_date`, `amount_yen`, `notes`, `tags`
- `extracted` (jsonb), `raw_ocr`, `created_at`, `updated_at`

### 4.3 子テーブル

- `captured_document_images`（role: front/back/page）
- `captured_document_line_items`（明細）

### 4.4 SELECT ポリシー（ハイブリッド）

```
tenant_id = current_tenant_id()
AND (
  owner_user_id = auth.uid()
  OR (
    document_type = 'business_card'
    AND company_visible = true
  )
  OR (
    division_id = current_employee_division_id()
    AND current_employee_is_manager()
  )
)
```

※ マネージャーは同一部門の非公開名刺も閲覧可（壁打ちで承認済み）。

### 4.5 INSERT / UPDATE / DELETE

- INSERT: `owner_user_id = auth.uid()` かつ `tenant_id = current_tenant_id()`
- UPDATE / DELETE: `owner_user_id = auth.uid()` のみ
- 子テーブルは親の可視・所有者に追従

### 4.6 Storage バケット `captured-documents`

パス規約（dx-sensor 踏襲）:

- tmp: `{tenantId}/tmp/{userId}/{fileId}.jpg`
- final: `{tenantId}/{documentType}/{yyyy-mm-dd}/{documentId}/{fileId}.jpg`

SELECT は親ドキュメントの可視条件と整合。INSERT/DELETE は本人（tmp）または所有者（final）に制限。

---

## 5. データアクセス層

### 5.1 queries.ts

- `listDocuments({ type, mode?, scope, offset, q? })`
- `getDocumentDetail(id)`（images + line_items + 署名付き URL）
- スコープ: `own` / `team`（同部門・マネージャー） / `company`（公開名刺）

### 5.2 actions.ts

| Action               | 旧 API                             |
| -------------------- | ---------------------------------- |
| `analyzeDocument`    | `POST /api/documents/analyze`      |
| `createDocument`     | `POST /api/documents`              |
| `updateDocument`     | `PATCH /api/documents/[id]`        |
| `deleteDocument`     | `DELETE /api/documents/[id]`       |
| `reanalyzeDocument`  | `POST /api/documents/[id]/analyze` |
| `exportDocumentsCsv` | `POST /api/documents/export`       |

`app/api/documents/**` は作成しない。

### 5.3 OCR

- `src/lib/image-analysis/document-ocr/` + `gemini/` を最小移植
- 環境変数: `GEMINI_API_KEY`, `GEMINI_VISION_MODEL`（デフォルト `gemini-2.5-flash`）
- Server Action 内でのみ呼び出し

### 5.4 canMutateDocument

本人のみ `true`（admin / developer 分岐は削除）。RLS と二重保護。

---

## 6. UI設計

### 6.1 新規（`/tool/documents/new?type=`）

タイプ別 CaptureForm を移植。解析・保存は Server Actions。未配属（`division_id` null）の場合は投稿不可メッセージを表示。

### 6.2 一覧（`/tool/documents?type=`）

| タイプ | UI                                                                                      |
| ------ | --------------------------------------------------------------------------------------- |
| 名刺   | 「自分」／「公開（会社）」。マネージャーは「部門」も可。詳細で `company_visible` トグル |
| その他 | 一般は自分のみ。マネージャーは「自分」⇄「部門」。CSV（invoice / purchase_order）        |

---

## 7. メニュー登録

冪等シード（picture-report と同パターン）:

1. `service_class`「便利ツール」を名前解決（無ければ作成）
2. `service_category`「文書ホルダー」を名前解決（無ければ作成）＋ `service_class_index`
3. 8サービスの登録（`route_path` 重複判定）
4. `app_role_service` 全ロール許可
5. `tenant_service` 全契約テナント有効化

| 表示名         | route_path                                |
| -------------- | ----------------------------------------- |
| 名刺を撮る     | `/tool/documents/new?type=business_card`  |
| 名刺ホルダー   | `/tool/documents?type=business_card`      |
| 請求書を撮る   | `/tool/documents/new?type=invoice`        |
| 請求書ホルダー | `/tool/documents?type=invoice`            |
| 発注書を撮る   | `/tool/documents/new?type=purchase_order` |
| 発注書ホルダー | `/tool/documents?type=purchase_order`     |
| 領収書を撮る   | `/tool/documents/new?type=receipt`        |
| 領収書ホルダー | `/tool/documents?type=receipt`            |

---

## 8. エラーハンドリング

- カメラ権限拒否等: dx-sensor の日本語メッセージを踏襲
- Action 失敗: `console.error` + Client へ簡潔な日本語
- `loading.tsx` / `error.tsx` を両ルートに配置

---

## 9. テスト方針

- **Unit**: plugins・exportCsv・storagePaths・canMutateDocument・parseVisionJson（`node:test`）
- **権限ガード**: 本人以外 mutate 拒否、非名刺の `company_visible` 強制 false（スキーマ／Action テスト）
- **手動確認**: 4タイプの撮影→解析→保存→一覧、名刺公開、マネージャー部門タブ、CSV  
  Playwright 基盤新設はスコープ外

---

## 10. 移植元との差分まとめ

| 項目                | dx-sensor               | hr-dx-saas               |
| ------------------- | ----------------------- | ------------------------ |
| 可視範囲            | 本人 or company_visible | ハイブリッド（タイプ別） |
| 編集・削除          | 本人 or admin（公開時） | 本人のみ                 |
| データアクセス      | API Routes              | Server Actions           |
| OCR                 | Gemini                  | Gemini（同一）           |
| メニュー            | トップカタログ          | サービスマスタ 8本       |
| division_id         | なし                    | 投稿当時の部門を保存     |
| image_analysis_runs | あり                    | 連携しない               |

---

## 11. オープンクエスチョン

なし（壁打ちにより全項目確定済み）。

---

## 12. 未移植・実装時注意

- Capture / Album コンポーネントは大きく、Props から `tenantId`/`userId` の Client 直渡し＋`fetch` を `getServerUser` + Actions に置換する作業が中心
- メニューの `route_path` にクエリが含まれるため、既存のメニュー解決ロジックがクエリ付き path を扱えるか実装時に確認する（不可ならパスをタイプ別ルートに分割するフォールバックを計画タスクに含める）
