# 設計計画: 産業医の稼働日時設定と面談予約制約

面談予約カレンダーにおいて、「産業医の稼働日時」を設定し、**稼働日時のみ予約可能**とする仕様の設計計画です。

---

## 1. 概要

### 1.1 現状

- **面談予約カレンダー**（`/adm/high-stress-followup` の「面接予約カレンダー」タブ）で、日付クリックにより `AppointmentModal` を開き、任意の日時で予約登録可能
- `stress_interview_records` に `doctor_id`（産業医・保健師の employee_id）、`interview_date`（timestamptz）を保存
- 稼働時間の制約はなく、24時間いつでも予約可能な状態

### 1.2 目標

1. **産業医の稼働日時**をテナント単位で設定可能にする
2. 予約登録時に**稼働日時内のみ**予約可能とする制約を付与
3. **稼働日時の保守画面**を提供し、産業医・保健師が自らスケジュールを管理できるようにする

---

## 2. テーブル設計

### 2.1 新規テーブル: `doctor_availability_slots`

産業医・保健師の稼働スロット（時間帯）を定義するテーブル。

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| `id` | uuid | NO | 主キー |
| `tenant_id` | uuid | NO | テナントID（FK: tenants） |
| `doctor_id` | uuid | NO | 産業医・保健師の employee_id（FK: employees） |
| `day_of_week` | smallint | YES | 曜日（0=日, 1=月, ..., 6=土）。繰り返しスロット時のみ使用 |
| `specific_date` | date | YES | 特定日。日付指定スロット時のみ使用 |
| `start_time` | time | NO | 開始時刻（例: 09:00） |
| `end_time` | time | NO | 終了時刻（例: 12:00） |
| `is_active` | boolean | NO | 有効フラグ（デフォルト: true） |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |

**制約:**

- `(day_of_week IS NOT NULL AND specific_date IS NULL) OR (day_of_week IS NULL AND specific_date IS NOT NULL)`  
  → 繰り返しスロット（曜日ベース）か、特定日スロットのいずれか
- `end_time > start_time`  
  → 終了時刻は開始時刻より後
- `UNIQUE (tenant_id, doctor_id, day_of_week, start_time, end_time)`  
  → 繰り返しスロットの重複防止（`specific_date` が NULL の場合）
- `UNIQUE (tenant_id, doctor_id, specific_date, start_time, end_time)`  
  → 特定日スロットの重複防止（`specific_date` が NOT NULL の場合）

**インデックス:**

- `idx_doctor_availability_slots_tenant_doctor` ON (tenant_id, doctor_id)
- `idx_doctor_availability_slots_doctor_date` ON (doctor_id, specific_date) WHERE specific_date IS NOT NULL

**RLS:**

- 産業医・保健師（`company_doctor`, `company_nurse`）: 自テナントの SELECT / INSERT / UPDATE / DELETE
- 人事・人事責任者: 参照のみ（必要に応じて）

---

### 2.2 稼働ブロック（将来拡張用）: `doctor_availability_blocks`

特定日・時間帯を「予約不可」とするブロック。Phase 2 で検討。

| カラム | 型 | 説明 |
|--------|------|------|
| `id` | uuid | 主キー |
| `tenant_id` | uuid | テナントID |
| `doctor_id` | uuid | 産業医・保健師ID |
| `block_date` | date | ブロック日 |
| `start_time` | time | 開始時刻 |
| `end_time` | time | 終了時刻 |
| `reason` | text | 理由（任意） |

---

## 3. 稼働判定ロジック

### 3.1 指定日時が稼働内かどうかの判定

指定日時 `T`（timestamptz）が、`doctor_id` の稼働スロット内かどうかを判定する。

1. **繰り返しスロット**: `day_of_week` が `T` の曜日と一致し、`T` の時刻が `[start_time, end_time)` 内
2. **特定日スロット**: `specific_date` が `T` の日付と一致し、`T` の時刻が `[start_time, end_time)` 内
3. **is_active = true** のスロットのみ有効
4. いずれかのスロットに含まれれば「稼働内」

