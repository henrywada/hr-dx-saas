# 対象者テーブル（program_targets）設計書

## 1. 概要

ストレスチェック、パルスサーベイ、アンケート、eラーニングなど、従業員が実施対象かどうかを判別するための**汎用対象者テーブル**を設計する。

## 2. 現状の整理

| プログラム種別 | 実施枠の親テーブル | 対象者の管理方法 |
|---------------|-------------------|------------------|
| ストレスチェック | `stress_check_periods` | `stress_check_submissions`（period_id + employee_id で受検枠を表現） |
| パルスサーベイ | `pulse_survey_periods` | 対象者テーブルなし（全従業員想定？） |
| アンケート | なし（`survey_questions` のみ） | 対象者テーブルなし |
| eラーニング | なし | 未実装 |

## 3. 設計方針

- **汎用性**: 複数プログラムで共通利用できる1つのテーブル
- **期間・実施枠単位**: 各プログラムの「実施枠」（期間・キャンペーン・コース）ごとに対象者を管理
- **明示的対象者リスト**: 判定結果（対象/除外）を保存し、クエリで高速に「対象か否か」を判別
- **除外理由の記録**: 対象外の場合、理由を保存可能（監査・説明用）

## 4. テーブル定義

### 4.1 program_targets（対象者マスタ）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 主キー |
| tenant_id | uuid | NOT NULL, FK→tenants | テナント |
| program_type | text | NOT NULL, CHECK | プログラム種別 |
| program_instance_id | uuid | NOT NULL | 実施枠ID（種別ごとに参照先が異なる） |
| employee_id | uuid | NOT NULL, FK→employees | 従業員 |
| is_eligible | boolean | NOT NULL, DEFAULT true | 対象=true, 除外=false |
| exclusion_reason | text | | 除外理由（任意） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新日時 |

**ユニーク制約**: `(program_type, program_instance_id, employee_id)`

**program_type の値**:
- `stress_check` → program_instance_id = `stress_check_periods.id`
- `pulse_survey` → program_instance_id = `pulse_survey_periods.id`
- `survey` → program_instance_id = `survey_campaigns.id`（後述の新規テーブル）
- `e_learning` → program_instance_id = `e_learning_courses.id`（後述の新規テーブル）

### 4.2 補足テーブル（将来拡張用）

アンケート・eラーニングで「実施枠」の概念が必要な場合、以下を追加する。

#### survey_campaigns（アンケート実施枠）※将来

| カラム | 説明 |
|--------|------|
| id | 主キー |
| tenant_id | テナント |
| title | アンケートタイトル |
| description | 説明 |
| start_date, end_date | 実施期間 |
| question_ids | 含まれる質問（JSONB または中間テーブル） |

#### e_learning_courses（eラーニングコース）※将来

| カラム | 説明 |
|--------|------|
| id | 主キー |
| tenant_id | テナント |
| title | コース名 |
| description | 説明 |
| start_date, end_date | 受講期間 |

## 5. 利用パターン

### 5.1 対象者判定クエリ

```sql
-- 従業員Aがストレスチェック期間Xの対象かどうか
SELECT is_eligible
FROM program_targets
WHERE program_type = 'stress_check'
  AND program_instance_id = :period_id
  AND employee_id = :employee_id
  AND tenant_id = :tenant_id;
```

### 5.2 対象者一覧取得

```sql
-- ストレスチェック期間Xの対象者一覧
SELECT pt.*, e.name, e.employee_no, d.name AS division_name
FROM program_targets pt
JOIN employees e ON e.id = pt.employee_id
LEFT JOIN divisions d ON d.id = e.division_id
WHERE pt.program_type = 'stress_check'
  AND pt.program_instance_id = :period_id
  AND pt.is_eligible = true
  AND pt.tenant_id = :tenant_id;
```

### 5.3 対象者一括登録（同期）

人事が「対象者を確定」した後、以下を実行:
1. 条件（部署・雇用形態・入社日等）に基づき対象者を算出
2. `program_targets` に INSERT（既存は上書きまたはスキップ）
3. ストレスチェックの場合: `stress_check_submissions` に受検枠を作成

## 6. 既存テーブルとの関係

### stress_check_submissions との連携

- **現状**: `stress_check_submissions` にレコードがある = 対象者かつ受検枠が存在
- **移行後**: `program_targets` で対象者を管理し、対象者に対して `stress_check_submissions` を作成する流れに統一
- **互換性**: 既存の `stress_check_submissions` はそのまま利用可能。新規期間から `program_targets` を併用

### service_assignments との違い

| 項目 | service_assignments | program_targets |
|------|---------------------|-----------------|
| 粒度 | サービス種別単位（期間なし） | 実施枠単位（期間・キャンペーンごと） |
| 用途 | システムアクセス権・メニュー表示 | ストレスチェック等の実施対象者 |
| 例 | 「パルスサーベイにアクセス可能なユーザー」 | 「2026年度ストレスチェックの対象者」 |

両者は用途が異なるため、併存する。

## 7. 対象者判定の典型的条件（参考）

### 7.1 共通除外ルール（必須）

**`app_role = 'company_doctor'` の従業員は常に対象者外**とする。同期・手動追加・選択肢一覧のいずれにおいても対象に含めない。

### 7.2 プログラム種別ごとの条件

| プログラム | 典型的条件 |
|-----------|------------|
| ストレスチェック | 労働安全衛生法: 常時使用労働者（正社員・契約社員等）、施行日時点で在籍、産業医（company_doctor）は除外 |
| パルスサーベイ | 全従業員 or 特定部署、入社N日以降（company_doctor 除外） |
| アンケート | 実施ごとに任意設定（全社/特定部署/特定属性） |
| eラーニング | コースごとに任意設定、必修/任意の区別 |

※ これらの条件はアプリケーション層で実装し、判定結果を `program_targets` に保存する。

## 8. RLS ポリシー

- 全操作で `tenant_id = current_tenant_id()` を必須
- SELECT: 人事・産業医・本人（自分のレコードのみ）に許可
- INSERT/UPDATE/DELETE: 人事・産業医に許可
