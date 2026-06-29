# eラーニング機能 設計書（PRD）

> 社内教育コースを作成・割当し、従業員のスライド学習・受講進捗を管理する。
> 本ドキュメントは「4機能 運用レベルMVP化」（`~/.cursor/plans/complete-hr-four-features`）フェーズ4の正本記録。

---

## 問題定義

中小企業では教育コンテンツの作成負荷が高く、受講状況の把握も困難。
「割り当てたが誰が修了したか分からない」状態を解消する。

## プロダクト2大ゴールとの対応

- **組織健康度の可視化**：受講進捗・修了率を可視化し、教育施策の効果を測定する。
- **コミュニケーションを大切にするシステム**：振り返り・現場適用チェックリスト等で学びの定着を促す。

## ユーザーストーリー

- 人事として、コースを作成（手動 / 資料からAI生成）し、従業員に割り当てたい。
- 人事として、割当ごとの受講進捗率・修了状態を一覧で把握したい。
- 従業員として、割り当てられたコースをスライド形式で受講し、進捗が保存されてほしい。

---

## データモデル（既存テーブル）

| テーブル | 用途 |
| --- | --- |
| `el_courses` | コース（template / tenant、status: draft/published/archived） |
| `el_slides` | スライド（text / image / quiz 等） |
| `el_assignments` | 受講割り当て（course × employee、UNIQUE） |
| `el_progress` | スライド単位の受講進捗（status: not_started/in_progress/completed） |

## 配置（CLAUDE.md ルートグループ準拠）

```
src/app/(tenant)/(tenant-admin)/adm/(el)/el-courses/       # コース管理（一覧・詳細スライド編集）
src/app/(tenant)/(tenant-admin)/adm/(el)/el-assignments/   # 受講割り当て管理（進捗一覧）
src/app/(tenant)/(tenant-users)/.../el-courses/            # 従業員：マイコース・受講画面
src/features/e-learning/
├── queries.ts   # コース/スライド/割当/進捗取得・進捗集計（getAssignmentProgressMap）
├── actions.ts   # コース CRUD・割当・進捗記録・AI生成（generateCourseFromFile 等）
└── components/   # 一覧・受講ビューア・AIパネル 等
```

---

## MVP 実装範囲（本フェーズで完了）

1. **管理者の受講進捗 UI**：`getAssignmentProgressMap()` を追加（`el_progress(completed)` / コース総スライド数で
   進捗率算出）。`AssignmentListClient` に「進捗（バー＋完了数/総数）」「状態（未着手/受講中/修了）」列を追加。
2. **AiGeneratePanel の接続（デッドコード解消）**：コース一覧（自社コースタブ）に「AIで生成」ボタンを追加し、
   既存 actions（`generateCourseFromFile` / `saveAiGeneratedCourse`）に接続。生成後 `router.refresh()`。
3. **URL ハードコードの是正**：`CourseViewerClient` / `MyCourseListClient` / `CourseListClient` / `AssignmentListClient`
   の `/el-courses`・`/adm/el-courses` 等を `APP_ROUTES.TENANT.*` 経由へ統一。

## スコープ外（将来フェーズ）

- SCORM / xAPI 連携、修了証 PDF 発行、リマインドメール。
- 受講期限超過アラート・部署別集計ダッシュボード。

## 成功指標

- 割当に対する修了率・平均受講リードタイム。
- AI 生成コースの利用率（作成負荷の削減）。

## オープンクエスチョン

- AI 生成の入力ファイル種別・トークン上限・コストガードの方針。
