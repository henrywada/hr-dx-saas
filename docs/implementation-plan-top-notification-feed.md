# /top 通知フィード（お知らせパネルのパーソナライズ化）

## 問題定義

`/top` の「お知らせ」パネルは、`announcements` テーブルの一覧表示と、相談・Kudos・アンケート・ライフサイクルの4種類の pending 通知コンポーネントをハードコードで並べただけの実装であり、以下の課題がある。

- 通知ソースを追加するたびに `page.tsx` を直接改修する必要があり拡張性が低い
- 各ドメイン（eラーニング・1on1・キャリア面談・健診・残業36協定）に既に「未回答／未実施／期限接近」を判定する関数が実装済みだが、`/top` に接続されているのは一部のみ
- `announcements` テーブルの RLS に既存の抜け穴（個人宛お知らせの閲覧範囲、書き込み権限）がある
- `tenant_service` 契約制御が一部の通知要素で機能していない（`service_id` 未設定）

## ユーザーストーリー

- 従業員として、健診結果の到着・面談日の接近・36協定超過などの「システムからの通知」を `/top` で一目で把握したい
- 従業員として、ストレスチェックやeラーニングなど「今やるべきアクション」への導線を `/top` から得たい
- 人事担当者として、全社／個人宛のお知らせを配信でき、意図しない相手に情報が漏れないことを期待する

## 要求優先度

プロダクトの2大ゴール（コミュニケーション促進／組織健康度の可視化）に直結するため優先度高。Phase 1（骨格＋既存通知の移行＋RLS修正）は単独リリース可能な最小スコープとして先行実装する。

## データモデル案

- 新設: `public.dashboard_feed_read_state`（既読状態、`employee_id` + `dedupe_key` で一意）
- 既存 `announcements` の RLS を修正（個人宛の閲覧範囲限定、書き込みロール制限）
- 新設: `public.post_system_announcement()`（SECURITY DEFINER RPC。ドメインからの個人宛システム通知専用）
- 新規テーブルは作らず、既存ドメインテーブル（`closure_warnings`, `health_check_records` 等）からのライブ導出に統一（詳細は plan ファイル参照）

## 配置ルール

- `src/features/dashboard/feed/`（types, provider, registry, sort, queries, actions, badge）
- 各ドメインに `feed-provider.ts` を追加（`features/consultation/`, `features/recognition/`, `features/questionnaire/`, `features/lifecycle/`, `features/dashboard/`）
- `page.tsx` は `getTopFeedItems()` 呼び出し1本に統合

## マスタ登録

- `ui_dashboard_element`: `top.section.announcements` → `top.section.feed` へリネーム（`id` 参照のため安全）、`top.notice.*` → `top.feed.*` へリネーム、`top.feed.hr_announcement` を新規追加
- `service_id` バックフィル: `top.feed.consultation`(`/consultation`), `top.feed.kudos`(`/kudos`), `top.feed.questionnaire`(`/answers`)

## 成功指標

- `/top` 表示時に契約外テナントへ通知が漏れないこと（`tenant_service` 整合性の回帰なし）
- 1プロバイダの障害がパネル全体を落とさないこと（`Promise.allSettled` による graceful degradation）
- 新規通知ソース追加が `registry.ts` への1行追加で完結すること

## オープンクエスチョン

詳細な設計判断・オープンクエスチョンは `~/.claude/plans/top-2026-08-01-e-woolly-balloon.md`（実装完了後に削除予定のplanファイル）に記録済み。本PRDはその内容の要約であり、詳細な型定義・マイグレーションSQL案はコード自体を正とする。
