# LINE連携（既存従業員の友だち紐付け + LIFF自動ログイン）

**ステータス:** 設計承認済み（2026-09-15） / **移植元:** `dx-sensor` の LINE 基盤・友だち招待  
**詳細設計:** `docs/superpowers/specs/2026-09-15-line-integration-design.md`  
**実装計画:** `docs/superpowers/plans/2026-09-15-line-integration.md`

---

## 1. 問題定義

hr-dx-saas の従業員はメール＋パスワードでログインする。現場では LINE が日常の連絡手段であり、毎回 PC ログインを要求すると到達率が落ちる。`dx-sensor` には共用公式アカウント・友だち招待・LIFF 自動ログインが既にある。これを `employees` / Server Action / 既存 SMTP に読み替えて移植し、人事が既存従業員を LINE に紐付け、以降はリッチメニューから `/top` を開けるようにする。

Push 通知・テナント別公式アカウント・LINE からの新規ユーザー作成は対象外。土台（紐付けと自動ログイン）だけを入れる。

## 2. ユーザーストーリー

| #   | 役割           | ストーリー                                                                |
| --- | -------------- | ------------------------------------------------------------------------- |
| 1   | テナント管理者 | まだ LINE 未連携の従業員を選んで招待メールを送りたい                      |
| 2   | 従業員         | メールのリンクを開き、QR を LINE で読み取って自分のアカウントと紐付けたい |
| 3   | 従業員         | 一度紐付けたら、リッチメニューからパスワード無しで `/top` を開きたい      |
| 4   | SaaS管理者     | 共用公式アカウントの接続状態と、全テナントの連携件数を確認したい          |

## 3. 要求と優先度

| 優先度 | 要求                                                      | 備考                                       |
| ------ | --------------------------------------------------------- | ------------------------------------------ |
| Must   | `line_friends` / `line_friend_invites` + RLS              | テナント隔離。書き込みは Webhook/LIFF のみ |
| Must   | テナント管理者の招待メール（既存 `sendMail`）             | Resend は使わない                          |
| Must   | 公開 QR `/p/line-friend-invite/[token]`                   | 認証不要                                   |
| Must   | LIFF `/liff/entry` → セッション → `/top`                  | 権限分岐しない                             |
| Must   | Webhook follow/unfollow                                   | 署名検証。ペイロードはログしない           |
| Must   | 1 LINE = 1人、別人への付け替え禁止                        | `line_user_id` UNIQUE                      |
| Should | SaaS 管理画面 `/saas_adm/line`                            | 環境変数の有無と件数。値は出さない         |
| Should | リッチメニュー CLI                                        | 画面からは実行しない                       |
| Won't  | LINE 新規アカウント作成 / 自己連携 / Push / テナント別 OA |                                            |

## 4. データモデル

- `line_friends`: `line_user_id` UNIQUE、`tenant_id` / `employee_id` / `user_id` は紐付け後、`status` は `unlinked` / `linked` / `blocked`
- `line_friend_invites`: `tenant_id` + `employee_id`、トークン 72 時間、`used_at` は原子的更新
- RLS: `current_tenant_id()` / `current_employee_app_role()`。`line_friends` の authenticated は SELECT のみ

詳細カラムは設計書 4 節。

## 5. 配置ルール

| 対象                    | 配置                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| テナント管理者          | `src/app/(tenant)/(tenant-admin)/adm/(base_mnt)/line-friend-invites/`            |
| SaaS管理者              | `src/app/(saas-admin)/saas_adm/line/`                                            |
| 公開 QR                 | `src/app/p/line-friend-invite/[token]/`                                          |
| LIFF                    | `src/app/liff/`（ルートグループ外。ログインガードを通さない）                    |
| LINE Webhook / LIFF API | `src/app/api/line/`                                                              |
| 読み書き分離            | `features/line/queries.ts` / `actions.ts`。actions で `createAdminClient()` 禁止 |

## 6. マスタ登録

- `service`: `/adm/line-friend-invites`（`target_audience='adm'`、カテゴリは `/adm/settings` の兄弟）
- `service`: `/saas_adm/line`（`target_audience='saas_adm'`、カテゴリは `/saas_adm/hr-law-knowledge` の兄弟）
- `tenant_service`: `/adm/settings` が有効なテナントへ割当
- `app_role_service` はテナント管理者向けに登録しない（未登録＝管理者役割では制限なし、既存 grant-notifier と同じ）

## 7. 成功指標

- 管理者が未連携従業員へ招待メールを送れる（ローカルは Inbucket）
- QR から紐付けが完了し、`line_friends.status='linked'`
- `/liff/entry` から `/top` に入れる
- 別人に紐付いた LINE での QR は拒否される
- `npm test` の LINE 単体テストが通る
- `npm run type-check` が通る

## 8. オープンクエスチョン

なし（brainstorming で範囲・OA 共用・遷移先・招待起点を確定済み）。LINE Developers コンソール（Webhook URL / LIFF エンドポイント / Add friend option）はコード外の運用作業。
