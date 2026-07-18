# myou 製造ロット在庫・トレーサビリティQR 全面再設計（PRD）

> 対象範囲: `src/features/myou/` 全体、`src/app/(tenant)/(tenant-users)/myou/` 配下の全画面、`supabase/migrations/` の myou 関連テーブル
>
> 本書は [`docs/implementation-plan-myou-trace-qr-label.md`](./implementation-plan-myou-trace-qr-label.md)（出荷登録画面へのトレーサビリティQR発行ボタン追加という狭いスコープのPRD）を、ロット単位の在庫管理という本来の業務仕様に合わせて全面的に再設計するものである。旧PRDは経緯を追える恒久記録として削除せず残す。

## 1. 問題定義

現行システムには「製造ロット」という業務上のエンティティが存在せず、`myou_products` は **1缶（スプレー缶1本）＝1シリアル番号＝1行** の個体管理として実装されている。実際の工場出荷業務は次の通りであり、現行データモデルと乖離している。

1. 製造ロットごとに「製造QRコード」を段ボール（ロット）に貼付して出荷する
2. 1個の段ボール（ロット）には複数のスプレー缶が梱包されている
3. 在庫は「ロット番号＋数量」で保管する（個体シリアルではなく数量管理）
4. 客先への出荷は、受注数に応じてロット箱から取り出して出荷する
5. 客先へ出荷する時、「トレーサビリティQRコード」を発行・貼付して出荷する

現行実装の具体的な乖離点：

| 項目                                    | 現行実装                                                                                          | 業務仕様との乖離                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 在庫の最小単位                          | `myou_products` の1行＝1缶（シリアル）                                                            | ロット＋数量であるべき。個体シリアルでの在庫保管は不要                                                                  |
| 入荷登録（`processReceiving`）          | スキャンしたシリアルを起点に、指定数量分の連番シリアルを複製生成                                  | 実際は「1ロットに1QR、数量は別途記録」であるべき。連番シリアル複製は疑似的な数量管理に過ぎない                          |
| ラベル発行（`issueLabels`）             | 個体シリアルを連番採番して印刷                                                                    | 「製造ロットQR」を1枚発行すべき                                                                                         |
| 出荷登録（`registerDelivery`）          | 個体QRを1件ずつスキャンし単一シリアルの状態を更新                                                 | 受注数量に応じてロットの残数を減算する引当処理であるべき                                                                |
| トレーサビリティQR（`issueTraceLabel`） | 個体シリアルに対し、出荷登録とは別の任意ボタンで発行（`myou_trace_labels`、ロットとの紐付けなし） | 出荷登録に統合し、どのロットから払い出したかを常に記録すべき。発行単位（出荷1件に1枚／缶ごとに1枚）は運用者が選べるべき |

## 2. ユーザーストーリー

| As a                | I want to                                                                             | So that                                                  |
| ------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 製造・入荷担当者    | 段ボール1箱（ロット）に対して製造QRを1枚だけ発行したい                                | 缶の本数分ラベルを印刷する手間がなくなる                 |
| 入荷担当者          | ロットQRをスキャンして「数量」を入力するだけで入荷登録したい                          | 個体ごとのシリアル入力が不要になり入荷作業が速くなる     |
| 出荷担当者          | 受注数量を入力してロットQRをスキャンするだけで出荷を登録したい                        | 缶を1本ずつスキャンする手間がなくなる                    |
| 出荷担当者          | トレーサビリティQRを「出荷1件に1枚」または「缶ごとに1枚」のどちらでも選んで発行したい | 客先の受け入れ検品ルールや現場運用に合わせられる         |
| 人事/システム管理者 | どのロットから、いつ、どの客先に何個出荷したかを追跡したい                            | 品質トラブル時の回収範囲（ロット単位）を即座に特定できる |
| 在庫管理者          | ロット単位の残数一覧を確認したい                                                      | 発注・在庫補充の判断ができる                             |

## 3. 要求（優先度別）

**Must（本再設計のスコープ）**