**タイムゾーン:** 日本時間（Asia/Tokyo）で判定。DB の `interview_date` は timestamptz で保存されているため、比較時にタイムゾーンを考慮する。

### 3.2 予約可能な時間帯の取得

指定日付 `D` について、`doctor_id` の稼働スロットから「その日に有効な時間帯」を算出する。

- 繰り返し: `day_of_week` が `D` の曜日と一致するスロット
- 特定日: `specific_date = D` のスロット
- 両方の結果をマージし、重複・オーバーラップを統合して返す

---

## 4. 保守画面の設計

### 4.1 配置方針

**推奨:** 高ストレス者フォロー管理画面内に **「稼働日時」タブ** を追加する。

- 既存タブ: 高ストレス者リスト / 面接予約カレンダー / 実施・措置履歴 / リマインダー設定
- 追加タブ: **稼働日時**

**理由:**

- 産業医・保健師専用エリア内で完結
- 面談予約と密接に関連するため、同一画面内で管理するのが自然
- 別ルート（例: `/adm/high-stress-followup/availability`）にする場合は、サイドバーまたはタブから遷移

### 4.2 画面構成

#### 4.2.1 稼働日時タブのレイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│ 産業医の稼働日時設定                                              │
├─────────────────────────────────────────────────────────────────┤
│ 産業医・保健師: [▼ 山田 太郎（産業医）]                           │
├─────────────────────────────────────────────────────────────────┤
│ ■ 週次スケジュール（繰り返し）                                    │
│ ┌──────────┬──────────┬──────────┬────────┐                     │
│ │ 曜日      │ 開始時刻  │ 終了時刻  │ 操作    │                     │
│ ├──────────┼──────────┼──────────┼────────┤                     │
│ │ 水曜日    │ 09:00    │ 12:00    │ 編集 削除│                     │
│ │ 水曜日    │ 14:00    │ 17:00    │ 編集 削除│                     │
│ │ 金曜日    │ 10:00    │ 12:00    │ 編集 削除│                     │
│ └──────────┴──────────┴──────────┴────────┘                     │
│ [+ スロットを追加]                                                │
├─────────────────────────────────────────────────────────────────┤
│ ■ 特定日の追加スロット                                            │
│ （例: 臨時で追加した稼働日）                                      │
│ ┌────────────┬──────────┬──────────┬────────┐                   │
│ │ 日付        │ 開始時刻  │ 終了時刻  │ 操作    │                   │
│ ├────────────┼──────────┼──────────┼────────┤                   │
│ │ 2026-03-25 │ 09:00    │ 11:00    │ 編集 削除│                   │
│ └────────────┴──────────┴──────────┴────────┘                   │
│ [+ 特定日を追加]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 UI 要素

| 要素 | 説明 |
|------|------|
| 産業医・保健師セレクト | `app_role` が `company_doctor` または `company_nurse` の従業員を一覧。複数いる場合は切り替え |
| 週次スケジュール | `day_of_week` + `start_time` + `end_time` の一覧。追加・編集・削除 |
| 特定日の追加スロット | `specific_date` + `start_time` + `end_time` の一覧。カレンダーピッカーで日付選択 |
| スロット追加フォーム | 曜日 or 日付、開始時刻、終了時刻を入力。バリデーション（終了 > 開始、重複チェック） |

### 4.3 ディレクトリ構成

```
src/app/(tenant)/(colored)/adm/(company_doctor)/high-stress-followup/
├── components/
│   ├── HighStressFollowupClient.tsx   # タブに「稼働日時」を追加
│   ├── InterviewCalendar.tsx         # 稼働外日時のクリック制御・表示
│   ├── AppointmentModal.tsx          # 時間選択を稼働スロットに制限
│   └── DoctorAvailabilitySettings.tsx # 新規: 稼働日時保守UI
│       ├── WeeklySlotTable.tsx       # 週次スロット一覧
│       ├── SpecificDateSlotTable.tsx # 特定日スロット一覧
│       └── SlotFormDialog.tsx       # スロット追加・編集ダイアログ

src/features/adm/high-stress-followup/
├── queries.ts    # getDoctorAvailabilitySlots, getDoctorsForAvailability
├── actions.ts    # createAvailabilitySlot, updateAvailabilitySlot, deleteAvailabilitySlot
├── types.ts      # DoctorAvailabilitySlot, DoctorForAvailability
└── utils.ts      # 新規: isWithinAvailability, getAvailableSlotsForDate
```

