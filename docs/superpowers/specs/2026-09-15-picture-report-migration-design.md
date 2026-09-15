# 画像送信（写真レポート）機能移植 設計書

**作成日**: 2026-09-15
**ステータス**: 設計確定・実装計画待ち
**移植元**: `/home/hr-dx/ai-projects/dx-sensor`（`/send_picture`, `/send_picture_album`）
**移植先**: `hr-dx-saas` `src/app/(tenant)/(tenant-users)/(tool)/`

---

## 1. 背景・目的

dx-sensor（シングルテナントの個人プロジェクト）で先行実装済みの「画像送信」機能を、マルチテナントSaaSであるhr-dx-saasへ移植する。現場の従業員がスマートフォンのカメラで撮影した写真に件名・本文・優先度を添えて報告し、履歴をアルバムとして振り返れる機能。

プロダクトの2大ゴールとの関係：

- **コミュニケーションを大切にするシステム**：現場から上長への状況報告手段として機能する
- **組織健康度の可視化**：マネージャーが部門内の現場状況を写真ベースで把握できる

移植元は「本人のみが自分の投稿を閲覧・編集・削除できる」シングルテナント設計（`user_id = auth.uid()`のみで隔離）だが、hr-dx-saasでは以下の点を作り直す必要がある：

1. `tenant_id`によるテナント分離（RLS必須、CLAUDE.mdの絶対禁止事項）
2. マネージャーによる部下投稿の閲覧
3. データアクセス層を`queries.ts`/`actions.ts`に分離（Client Componentから直接Supabase呼び出しをしない規約への準拠）
4. サービスマスタ登録によるメニュー統合

## 2. 要件確定事項（壁打ちの結論）

| 項目                             | 決定内容                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 投稿の公開範囲                   | 本人 ＋ 同一`division_id`に所属する`is_manager=true`のマネージャー（部門階層は辿らない＝直属部門のみ） |
| 件名マスタの共有範囲             | 部門単位で共有（個人専用ではない）                                                                     |
| 件名マスタの編集権限             | `is_manager=true`のみ追加・編集・削除可。一般メンバーは選択のみ                                        |
| マネージャーの操作範囲           | 部下の投稿は閲覧のみ。編集・削除は不可（本人のみ）                                                     |
| メニュー統合                     | 正式にサービスマスタへ登録（`tenant_service`／`app_role_service`で制御）                               |
| サービス分類                     | `service_class`: 「勤退・タスク管理」／ `service_category`: 「勤退\|打刻」                             |
| ルーティング構成                 | 2画面構成を踏襲（送信画面／アルバム画面を別ルートのまま）                                              |
| マネージャー向け「部下の投稿」UI | アルバム画面内にタブ切替を追加（別ルートには分離しない）                                               |

## 3. ディレクトリ構成

```
src/app/(tenant)/(tenant-users)/(tool)/
  picture-report/
    page.tsx                    # 撮影・送信画面（旧 /send_picture）
    PictureReportForm.tsx       # クライアントコンポーネント（カメラ・音声入力・送信）
    SubjectManageModal.tsx      # 件名マスタ管理モーダル（is_managerのみ編集可）
    loading.tsx
    error.tsx
    album/
      page.tsx                  # 一覧画面（旧 /send_picture_album）
      AlbumView.tsx             # 「自分の投稿」⇄「部下の投稿」タブ切替
      loading.tsx
      error.tsx

src/features/picture-report/
  queries.ts                    # SELECT専用
  actions.ts                    # Server Actions（INSERT/UPDATE/DELETE）
  types.ts                      # ドメイン型

src/lib/capture/captureFrameFromVideo.ts   # dx-sensorから移植（カメラ傾き補正）
src/lib/speech/useSpeechToText.ts          # dx-sensorから移植（音声入力フック）
src/lib/picture-report/priority.ts         # dx-sensorのpriority.tsを移植・改名
```

`src/config/routes.ts`に以下を追加：

```ts
pictureReport: '/tool/picture-report',
pictureReportAlbum: '/tool/picture-report/album',
```

## 4. データモデル

### 4.1 マイグレーション方針

移植元マイグレーション（`0008_picture_sends.sql`, `0011_picture_sends_update.sql`, `0018_picture_sends_priority.sql`）の内容をhr-dx-saas向けに1本の新規マイグレーションとして書き直す（`CREATE TABLE IF NOT EXISTS`、`ON DELETE CASCADE`必須、絶対禁止事項に準拠）。

### 4.2 `picture_send_subjects`（件名マスタ・部門単位で共有）

