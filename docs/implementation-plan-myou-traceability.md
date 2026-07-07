# PRD: mYou 製品トレーサビリティ・有効期限管理システム改善

- 作成日: 2026-07-07
- ステータス: 実装済み（本ドキュメントは仕様の正本として維持する）
- 対象: `src/app/(tenant)/(tenant-users)/myou/` ／ `src/features/myou/`

## 1. 問題定義

（株）ミュー向けのスプレー缶製品「セルフィール MS」のトレーサビリティ・有効期限管理システムについて、仕様書（作業手順／業務処理の概要／システム概要）と実装の間に以下のギャップが存在した。

1. 仕様は「①製造元→ミューへの納品（入荷・在庫登録）」「②ミュー→施工会社への出荷」の**2段階スキャン**だが、実装は出荷登録1回のみで在庫・仕入納入日の概念が無かった
2. QRラベル（シリアル採番）を発行する手段がシステムに無かった
3. 有効期限アラートは手動送信のみ動作するのに、UI・メニューは「毎日深夜に自動チェック・自動送信」と表示していた（Edge Function はメール未送信・cron 未設定の死にコード）
4. トレース照会に複数のバグ（会社名の空欄表示、1シリアル1配送しか記録できないDB制約、担当者未記録）

## 2. ユーザーストーリー

- ミューの担当者として、製造元から納品されたスプレー缶をQRスキャンで**在庫登録**し、入荷日を記録したい
- ミューの担当者として、施工会社へ出荷する際にQRスキャンで**出荷先・出荷日**を記録したい
- ミューの担当者として、**有効期限の近い在庫**を把握して先入れ先出しの判断をしたい
- ミューの担当者として、期限が近い出荷済み製品を施工会社別に確認し、**注意喚起メールを手動送信**したい
- ミューの管理者として、シリアル番号やQRから**流通履歴（出荷先・有効期限・仕入納入日・出荷日）**を照会したい
- ミューの管理者として、シリアル番号を**採番してQRラベルを発行・印刷**したい

## 3. スコープ判断（2026-07-07 ユーザー決定）

| 項目                             | 判断                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| 入荷スキャン＋在庫管理           | **実装する**                                                                                   |
| QRラベル発行（採番・印刷）       | **実装する**                                                                                   |
| 期限アラートの自動メール送信     | **手動送信のみ維持**（UI表記を手動運用に修正、死んだ Edge Function `expiration-alert` は削除） |
| 購買管理・売掛管理とのデータ連携 | **スコープ外**（連携先仕様の確定後に別途計画）                                                 |

## 4. データモデル

### 製品ステータスのライフサイクル

```
issued（ラベル発行済）→ in_stock（入荷済・在庫）→ delivered（出荷済）
```

- `myou_products.status` に CHECK 制約（上記3値）
- 再入荷（delivered → in_stock）は返品運用として警告付きで許容
- 未入荷シリアルの出荷（issued/未登録 → delivered）は運用初期を考慮し警告付きで許容

### テーブル（migration: `20260707170000_myou_traceability_improvements.sql`）

| テーブル             | 変更                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `myou_products`      | `received_at date`（仕入納入日）・`issued_at timestamptz`（ラベル発行日時）追加、status CHECK 制約、default `'issued'`、`(tenant_id, status, expiration_date)` インデックス |
| `myou_delivery_logs` | `unique_product_delivery`（serial_number UNIQUE）撤廃 → 複数ホップ配送を記録可能に、`serial_number` インデックス追加                                                        |

全テーブルは RLS（`tenant_id = current_tenant_id()`）でテナント分離済み。

### シリアル番号の採番規則

`MS-YYYYMMDD-NNNN`（例: `MS-20260707-0001`）。テナント内・当日単位の連番。採番ロジックは `src/features/myou/lib/qr-parser.ts` の `buildSerialNumber` / `extractSerialSequence`。同時実行時の衝突は主キー制約で検知し再実行を促す（低頻度運用のため楽観的に許容）。

### QRペイロード形式

`SERIAL:<シリアル番号>,EXP:<YYYY-MM-DD>`（既存ラベルとの互換維持。形式外のQRは全文をシリアルとして扱う）

## 5. 画面構成（配置: `src/app/(tenant)/(tenant-users)/myou/`）

| ルート（APP_ROUTES.MYOU） | 画面                                             | 区分             |
| ------------------------- | ------------------------------------------------ | ---------------- |
| `/myou/labels`            | QRラベル発行（採番・qrcode.react・印刷CSS）      | 新規             |
| `/myou/receiving-scan`    | 入荷登録（QRスキャン）                           | 新規             |
| `/myou/inventory`         | 在庫一覧（DataTable、フル幅パターンB）           | 新規             |
| `/myou/delivery-scan`     | 出荷登録（QRスキャン、旧「納入登録」）           | 改修             |
| `/myou/traceability`      | トレース照会（仕入納入日・出荷日・出荷先を表示） | 改修             |
| `/myou/expiration-alerts` | 有効期限監視・手動アラート送信                   | 改修（表記修正） |
| `/myou/companies`         | 施工会社（納入先）管理                           | 既存             |

メニュー（`service` テーブル）は migration `20260707170100_update_myou_service_menu.sql` で修正・追加。**service / tenant_service はクラウド同期マスタのため、本番適用は要事前確認。**

## 6. 実装配置ルール

- 読み取り（SELECT）: `src/features/myou/queries.ts`
- 書き込み（Server Actions）: `src/features/myou/actions.ts`（例外として `getProductTrace` はクライアント検索フォームから呼ぶため Server Action として actions.ts に置く）
- 型・Zod スキーマ: `src/features/myou/types.ts`
- QRペイロード・採番の純関数: `src/features/myou/lib/qr-parser.ts`（テスト: `qr-parser.test.ts`）
- 入力バリデーション: Zod（`registerReceivingSchema` / `registerDeliverySchema` / `issueLabelsSchema`）。有効期限は `YYYY-MM-DD` 必須
- 出荷ログには `delivered_by`（担当者名 = `getServerUser().name`）を記録
- 日時は Asia/Tokyo（`toJSTDateString` / `toJSTISOString`）

## 7. 成功指標

- 入荷→在庫→出荷→トレース照会の一連フローがQRスキャンのみで完結する
- トレース照会で仕様書の照会項目（出荷先・有効期限・仕入納入日・出荷日）が全て表示される
- 1つのシリアルに複数の出荷履歴を記録できる（返品→再出荷）
- UI上の機能説明と実際の動作（手動アラート送信）が一致している

## 8. スコープ外・オープンクエスチョン

- **自動メール送信**: 将来実装する場合は Vercel Cron + 既存 `sendExpirationAlertEmail`（nodemailer）の再利用を推奨
- **購買管理・売掛管理連携**: 連携先のインターフェース仕様が未確定。CSVエクスポートを暫定案として保留
- **採番の同時実行制御**: 発行頻度が上がる場合は DB シーケンス or advisory lock への切り替えを検討
- **既存の `service` レコード重複**: `/myou/expiration-alerts` を指すメニュー行が複数テナント向けに存在する場合の整理は本番データ確認時に行う