1. `myou_lots`（製造ロット）テーブルを新設し、`lot_no` ＋ `quantity_total` ／ `quantity_remaining` で在庫を管理する
2. ラベル発行画面（`labels` / `LabelIssueForm`）を「製造ロットQR発行」に置き換え、`lot_no` を採番してロット単位のQRを1枚発行する
3. 入荷登録（`receiving-scan` / `ReceivingForm` / `ReceivingProcessModal`）をロットQRスキャン＋数量入力による `myou_lots` 登録に置き換える
4. 出荷登録（`delivery-scan` / `DeliveryForm`）をロットQRスキャン＋受注数量入力による在庫引当（`quantity_remaining` 減算）に置き換える
5. トレーサビリティQR発行（`TraceQrModal` / `issueTraceLabel`）を出荷登録に統合する。発行されるQRコード自体は出荷1件につき1件（同一 `trace_no`・同一内容）とし、缶単位で物理ラベルが複数枚必要な場合は**印刷時に運用者が指定した部数だけ同一QR画像を複製印刷する**（内容の異なるQRを個体ごとに生成するバッチ発行は行わない）
6. `myou_trace_labels` に `lot_id` を追加し、常にどのロットから払い出したかを記録する
7. 在庫一覧（`inventory`）・トレーサビリティ照会（`traceability`）・期限アラート（`expiration-alerts`）をロット単位のデータ構造に合わせて作り直す
8. `myou_products`（個体シリアル管理テーブル）を廃止する。既存データは開発中データのため削除してよい（ユーザー確認済み）

**Should（本再設計に含めるが優先度は一段下げてよい）**

- トレーサビリティ照会画面での「ロット→複数トレースラベル」の系譜表示

**Won't（今回スコープ外）**

- ロット分割出荷（1回の出荷で複数ロットから自動的に引き当てる）機能。受注数量がロット残数を超える場合は、運用者が手動で複数回（別ロットを）スキャンし、複数回の出荷登録として扱う
- `labels`（製造ロットQR発行）画面と `receiving-scan`（入荷登録）画面の統合。引き続き別画面・別イベントとして維持する
- `myou_products` の履歴データを新モデルへ移行するマイグレーション（データ消失を許容するため不要）
- ロットの部分返品・在庫調整（残数の手動補正）機能
- QRラベルの取り消し・無効化機能

## 4. データモデル

### 4.1 新設 `myou_lots`（製造ロット）

```sql
CREATE TABLE public.myou_lots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  lot_no text NOT NULL,
  qr_payload text NOT NULL,
  manufactured_date date,
  expiration_date date NOT NULL,
  quantity_total integer NOT NULL CHECK (quantity_total > 0),
  quantity_remaining integer NOT NULL CHECK (quantity_remaining >= 0),
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'depleted')),
  received_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, lot_no)
);
ALTER TABLE public.myou_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_lots" ON public.myou_lots
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
```

- `lot_no` 形式: `LOT-YYYYMMDD-NNNN`（当日・テナント内の通番、4桁ゼロ埋め）。採番ロジックは既存 `qr-parser.ts` の `buildSerialNumber`/`getMaxSerialSequence` と同じ「当日分を取得して数値比較で最大値+1」方式を踏襲する
- `qr_payload` 形式: `LOT:<lot_no>,MFG:<manufactured_date>,EXP:<expiration_date>`
- `quantity_remaining` が 0 になったら `status` を `depleted` に更新し、在庫一覧から除外する

### 4.2 変更 `myou_trace_labels`（客先出荷単位のトレーサビリティQR）

```sql
ALTER TABLE public.myou_trace_labels
  ADD COLUMN lot_id uuid NOT NULL REFERENCES public.myou_lots(id),
  ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  DROP COLUMN serial_number;
```

- `qr_payload` 形式: `LOT:<lot_no>,ShipTo:<company_no>,TraceNo:<trace_no>,QTY:<quantity>,EXP:<expiration_date>`
- 出荷1件＝ `myou_trace_labels` 1行。`quantity` はその出荷でロットから払い出した缶の総数を表す（既定値は出荷数量）
- 物理ラベルが複数枚（缶の本数分）必要な場合も、生成される `trace_no`／QR内容は1件のみ。印刷部数は画面側の入力値であり、DBには持たず同一QR画像を指定部数だけ複製印刷する
- `trace_no` 採番ロジック（`YYYYMMDD-NNNN`）は現行のまま維持

### 4.3 変更 `myou_delivery_logs`