```sql
CREATE TABLE IF NOT EXISTS public.picture_send_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (division_id, label)
);

ALTER TABLE public.picture_send_subjects ENABLE ROW LEVEL SECURITY;

-- 閲覧：自部門所属者なら誰でも
CREATE POLICY "picture_send_subjects_select_own_division" ON public.picture_send_subjects
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND division_id = (SELECT division_id FROM public.employees WHERE user_id = auth.uid())
  );

-- 変更：is_manager=trueかつ自部門のみ
CREATE POLICY "picture_send_subjects_write_manager_only" ON public.picture_send_subjects
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND division_id = (SELECT division_id FROM public.employees WHERE user_id = auth.uid())
    AND (SELECT is_manager FROM public.employees WHERE user_id = auth.uid()) = true
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND division_id = (SELECT division_id FROM public.employees WHERE user_id = auth.uid())
    AND (SELECT is_manager FROM public.employees WHERE user_id = auth.uid()) = true
  );
```

### 4.3 `picture_sends`（投稿レコード）

```sql
CREATE TABLE IF NOT EXISTS public.picture_sends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id  UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE, -- 投稿当時の所属部門（固定）
  user_email   TEXT NOT NULL,
  subject_id   UUID REFERENCES public.picture_send_subjects(id) ON DELETE SET NULL,
  subject_text TEXT NOT NULL,
  body_text    TEXT NOT NULL DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.picture_sends ENABLE ROW LEVEL SECURITY;

-- 閲覧：本人 or 同一部門のマネージャー
CREATE POLICY "picture_sends_select_own_or_manager" ON public.picture_sends
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR (
        division_id = (SELECT division_id FROM public.employees WHERE user_id = auth.uid())
        AND (SELECT is_manager FROM public.employees WHERE user_id = auth.uid()) = true
      )
    )
  );

-- 追加：本人のみ
CREATE POLICY "picture_sends_insert_own" ON public.picture_sends
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id() AND user_id = auth.uid()
  );

-- 本文更新・削除：本人のみ（マネージャーは閲覧のみ）
CREATE POLICY "picture_sends_update_own" ON public.picture_sends
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "picture_sends_delete_own" ON public.picture_sends
  FOR DELETE USING (user_id = auth.uid());
```

### 4.4 Storageバケット（`picture-sends`）

パス規約は`{user_id}/{yyyy-mm-dd}/{uuid}.jpg`のまま維持。SELECTポリシーのみ、マネージャー閲覧を許可するよう`EXISTS`条件で拡張する：

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('picture-sends', 'picture-sends', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

CREATE POLICY "picture_sends_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'picture-sends'
    AND (
      (storage.foldername(name))[1]::uuid = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.picture_sends ps
        WHERE ps.storage_path = name
          AND ps.division_id = (SELECT division_id FROM public.employees WHERE user_id = auth.uid())
          AND (SELECT is_manager FROM public.employees WHERE user_id = auth.uid()) = true
      )
    )
  );

CREATE POLICY "picture_sends_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'picture-sends' AND (storage.foldername(name))[1]::uuid = auth.uid()
  );

CREATE POLICY "picture_sends_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'picture-sends' AND (storage.foldername(name))[1]::uuid = auth.uid()
  );
