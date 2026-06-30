# EL-C2 SCORM / xAPI 実装計画（PRD）

> 参照: `implementation-plan-four-features-backlog.md`（EL-C2）
> 最終更新: 2026-06-30

## 1. 問題定義

既存 eラーニングは自社スライド形式（`native`）のみ。エンタープライズ顧客は **既存 SCORM 1.2 教材** や **xAPI 対応コンテンツ** の取り込みを求める。

## 2. スコープ（MVP）

| ID | 内容 | 方針 |
| --- | --- | --- |
| EL-C2a | SCORM 1.2 パッケージ受講 | ZIP アップロード → Storage 展開 → iframe + SCORM 1.2 API ブリッジ |
| EL-C2b | 修了同期 | `cmi.core.lesson_status` が completed/passed で `el_assignments.completed_at` 更新 |
| EL-C2c | xAPI（LRS ライト） | `el_xapi_statements` に記録。SCORM 修了時に completed ステートメント自動発行 |
| EL-C2d | xAPI 外部起動 | `xapi_launch` 形式で外部 URL を iframe 表示 |

**スコープ外:** SCORM 2004、外部 LRS 連携

## 3. 成功指標

- HR が SCORM ZIP をアップロードし、従業員が iframe で受講できる
- SCORM 修了で割当が `completed_at` 付与される
- 修了時に xAPI ステートメントがテナント内 LRS に残る