```sql
ALTER TABLE public.myou_delivery_logs
  ADD COLUMN lot_id uuid NOT NULL REFERENCES public.myou_lots(id),
  ADD COLUMN quantity integer NOT NULL CHECK (quantity > 0),
  DROP COLUMN serial_number;
```

- 1出荷イベント＝1レコード。内訳の各トレーサビリティQRは `myou_trace_labels` 側に複数行として記録する

### 4.4 廃止 `myou_products`

```sql
DROP TABLE public.myou_products;
```

- 個体シリアル管理は廃止。過去の出荷トレース照会（`getProductTrace`）は新モデルの `traceability` 照会（`trace_no` / `lot_no` 検索）に置き換える

### 4.5 RPC `myou_deliver_from_lot`（新設、既存 `myou_register_delivery` を置き換え）

- 引数: `lot_id`, `company_id`, `quantity`, `delivered_by`
- 処理: `myou_lots.quantity_remaining` を `quantity` 分アトミックに減算（残数不足時はエラー。ロットをまたぐ自動引き当ては行わない＝残数不足なら運用者が別ロットで再度スキャンする）→ 0 になったら `status='depleted'` に更新 → `myou_delivery_logs` に1行追加 → 呼び出し元（Server Action）が続けて `myou_trace_labels` に1行追加
- 単一トランザクション内で在庫減算とログ記録を行い、二重出荷・在庫不整合を防ぐ

## 5. 画面・フローの再設計

| 画面/コンポーネント                                                           | 現行の役割                                                       | 新しい役割                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labels/page.tsx` / `LabelIssueForm.tsx`                                      | 個体シリアルを連番採番して印刷                                   | **製造ロットQR発行**：`lot_no` を採番し、段ボール1箱分のQRを1枚発行して印刷する                                                                                                               |
| `receiving-scan/page.tsx` / `ReceivingForm.tsx` / `ReceivingProcessModal.tsx` | スキャンしたシリアルを起点に数量分シリアルを複製生成             | ロットQRをスキャン（または新規ロット手入力）→ **数量を入力し `myou_lots` へ1行登録**（`quantity_total` = `quantity_remaining`）                                                               |
| `delivery-scan/page.tsx` / `DeliveryForm.tsx`                                 | 出荷先選択→個体QRを1件ずつスキャンして `registerDelivery` を呼ぶ | 出荷先選択→**受注数量を入力**→ロットQRをスキャン（在庫引当）→ `myou_deliver_from_lot` を呼び出し数量分 `quantity_remaining` を減算                                                            |
| `TraceQrModal.tsx` / `issueTraceLabel`                                        | 個体シリアルに対し任意でトレースQRを1枚発行（出荷登録と非連動）  | 出荷登録の一部として統合。トレースQR（`trace_no`）は出荷1件につき1件発行し、`myou_trace_labels` へ1行追加。印刷部数（既定値＝出荷数量）を運用者が指定し、同一QR画像を指定部数だけ複製印刷する |
| `inventory/page.tsx`                                                          | `myou_products` の `status='in_stock'` 一覧（個体単位）          | `myou_lots` の `quantity_remaining > 0` 一覧（列: ロット番号・製造日・期限・総数・残数）                                                                                                      |
| `traceability/page.tsx`                                                       | シリアル番号検索                                                 | `trace_no` または `lot_no` で検索。1ロット→複数トレースラベル・複数出荷先への系譜を表示                                                                                                       |
| `expiration-alerts/page.tsx`                                                  | `myou_products.status='delivered'` ベースの期限アラート          | `myou_lots` の `expiration_date` ベースに変更（残数がある未出荷ロットの期限を監視）                                                                                                           |
| `companies/page.tsx`                                                          | マスタCRUD                                                       | 変更なし                                                                                                                                                                                      |

### Server Actions（`src/features/myou/actions.ts`）変更前後比較

| 関数               | 現行                                                                 | 変更後                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `issueLabels`      | 新規シリアルを連番採番し `status='issued'` で `myou_products` へ登録 | `issueLot`：新規 `lot_no` を採番し `myou_lots` へ登録（数量は入荷時に確定するため任意項目）                                                            |
| `processReceiving` | スキャン起点で数量分シリアルを複製し `in_stock` へupsert             | `receiveLot`：スキャンした `lot_no` に対し数量を入力し `myou_lots.quantity_total`/`quantity_remaining` を確定登録                                      |
| `registerDelivery` | RPC `myou_register_delivery` で単一シリアルの状態更新＋ログ追加      | `deliverFromLot`：RPC `myou_deliver_from_lot` でロット残数を減算しログ追加、続けて `myou_trace_labels` に1行追加（残数不足時は別ロットで再度呼び出す） |
| `issueTraceLabel`  | 個体シリアルに対しトレースQRを1枚発行                                | `deliverFromLot` に統合し廃止（別関数として独立させない）                                                                                              |
| `getProductTrace`  | シリアル単位のトレース履歴取得                                       | `getLotTrace`：`lot_no` または `trace_no` を起点にロット・出荷履歴・トレースラベルを横断取得                                                           |

## 6. 配置ルール

```
src/features/myou/
  types.ts         # MyouLot 型を新設。TraceLabel に lot_id/quantity を追加。MyouProduct 型を削除
  queries.ts        # getLots（在庫一覧）, getLotTrace を追加。getInventory を getLots に置き換え
  actions.ts        # issueLot, receiveLot, deliverFromLot, getLotTrace を追加。旧 issueLabels/processReceiving/registerDelivery/issueTraceLabel/getProductTrace は置き換えのうえ削除
  lib/qr-parser.ts  # buildLotNo / getMaxLotSequence / extractLotSequence / buildLotQrPayload / buildTraceQrPayload（QTY対応） を追加。シリアル前提の関数は削除