```

## 5. データアクセス層

### 5.1 `src/features/picture-report/queries.ts`（SELECT専用、Server Component用）

- `getPictureSendSubjects()` — 自部門の件名マスタ一覧
- `getMyRecentSends(limit: number)` — 自分の直近送信（送信画面の「直近の送信」表示用）
- `getAlbumPage(params: { scope: 'own' | 'team'; offset: number; subjectFilter?: string; highOnly?: boolean })` — 一覧画面用。`scope: 'team'`は呼び出し元で`is_manager`を確認した上で使用する
- 署名付きURL（`createSignedUrl`）はServer Component側で発行し、Client Componentには署名済みURL文字列のみを渡す（dx-sensor版はClient側で発行していたが、hr-dx-saasの「useEffect + fetchによるクライアント側データ取得は避ける」規約に合わせて移す）

### 5.2 `src/features/picture-report/actions.ts`（Server Actions）

- `createSubject(label: string)` / `updateSubject(id: string, label: string)` / `deleteSubject(id: string)` — Server Action内で`is_manager`を確認し、`false`なら`Error('Unauthorized')`
- `sendPicture(formData: FormData)` — 画像ファイル・件名・本文・優先度を受け取り、Storageアップロード→`picture_sends` INSERTを1つのActionで実行（`next.config.ts`の`bodySizeLimit: "50mb"`で対応）
- `updateSendBody(id: string, bodyText: string)` — 本文編集（本人のみ、RLSでも二重に保護）
- `deleteSend(id: string)` — 削除（本人のみ）。Storage側のオブジェクト削除も同一Action内で実施

### 5.3 Client Componentに残る処理

ブラウザAPI依存のため以下はClient側に残す：

- カメラ制御（`getUserMedia`）、端末傾き検出（`deviceorientation`）→ `lib/capture/captureFrameFromVideo.ts`をほぼそのまま移植
- 音声入力（Web Speech API）→ `lib/speech/useSpeechToText.ts`をほぼそのまま移植
- 撮影プレビューのBlob管理

「送信」ボタン押下時に、撮影済みBlobを`FormData`へ詰めて`sendPicture` Server Actionを呼び出す形に変更する（dx-sensor版は`supabase.storage.upload` + `supabase.from().insert()`をClient側で直接実行していた）。

## 6. UI設計

### 6.1 送信画面（`picture-report/page.tsx` + `PictureReportForm.tsx`）

dx-sensor版の`SendPictureForm.tsx`をベースに、以下を変更：

- 件名選択：`getPictureSendSubjects()`（部門共有）の結果を使用
- 「ID登録」ボタン（`SubjectManageModal`起動）は`is_manager=true`のユーザーにのみ表示。一般ユーザーには件名選択のみ提供
- 送信処理を`sendPicture` Server Action呼び出しに変更

### 6.2 アルバム画面（`picture-report/album/page.tsx` + `AlbumView.tsx`）

dx-sensor版の`AlbumView.tsx`をベースに、以下を追加：

- `is_manager=true`のユーザーにのみ「自分の投稿」⇄「部下の投稿」のタブを表示（一般ユーザーには表示しない）
- 「部下の投稿」タブでは本文編集・削除ボタンを非表示（閲覧のみ）
- 既存のサムネイル／リスト表示切替、件名フィルタ、優先度「高のみ」フィルタはそのまま踏襲

## 7. メニュー登録（サービスマスタ）

`20260907033241_seed_task_management_service_master.sql`と同じ冪等パターンで新規マイグレーションを作成：

1. `service_class`「勤退・タスク管理」を名前で解決（無ければ新規作成）
2. `service_category`「勤退 | 打刻」を名前で解決（無ければ新規作成し`service_class_index`で紐付け）
3. `service`を2件登録（`route_path`の重複判定で冪等化）：
   - 「画像送信」→ `route_path: '/tool/picture-report'`、`target_audience: 'all_users'`
   - 「写真レポートホルダー」→ `route_path: '/tool/picture-report/album'`、`target_audience: 'all_users'`
4. `app_role_service`：全ロール（`employee`含む）に許可
5. `tenant_service`：既存の全契約テナントに対して有効化

## 8. エラーハンドリング

- カメラ権限拒否／非対応ブラウザ／デバイス未検出：dx-sensor版の日本語エラーメッセージをそのまま踏襲
- Server Action（アップロード・INSERT・UPDATE・DELETE）：`try/catch`で捕捉し、サーバー側は`console.error`で詳細ログ、クライアントには簡潔な日本語メッセージを返す
- `picture-report/`・`picture-report/album/`双方に`loading.tsx`・`error.tsx`を配置（CLAUDE.md規約準拠）

## 9. テスト方針

testing.mdの3種類必須ルールに準拠：

- **Unit**：`lib/picture-report/priority.ts`（優先度ラベル変換）、`lib/capture/captureFrameFromVideo.ts`の傾き補正ロジック（純粋関数部分）
- **Integration**：Server Actions（`sendPicture`／`createSubject`等）に対し、以下の境界をテストする
  - 本人以外による`picture_sends` INSERTの拒否
  - `is_manager=false`ユーザーによる`createSubject`/`updateSubject`/`deleteSubject`の拒否
  - 他部門ユーザーによるSELECT不可（テナント分離・部門分離の両方）
  - マネージャーによる部下投稿の本文編集・削除が拒否されること
- **E2E**：撮影→送信→アルバム表示の一連のフロー（Playwrightで`fakeUserMedia`フラグを使用）。マネージャーアカウントでのタブ切替と部下投稿閲覧の確認も含める

## 10. 移植元との差分まとめ

| 項目             | dx-sensor（移植元）                                           | hr-dx-saas（移植先）                                                                       |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| テナント分離     | なし（`auth.uid()`のみ）                                      | `tenant_id` + `current_tenant_id()`によるRLS                                               |
| 件名マスタ       | ユーザー個人専用                                              | 部門単位で共有、マネージャーのみ編集可                                                     |
| 投稿の可視範囲   | 本人のみ                                                      | 本人 + 同一部門マネージャー（閲覧のみ）                                                    |
| データアクセス   | Client Componentから直接Supabase呼び出し                      | `queries.ts`（Server Component）/ `actions.ts`（Server Actions）に分離                     |
| 認証コンテキスト | `getViewerContext()`（`auth.uid()` + `is_app_developer` RPC） | `getServerUser()`（`employees`+`app_role`+`tenants`のJOIN）                                |
| メニュー統合     | なし（URL直打ち）                                             | `service`/`service_category`/`service_class`/`tenant_service`/`app_role_service`に正式登録 |

## 11. オープンクエスチョン

なし（壁打ちにより全項目確定済み）。

## 12. 未移植・要確認事項（実装時に参照）

- dx-sensorの`SubjectManageModal.tsx`は「本人専用」前提のUIだったため、部門共有・マネージャー限定編集に合わせてProps・表示条件の作り直しが必要（実装計画フェーズで詳細化）
- `lib/speech/useSpeechToText.ts`のブラウザ互換性（Web Speech API）はdx-sensor版のまま踏襲し、追加調査は行わない