---

## 5. 面談予約フローの変更

### 5.1 AppointmentModal の変更

- **現状:** `datetime-local` で自由入力
- **変更後:**
  - 選択日付に基づき、稼働スロットから「予約可能な時間帯」を算出
  - 時間選択を **ドロップダウン or スロット一覧** に変更（例: 09:00, 09:30, 10:00, ... 30分刻みで稼働内のみ）
  - 稼働スロットが1件もない日は「予約不可」と表示し、登録ボタンを無効化

### 5.2 InterviewCalendar の変更

- **日付セル:**
  - 稼働日あり: クリック可能（現状通り）
  - 稼働日なし: グレーアウト or クリック不可、ツールチップで「この日は稼働日が設定されていません」
- **既存予約の表示:** 現状通り（A-001 等のバッジ表示）

### 5.3 createInterviewAppointment の変更

- サーバー側で **稼働スロット内かどうか** を検証
- 稼働外の場合は `throw new Error('選択された日時は稼働日時に含まれていません')`

---

## 6. 実装フェーズ

### Phase 1: テーブル・型・クエリ・アクション

1. マイグレーション `doctor_availability_slots` 作成
2. `src/features/adm/high-stress-followup/types.ts` に型追加
3. `queries.ts`: `getDoctorAvailabilitySlots`, `getDoctorsForAvailability`
4. `actions.ts`: `createAvailabilitySlot`, `updateAvailabilitySlot`, `deleteAvailabilitySlot`
5. `utils.ts`: `isWithinAvailability`, `getAvailableSlotsForDate`

### Phase 2: 稼働日時保守画面

1. `DoctorAvailabilitySettings` コンポーネント作成
2. `HighStressFollowupClient` に「稼働日時」タブ追加
3. 週次スロット・特定日スロットの CRUD UI

### Phase 3: 予約制約の適用

1. `AppointmentModal`: 時間選択を稼働スロットに制限
2. `InterviewCalendar`: 稼働日なしの日を視覚的に区別
3. `createInterviewAppointment`: サーバー側で稼働検証を追加

### Phase 4（任意）: 稼働ブロック

- `doctor_availability_blocks` テーブル追加
- 休暇・会議等で特定時間帯をブロックする機能

---

## 7. 補足

### 7.1 複数産業医の扱い

- 予約時は **ログインユーザー（`user.employee_id`）** が `doctor_id` として記録される
- 稼働スロットは **doctor_id 単位** で管理
- 各産業医が自分の稼働日時を設定し、自分が予約する面談は自分の稼働内にのみ登録可能

### 7.2 スロット未設定時の挙動

- 稼働スロットが1件も登録されていない場合:
  - **案A（厳格）:** 予約不可。保守画面でスロットを登録するまで予約できない
  - **案B（緩和）:** 従来通り予約可能（後方互換）。稼働設定は任意
- **推奨:** 案A（厳格）。運用開始時に必ずスロットを登録する前提とする

### 7.3 面接時間の刻み

- 稼働スロット内で 30 分刻み（または 15 分刻み）の候補を生成する想定
- 1スロットあたりの最大予約数（同時予約の重複防止）は Phase 4 以降で検討

---

## 8. マイグレーション例（Phase 1）

```sql
-- doctor_availability_slots テーブル
CREATE TABLE IF NOT EXISTS public.doctor_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week smallint CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_type CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  ),
  CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_doctor_availability_slots_tenant_doctor
  ON public.doctor_availability_slots (tenant_id, doctor_id);

CREATE INDEX idx_doctor_availability_slots_doctor_specific
  ON public.doctor_availability_slots (doctor_id, specific_date)
  WHERE specific_date IS NOT NULL;

-- RLS, トリガー, コメント等は省略（本計画書の 2.1 に準拠）
```

---

以上が、産業医の稼働日時設定と面談予約制約の設計計画です。