src/app/(tenant)/(tenant-users)/myou/
  labels/page.tsx, components/LabelIssueForm.tsx           # ロットQR発行に変更
  receiving-scan/page.tsx, components/ReceivingForm.tsx,
    components/ReceivingProcessModal.tsx                    # ロット入荷登録に変更
  delivery-scan/page.tsx, components/DeliveryForm.tsx,
    components/TraceQrModal.tsx                              # ロット引当出荷＋トレースQR印刷部数選択に変更
  inventory/page.tsx                                         # ロット在庫一覧に変更
  traceability/page.tsx                                      # lot_no/trace_no 検索に変更
  expiration-alerts/page.tsx                                 # ロット期限ベースに変更

supabase/migrations/
  <timestamp>_myou_lots_and_trace_redesign.sql   # myou_lots 新設、myou_trace_labels/myou_delivery_logs 拡張、
                                                    myou_products 廃止、myou_deliver_from_lot RPC 新設
```

## 7. マスタ登録

- 本再設計は既存メニュー項目（`services` に登録済みの `labels` / `receiving-scan` / `delivery-scan` / `inventory` / `traceability` / `expiration-alerts`）の内部実装変更であり、画面遷移先URLの変更は伴わないため `services` / `app_role_service` / `tenant_service` への新規登録・変更は不要

## 8. 成功指標

- ラベル発行1回＝ロットQR1枚（缶の本数分の印刷が不要になる）
- 入荷登録が「ロットQRスキャン＋数量入力」の2ステップで完了する
- 出荷登録が「受注数量入力＋ロットQRスキャン」の2ステップで完了し、`myou_lots.quantity_remaining` が正しく減算される
- トレーサビリティQRの印刷部数を運用者が指定でき、同一 `trace_no` のQR画像を必要な缶の本数分だけ複製印刷できる
- `traceability` 画面で `lot_no` からその出荷先・出荷日・トレーサビリティQR一覧を辿れる

## 9. オープンクエスチョン

なし（以下を確定済み）

1. **ロット分割出荷**：自動引き当ては実装しない。受注数量がロット残数を超える場合は、運用者が手動で別ロットを再度スキャンし、複数回の出荷登録（＝複数の `trace_no`）として扱う
2. **ラベル発行画面と入荷登録画面の統合**：統合しない。`labels`（製造ロットQR発行）と `receiving-scan`（入荷登録）は引き続き別画面・別イベントとして維持する
3. **缶単位の複数枚印刷**：内容の異なるQRを個体ごとに複数発行するバッチ発行は行わない。発行するQRコード（`trace_no`）は出荷1件につき1件のみとし、缶の本数分の物理ラベルが必要な場合は印刷時に**同一QR画像を運用者が指定した部数だけ複製表示**する
4. **`myou_products` 廃止に伴うトレース履歴の消失**：許容する（開発中データのため、移行マイグレーションは行わない）
