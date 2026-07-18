# 出荷トレーサビリティQRラベル発行 実装計画（PRD）

> 対象画面: `/myou/delivery-scan`（出荷登録 QRスキャン）

## 1. 問題定義

出荷登録画面では、製造元が発行した製品QR（`SERIAL:<シリアル番号>,EXP:<有効期限>`）を読み取って出荷を登録できる。しかし出荷先（施工会社）への納品時に、製品自体のシリアル番号・有効期限に加えて「どの出荷先に」「いつ・何番目に」出荷したかを示す独立したトレーサビリティ用QRラベルを、その場で発行・印刷する手段がない。現場で紙の送り状やラベルを貼付する際に使えるQRコードを、出荷登録画面から直接生成できるようにする。

## 2. ユーザーストーリー

| As a                | I want to                                                  | So that                                                                      |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 出荷担当者          | 出荷先を選んだ状態でトレーサビリティQRラベルを発行したい   | 製品QRの読み取り有無に関わらず、出荷先・通番入りのラベルをその場で印刷できる |
| 出荷担当者          | スキャン済みのシリアル番号・有効期限をラベルに引き継ぎたい | 二重入力の手間を省ける                                                       |
| 出荷担当者          | スキャンしていない製品にもラベルを発行したい               | 手入力でシリアル番号・有効期限を補って印刷できる                             |
| 人事/システム管理者 | 発行したトレーサビリティQRの履歴を残したい                 | 出荷先・発行日ごとの通番が重複せず追跡できる                                 |

## 3. 要求（優先度別）

**Must（今回スコープ）**

1. `myou_companies` にテナント内で一意な `company_no`（出荷先No）を追加し、既存会社にバックフィル・新規会社に自動採番する
2. 発行のたびに記録する `myou_trace_labels` テーブルを新設し、当日通番（`TraceNo`）を採番する
3. 出荷登録画面（`DeliveryForm.tsx`）に「QRコード発行」ボタンを追加（出荷先未選択時は非表示）
4. ボタン押下でモーダルを開き、シリアル番号・有効期限を編集可能な入力欄として表示（直前スキャン結果があれば初期値としてコピー）
5. 「QRコード印刷」ボタンでトレーサビリティQR（`SERIAL:<シリアル番号>,EXP:<有効期限>,ShipTo:<出荷先No>,TraceNo:<YYYYMMDD-NNNN>`）を発行・登録し、印刷する
6. 同一モーダルセッション内での再印刷は新規TraceNoを消費しない（明示的な「新しく発行し直す」操作でのみ再採番）

**Won't（今回スコープ外）**

- 発行済みトレーサビリティラベルの一覧・検索画面
- ラベルの取り消し・無効化機能
- `company_no` のユーザーによる手動編集UI

## 4. データモデル

**`myou_companies` 変更**

- `company_no integer NOT NULL` を追加
- `(tenant_id, company_no)` に UNIQUE 制約
- 既存行: `created_at` 順にテナントごと1から採番してバックフィル
- 新規登録時（`upsertCompany` action）: テナント内の現在最大値 + 1 を採番して INSERT

**新規テーブル `myou_trace_labels`**

```sql
CREATE TABLE public.myou_trace_labels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  company_id uuid NOT NULL REFERENCES public.myou_companies(id),
  serial_number text NOT NULL,
  expiration_date date NOT NULL,
  trace_no text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.myou_trace_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_trace_labels" ON public.myou_trace_labels
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
```

- `trace_no` 形式: `YYYYMMDD-NNNN`（当日・テナント内の通番、4桁ゼロ埋め）。採番ロジックは既存の `buildSerialNumber`/`getMaxSerialSequence`（`qr-parser.ts`）と同じ「当日分を取得して数値比較で最大値+1」方式を踏襲する
- `serial_number` に外部キー制約は付けない（`myou_delivery_logs.serial_number` と同じ方針。手入力の未登録シリアルも許容するため）

## 5. 配置ルール

```
src/features/myou/
  types.ts        # TraceLabel 型、issueTraceLabelSchema を追加
  actions.ts       # issueTraceLabel Server Action を追加
  lib/qr-parser.ts # buildTraceNo / getMaxTraceSequence / extractTraceSequence / buildTraceQrPayload を追加

src/app/(tenant)/(tenant-users)/myou/components/
  DeliveryForm.tsx   # 「QRコード発行」ボタン追加（出荷先選択時のみ表示）
  TraceQrModal.tsx    # 新規: トレーサビリティQR発行モーダル

supabase/migrations/
  <timestamp>_myou_trace_labels.sql   # company_no 追加 + myou_trace_labels 新設
```

## 6. マスタ登録

- 本機能に伴うマスタ（`services` / `app_role_service` / `tenant_service`）への新規登録は不要（既存の出荷登録画面内の機能追加のため、新規メニュー項目は発生しない）

## 7. 成功指標

- 出荷登録画面から追加操作なしでトレーサビリティQRラベルを発行・印刷できる
- 同一テナント・同一日内で `TraceNo` が重複しない
- `company_no` がテナント内で一意である

## 8. オープンクエスチョン

- なし（ブレインストーミングセッションで以下を確定済み）
  - 出荷先No: `myou_companies` に `company_no` を新規追加する方式（UUID流用・会社名コードは不採用）
  - TraceNo採番: 新規テーブル `myou_trace_labels` に発行のたび記録する方式（`myou_delivery_logs` 件数流用・クライアント側ランダム生成は不採用）
  - モーダルのシリアル番号・有効期限欄: 編集可能な入力欄とする（読み取り専用は不採用）
