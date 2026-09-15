# 画像送信（写真レポート）機能移植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dx-sensor（`/home/hr-dx/ai-projects/dx-sensor`）の画像送信機能（`/send_picture`, `/send_picture_album`）を、hr-dx-saasの`src/app/(tenant)/(tenant-users)/(tool)/picture-report/`配下へ、テナント分離・部門共有の件名マスタ・マネージャー閲覧権限に対応させて移植する。

**Architecture:** 2画面構成（送信画面・アルバム画面）を踏襲しつつ、dx-sensor版がClient Componentから直接Supabaseを呼んでいた処理を`src/features/picture-report/`の`queries.ts`（Server Component用SELECT）・`actions.ts`（Server Actions）に分離する。DBは新規2テーブル（`picture_send_subjects`, `picture_sends`）+ Storageバケット（`picture-sends`）を`tenant_id`・`division_id`ベースのRLSで保護する。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript / Supabase (PostgreSQL + RLS + Storage) / Zod v4 / lucide-react / Web Speech API / MediaDevices API

**Spec:** `docs/superpowers/specs/2026-09-15-picture-report-migration-design.md`

## Global Constraints

- 新規テーブルは`CREATE TABLE IF NOT EXISTS`、外部キーは`ON DELETE CASCADE`を必須とする（CLAUDE.md絶対禁止事項）
- 新規テーブルには必ずRLSポリシーを設定する（CLAUDE.md絶対禁止事項）
- `page.tsx`内で`supabase.from(...)`を直接呼ばない。SELECTは`queries.ts`、INSERT/UPDATE/DELETEは`actions.ts`のServer Actionsに集約する
- `app/api/`は使わない。外部連携なしのためServer Actionsのみで完結させる
- URLはハードコードせず`APP_ROUTES`定数を使う
- コードコメントは日本語で記述する
- テストは`node --import tsx --test "src/**/*.test.ts"`で実行される（vitest/jestではない）。既存の`src/features/internal-events/actions.test.ts`と同じ流儀で`node:assert/strict` + `node:test`を使う
- 本リポジトリには現状Playwright等のE2E基盤が存在しないため、本計画のE2E検証は「ローカルSupabase + `npm run dev`での手動確認手順」として記述する（新規にE2E基盤を構築することはスコープ外・YAGNI）
- Supabaseへの日時書き込みは`Asia/Tokyo`タイムゾーンで行う
- データ取得が発生するルートには`loading.tsx`と`error.tsx`を配置する
- マイグレーション適用は`supabase migration up`を使う（`supabase db reset`は絶対に使わない）

---

## File Structure

```
supabase/migrations/
  20260915180000_create_picture_report.sql          # テーブル・RLS・Storage
  20260915180100_seed_picture_report_service_master.sql  # サービスマスタ登録

src/lib/picture-report/
  priority.ts                # 優先度定義・ラベル変換（dx-sensor priority.ts移植）
  priority.test.ts
  captureFrameFromVideo.ts   # カメラ傾き補正ロジック（dx-sensor移植）
  captureFrameFromVideo.test.ts
  useSpeechToText.ts         # 音声入力フック（dx-sensor移植、ほぼ無改変）

src/features/picture-report/
  types.ts                   # ドメイン型・Zodスキーマ
  queries.ts                 # SELECT専用（Server Component用）
  actions.ts                 # Server Actions（INSERT/UPDATE/DELETE）
  actions.test.ts            # Zodスキーマの単体テスト

src/config/routes.ts         # pictureReport ルート追加（既存ファイルを修正）

src/app/(tenant)/(tenant-users)/(tool)/picture-report/
  page.tsx
  PictureReportForm.tsx
  SubjectManageModal.tsx
  loading.tsx
  error.tsx
  album/
    page.tsx
    AlbumView.tsx
    loading.tsx
    error.tsx
```

---

## Task 1: DBマイグレーション（テーブル・RLS・Storage）

**Files:**

- Create: `supabase/migrations/20260915180000_create_picture_report.sql`

**Interfaces:**

- Produces: テーブル`public.picture_send_subjects`（列: `id, tenant_id, division_id, label, created_by, created_at, updated_at`）、`public.picture_sends`（列: `id, tenant_id, user_id, division_id, user_email, subject_id, subject_text, body_text, priority, storage_path, created_at`）、Storageバケット`picture-sends`、ヘルパー関数`public.current_employee_division_id()`・`public.current_employee_is_manager()`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 20260915180000_create_picture_report.sql
--
-- 画像送信（写真レポート）機能: 現場から撮影した写真に件名・本文・優先度を
-- 添えて送信し、履歴をアルバムとして振り返れる機能。
-- 移植元: dx-sensor（シングルテナント版）の picture_send_subjects / picture_sends。
-- hr-dx-saas向けに tenant_id によるテナント分離、division_id による部門共有・
-- マネージャー閲覧権限を追加する。
-- 参照: docs/superpowers/specs/2026-09-15-picture-report-migration-design.md

-- ============================================================
-- 0. ヘルパー関数（current_tenant_id() と同じ SECURITY DEFINER パターン）
-- ============================================================
-- employees 自身の RLS への再帰を避けるため SECURITY DEFINER にする。
-- STABLE なのでプランナが同一トランザクション内の結果をキャッシュできる。

CREATE OR REPLACE FUNCTION public.current_employee_division_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.division_id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_employee_is_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(e.is_manager, false)
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- 1. picture_send_subjects（件名マスタ・部門単位で共有）
-- ============================================================

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

COMMENT ON TABLE public.picture_send_subjects IS
  '画像送信で繰り返し使う件名マスタ。部門単位で共有し、マネージャーのみ編集できる。';

ALTER TABLE public.picture_send_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picture_send_subjects_select_own_division" ON public.picture_send_subjects
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
  );

CREATE POLICY "picture_send_subjects_write_manager_only" ON public.picture_send_subjects
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
    AND public.current_employee_is_manager()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND division_id = public.current_employee_division_id()
    AND public.current_employee_is_manager()
  );

CREATE INDEX IF NOT EXISTS picture_send_subjects_division_idx
  ON public.picture_send_subjects (division_id, label);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.picture_send_subjects TO authenticated;

-- ============================================================
-- 2. picture_sends（投稿レコード）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.picture_sends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id  UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  user_email   TEXT NOT NULL,
  subject_id   UUID REFERENCES public.picture_send_subjects(id) ON DELETE SET NULL,
  subject_text TEXT NOT NULL,
  body_text    TEXT NOT NULL DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.picture_sends IS
  '画像送信の記録。division_id は投稿当時の所属部門を固定で保存する（異動後もマネージャー閲覧範囲は投稿当時の部門で判定する）。';

ALTER TABLE public.picture_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picture_sends_select_own_or_manager" ON public.picture_sends
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR (
        division_id = public.current_employee_division_id()
        AND public.current_employee_is_manager()
      )
    )
  );

CREATE POLICY "picture_sends_insert_own" ON public.picture_sends
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id() AND user_id = auth.uid()
  );

CREATE POLICY "picture_sends_update_own" ON public.picture_sends
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "picture_sends_delete_own" ON public.picture_sends
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS picture_sends_user_created_idx
  ON public.picture_sends (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS picture_sends_division_created_idx
  ON public.picture_sends (division_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.picture_sends TO authenticated;

-- ============================================================
-- 3. Storage バケット + RLS
-- ============================================================
-- パス規約 {user_id}/{yyyy-mm-dd}/{uuid}.jpg は dx-sensor版を踏襲。
-- SELECT のみ、同一部門のマネージャーが picture_sends 経由で閲覧できるよう拡張する。

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'picture-sends', 'picture-sends', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "picture_sends_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'picture-sends'
    AND (
      (storage.foldername(name))[1]::uuid = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.picture_sends ps
        WHERE ps.storage_path = name
          AND ps.division_id = public.current_employee_division_id()
          AND public.current_employee_is_manager()
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

- [ ] **Step 2: ローカルSupabaseへ適用する**

```bash
supabase migration up
```

Expected: `20260915180000_create_picture_report.sql`が正常に適用される（エラーなし）

- [ ] **Step 3: Studioで手動確認する（RLS境界の検証）**

`http://127.0.0.1:55423`のSQL Editorで以下を実行し、期待通りの結果になることを確認する（`テナント管理者/一般ユーザーとしてログインしたセッションで実行する、もしくは`set local role`とJWTクレームを模擬する）：

```sql
-- テーブル・ポリシーが作成されていることを確認
select tablename, policyname from pg_policies where tablename in ('picture_sends', 'picture_send_subjects');
```

Expected: `picture_sends`に4件（select/insert/update/delete）、`picture_send_subjects`に2件（select/write）のポリシー行が返る

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260915180000_create_picture_report.sql
git commit -m "feat(picture-report): 画像送信機能のテーブル・RLS・Storageバケットを追加"
```

---

## Task 2: サービスマスタ登録マイグレーション

**Files:**

- Create: `supabase/migrations/20260915180100_seed_picture_report_service_master.sql`

**Interfaces:**

- Consumes: Task 1で作成された`public.tenants`（既存）
- Produces: `service_class`「勤退・タスク管理」、`service_category`「勤退｜打刻」、`service`2件（route_path: `/tool/picture-report`, `/tool/picture-report/album`）

- [ ] **Step 1: マイグレーションファイルを作成する**

`20260907033241_seed_task_management_service_master.sql`と同じ冪等パターンを踏襲する。

```sql
-- 20260915180100_seed_picture_report_service_master.sql
--
-- 画像送信（写真レポート）機能のメニュー表示用マスタ登録。
-- 参照した既存パターン: 20260907033241_seed_task_management_service_master.sql
--
-- service_class「勤退・タスク管理」、service_category「勤退｜打刻」を
-- 名前で解決し、無ければ新規作成する（冪等）。target_audience は
-- 'all_users' とし、一般従業員も画像送信できるようにする
-- （マネージャー限定の操作は app_role ではなく employees.is_manager で
-- 画面内分岐するため、app_role_service は全ロールに許可する）。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_send_service_id uuid;
  v_album_service_id uuid;
BEGIN
  -- service_class「勤退・タスク管理」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_class_id FROM public.service_class WHERE name = '勤退・タスク管理' ORDER BY sort_order ASC LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, sort_order, name)
    VALUES (gen_random_uuid(), 90, '勤退・タスク管理')
    RETURNING id INTO v_class_id;
  END IF;

  -- service_category「勤退｜打刻」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_category_id FROM public.service_category WHERE name = '勤退｜打刻' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 830, '勤退｜打刻')
    RETURNING id INTO v_category_id;
  END IF;

  -- service_class_index への紐付け（無ければ作成、冪等）
  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_category_id
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_category_id);
  END IF;

  -- service「画像送信」（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/picture-report') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '画像送信', '', '画像送信',
      '現場で撮影した写真に件名・本文・優先度を添えて報告できます。',
      100, '/tool/picture-report', 'all_users', '公開'
    )
    RETURNING id INTO v_send_service_id;
  ELSE
    SELECT id INTO v_send_service_id FROM public.service WHERE trim(route_path) = '/tool/picture-report';
  END IF;

  -- service「写真レポートホルダー」（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/picture-report/album') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '写真レポートホルダー', '', '写真レポートホルダー',
      '送信した写真の履歴を一覧で確認できます。マネージャーは部下の投稿も閲覧できます。',
      110, '/tool/picture-report/album', 'all_users', '公開'
    )
    RETURNING id INTO v_album_service_id;
  ELSE
    SELECT id INTO v_album_service_id FROM public.service WHERE trim(route_path) = '/tool/picture-report/album';
  END IF;

  -- app_role_service：全ロールに対して許可する（employee を含む）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, s.id
  FROM public.app_role ar
  CROSS JOIN (SELECT v_send_service_id AS id UNION ALL SELECT v_album_service_id) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
  );

  -- tenant_service：既存の全契約テナントに対して機能を有効化する
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, s.id
  FROM public.tenants t
  CROSS JOIN (SELECT v_send_service_id AS id UNION ALL SELECT v_album_service_id) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = s.id
  );
END $$;
```

- [ ] **Step 2: ローカルSupabaseへ適用する**

```bash
supabase migration up
```

Expected: エラーなく適用される

- [ ] **Step 3: 再実行しても冪等であることを確認する**

```bash
supabase migration up
```

Expected: 2回目の実行でも重複行が増えない（`NOT EXISTS`ガードが効いている）

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260915180100_seed_picture_report_service_master.sql
git commit -m "feat(picture-report): サービスマスタへ画像送信・写真レポートホルダーを登録"
```

---

## Task 3: 優先度ロジックの移植（`lib/picture-report/priority.ts`）

**Files:**

- Create: `src/lib/picture-report/priority.ts`
- Test: `src/lib/picture-report/priority.test.ts`

**Interfaces:**

- Produces: `PICTURE_PRIORITIES`, `PicturePriority`型, `DEFAULT_PICTURE_PRIORITY`, `PICTURE_PRIORITY_LABELS`, `isPicturePriority(value: unknown): value is PicturePriority`, `picturePriorityLabel(value: unknown): string`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/lib/picture-report/priority.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { isPicturePriority, picturePriorityLabel, DEFAULT_PICTURE_PRIORITY } from './priority'

test('high/medium/lowはPicturePriorityと判定される', () => {
  assert.equal(isPicturePriority('high'), true)
  assert.equal(isPicturePriority('medium'), true)
  assert.equal(isPicturePriority('low'), true)
})

test('不正な値はPicturePriorityと判定されない', () => {
  assert.equal(isPicturePriority('urgent'), false)
  assert.equal(isPicturePriority(123), false)
  assert.equal(isPicturePriority(null), false)
})

test('高はラベル「高」に変換される', () => {
  assert.equal(picturePriorityLabel('high'), '高')
})

test('不正な値はデフォルト優先度のラベルにフォールバックする', () => {
  assert.equal(picturePriorityLabel('unknown'), picturePriorityLabel(DEFAULT_PICTURE_PRIORITY))
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/lib/picture-report/priority.test.ts`
Expected: FAIL（`priority.ts`が存在しないためモジュール解決エラー）

- [ ] **Step 3: 実装する（dx-sensorの`lib/picture-sends/priority.ts`を移植）**

```typescript
// src/lib/picture-report/priority.ts
export const PICTURE_PRIORITIES = ['high', 'medium', 'low'] as const

export type PicturePriority = (typeof PICTURE_PRIORITIES)[number]

export const DEFAULT_PICTURE_PRIORITY: PicturePriority = 'medium'

export const PICTURE_PRIORITY_LABELS: Record<PicturePriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export function isPicturePriority(value: unknown): value is PicturePriority {
  return typeof value === 'string' && (PICTURE_PRIORITIES as readonly string[]).includes(value)
}

export function picturePriorityLabel(value: unknown): string {
  return isPicturePriority(value)
    ? PICTURE_PRIORITY_LABELS[value]
    : PICTURE_PRIORITY_LABELS[DEFAULT_PICTURE_PRIORITY]
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --import tsx --test src/lib/picture-report/priority.test.ts`
Expected: PASS（4件全て成功）

- [ ] **Step 5: コミット**

```bash
git add src/lib/picture-report/priority.ts src/lib/picture-report/priority.test.ts
git commit -m "feat(picture-report): 優先度ロジックをdx-sensorから移植"
```

---

## Task 4: カメラ傾き補正ロジックの移植（`lib/picture-report/captureFrameFromVideo.ts`）

**Files:**

- Create: `src/lib/picture-report/captureFrameFromVideo.ts`
- Test: `src/lib/picture-report/captureFrameFromVideo.test.ts`

**Interfaces:**

- Produces: `MountOrientation`型, `mountFromDeviceTilt(gamma, beta): MountOrientation | null`, `applyTiltReading(reading, landscapeStreak, current): { tilt, landscapeStreak }`, `computeCaptureRotationDeg(...)`, `captureFrameFromVideo(video, mount, invertDirection?, screenAngle?): HTMLCanvasElement`, `captureHandheldFrame(video, deviceTiltMount?): HTMLCanvasElement`, `previewAspectClass(mount?): string`

- [ ] **Step 1: 失敗するテストを書く（純粋関数部分のみ。`HTMLCanvasElement`等DOM依存部分はE2Eで手動確認する）**

```typescript
// src/lib/picture-report/captureFrameFromVideo.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mountFromDeviceTilt,
  applyTiltReading,
  computeCaptureRotationDeg,
} from './captureFrameFromVideo'

test('gammaが45度以上なら横向きと判定される', () => {
  assert.equal(mountFromDeviceTilt(50, 0), 'landscape')
})

test('gammaが45度未満なら縦向きと判定される', () => {
  assert.equal(mountFromDeviceTilt(10, 0), 'portrait')
})

test('gammaがnullなら判定不能でnullを返す', () => {
  assert.equal(mountFromDeviceTilt(null, 0), null)
})

test('betaもgammaも小さい（端末が水平に近い）場合はnullを返す', () => {
  assert.equal(mountFromDeviceTilt(10, 10), null)
})

test('portraitの読み取りは即座に反映される', () => {
  const result = applyTiltReading('portrait', 0, 'landscape')
  assert.deepEqual(result, { tilt: 'portrait', landscapeStreak: 0 })
})

test('landscapeは連続2回読み取るまで確定しない', () => {
  const first = applyTiltReading('landscape', 0, null)
  assert.deepEqual(first, { tilt: null, landscapeStreak: 1 })
  const second = applyTiltReading('landscape', first.landscapeStreak, first.tilt)
  assert.deepEqual(second, { tilt: 'landscape', landscapeStreak: 2 })
})

test('横向き・横長ストリームでは回転不要', () => {
  assert.equal(computeCaptureRotationDeg('landscape', 1920, 1080, 0), 0)
})

test('横向き・縦長ストリーム・画面角度0では270度回転する', () => {
  assert.equal(computeCaptureRotationDeg('landscape', 1080, 1920, 0), 270)
})

test('縦横比・画面幅が0の場合は回転0を返す', () => {
  assert.equal(computeCaptureRotationDeg('portrait', 0, 0, 0), 0)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/lib/picture-report/captureFrameFromVideo.test.ts`
Expected: FAIL（モジュールが存在しない）

- [ ] **Step 3: 実装する（dx-sensorの`lib/capture/captureFrameFromVideo.ts`をそのまま移植）**

```typescript
// src/lib/picture-report/captureFrameFromVideo.ts
export type MountOrientation = 'portrait' | 'landscape'

/** 保存時に適用する時計回りの回転角度 */
export type CaptureRotationDeg = 0 | 90 | 180 | 270

/** 手持ち横向きは、スマホを左に90度傾けている前提（縦向きから反時計回り） */
export const LANDSCAPE_LEFT_TILT_SCREEN_ANGLE = 270

export function readScreenAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation?.angle != null) {
    return screen.orientation.angle
  }
  if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
    return window.orientation
  }
  return 0
}

export function detectHandheldMount(
  screenAngle: number,
  viewportIsLandscape: boolean
): MountOrientation {
  const normalized = ((screenAngle % 360) + 360) % 360
  if (normalized === 90 || normalized === 270) return 'landscape'
  return viewportIsLandscape ? 'landscape' : 'portrait'
}

/** |gamma|がこの値（度）を超えたら端末が横向きに寝ていると判定する */
const LANDSCAPE_GAMMA_DEG = 45

/**
 * DeviceOrientationによる物理的な傾き判定（画面回転ロックの影響を受けない）。
 * 読み取り値がない、または端末がほぼ水平な場合はnullを返す。
 */
export function mountFromDeviceTilt(
  gamma: number | null | undefined,
  beta?: number | null
): MountOrientation | null {
  if (gamma == null || Number.isNaN(gamma)) return null
  if (beta != null && !Number.isNaN(beta) && Math.abs(beta) < 20 && Math.abs(gamma) < 20) {
    return null
  }
  return Math.abs(gamma) >= LANDSCAPE_GAMMA_DEG ? 'landscape' : 'portrait'
}

export function resolveHandheldMount(input: {
  screenAngle: number
  viewportIsLandscape: boolean
  screenOrientationType?: string
  deviceTiltMount?: MountOrientation | null
}): MountOrientation {
  if (input.deviceTiltMount) return input.deviceTiltMount
  return input.viewportIsLandscape ? 'landscape' : 'portrait'
}

const LANDSCAPE_CONFIRM_READINGS = 2

/** portraitは即座に反映。landscapeは初回の不安定な読み取りを無視するため連続確認が必要 */
export function applyTiltReading(
  reading: MountOrientation | null,
  landscapeStreak: number,
  current: MountOrientation | null
): { tilt: MountOrientation | null; landscapeStreak: number } {
  if (reading === 'portrait') {
    return { tilt: 'portrait', landscapeStreak: 0 }
  }
  if (reading === 'landscape') {
    const nextStreak = landscapeStreak + 1
    if (nextStreak >= LANDSCAPE_CONFIRM_READINGS) {
      return { tilt: 'landscape', landscapeStreak: nextStreak }
    }
    return { tilt: current, landscapeStreak: nextStreak }
  }
  return { tilt: current, landscapeStreak }
}

/**
 * 保存後のピクセルが物理的な向きと一致するよう時計回りに回転する角度を計算する。
 * 横向きマウントは、右手持ちを想定してスマホを左に傾けている前提
 * （縦向きから反時計回り）とし、カメラストリームがまだ縦長のときは
 * 時計回り270度で焼き込む。angle === 90 は端末が右に傾いていることを
 * 示すため、その場合は90度を使う。
 */
export function computeCaptureRotationDeg(
  mount: MountOrientation,
  videoWidth: number,
  videoHeight: number,
  screenAngle: number,
  invertDirection = false
): CaptureRotationDeg {
  if (!videoWidth || !videoHeight) return 0

  const streamIsLandscape = videoWidth > videoHeight
  const wantLandscape = mount === 'landscape'
  const normalizedAngle = ((screenAngle % 360) + 360) % 360

  let rotation: CaptureRotationDeg = 0

  if (wantLandscape) {
    if (streamIsLandscape) {
      rotation = 0
    } else {
      rotation = normalizedAngle === 90 ? 90 : 270
    }
  } else if (streamIsLandscape) {
    rotation = normalizedAngle === 90 ? 270 : 90
  }

  if (invertDirection && rotation !== 0) {
    rotation = ((360 - rotation) % 360) as CaptureRotationDeg
  }

  return rotation
}

export function captureFrameFromVideo(
  video: HTMLVideoElement,
  mount: MountOrientation,
  invertDirection = false,
  screenAngle = readScreenAngle()
): HTMLCanvasElement {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  const rotation = computeCaptureRotationDeg(
    mount,
    videoWidth,
    videoHeight,
    screenAngle,
    invertDirection
  )

  const swap = rotation === 90 || rotation === 270
  const canvasWidth = swap ? videoHeight : videoWidth
  const canvasHeight = swap ? videoWidth : videoHeight

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('キャンバスを初期化できませんでした')

  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight)

  return canvas
}

/** 手持ち撮影のシャッター: 横向きは常に左90度のスマホ傾きとして焼き込む */
export function captureHandheldFrame(
  video: HTMLVideoElement,
  deviceTiltMount?: MountOrientation | null
): HTMLCanvasElement {
  const viewportIsLandscape =
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const rawAngle = readScreenAngle()
  const screenOrientationType =
    typeof screen !== 'undefined' ? (screen.orientation?.type ?? '') : ''
  const mount = resolveHandheldMount({
    screenAngle: rawAngle,
    viewportIsLandscape,
    screenOrientationType,
    deviceTiltMount,
  })
  const screenAngle = mount === 'landscape' ? LANDSCAPE_LEFT_TILT_SCREEN_ANGLE : rawAngle
  return captureFrameFromVideo(video, mount, false, screenAngle)
}

/** プレビュー枠は常に縦長。マウント向きは保存時の回転にのみ影響する */
export function previewAspectClass(_mount?: MountOrientation): string {
  return 'aspect-[3/4]'
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --import tsx --test src/lib/picture-report/captureFrameFromVideo.test.ts`
Expected: PASS（9件全て成功）

- [ ] **Step 5: コミット**

```bash
git add src/lib/picture-report/captureFrameFromVideo.ts src/lib/picture-report/captureFrameFromVideo.test.ts
git commit -m "feat(picture-report): カメラ傾き補正ロジックをdx-sensorから移植"
```

---

## Task 5: 音声入力フックの移植（`lib/picture-report/useSpeechToText.ts`）

**Files:**

- Create: `src/lib/picture-report/useSpeechToText.ts`

**Interfaces:**

- Produces: `isSpeechToTextSupported(): boolean`, `useSpeechToText({ lang?, onTranscript, getBaseText }): { supported, listening, error, clearError, start, stop, toggle }`

このフックはブラウザのWeb Speech APIとReactの`useRef`/`useEffect`に強く依存しており、Node環境の単体テストでは検証できない（`window.SpeechRecognition`が存在しない）。dx-sensor版のロジックは既に本番で動作実績があるため、無改変でそのまま移植し、動作確認はTask 9のE2E手動確認で行う。

- [ ] **Step 1: dx-sensorの`lib/speech/useSpeechToText.ts`をそのまま移植する**

```typescript
// src/lib/picture-report/useSpeechToText.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike> & {
    length: number
  }
}

type SpeechRecognitionErrorEventLike = {
  error: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechToTextSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null
}

function appendTranscript(base: string, addition: string): string {
  const trimmedAddition = addition.trim()
  if (!trimmedAddition) return base
  if (!base) return trimmedAddition
  const needsSpace = !/\s$/.test(base)
  return needsSpace ? `${base} ${trimmedAddition}` : `${base}${trimmedAddition}`
}

export type UseSpeechToTextOptions = {
  lang?: string
  /** フィールド全体の値（確定済みテキスト + 中間結果）を受け取る */
  onTranscript: (text: string) => void
  /** 音声認識開始時点のフィールド値のスナップショット */
  getBaseText: () => string
}

export function useSpeechToText({
  lang = 'ja-JP',
  onTranscript,
  getBaseText,
}: UseSpeechToTextOptions) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListeningRef = useRef(false)
  const baseTextRef = useRef('')
  const finalChunkRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  const getBaseTextRef = useRef(getBaseText)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    getBaseTextRef.current = getBaseText
  }, [getBaseText])

  useEffect(() => {
    setSupported(isSpeechToTextSupported())
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.stop()
      } catch {
        // 既に停止済み
      }
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setError(
        'このブラウザでは音声入力に対応していません。Chrome / Edge / Safari でお試しください。'
      )
      return
    }

    setError(null)
    stop()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    baseTextRef.current = getBaseTextRef.current()
    finalChunkRef.current = ''
    wantListeningRef.current = true
    recognitionRef.current = recognition

    recognition.onresult = event => {
      let interim = ''
      let newlyFinal = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) {
          newlyFinal += piece
        } else {
          interim += piece
        }
      }
      if (newlyFinal) {
        finalChunkRef.current = appendTranscript(finalChunkRef.current, newlyFinal)
      }
      const combined = appendTranscript(baseTextRef.current, finalChunkRef.current)
      const withInterim = interim.trim() ? appendTranscript(combined, interim) : combined
      onTranscriptRef.current(withInterim)
    }

    recognition.onerror = event => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return
      }
      if (event.error === 'not-allowed') {
        setError('マイクの使用が拒否されました。ブラウザの設定で許可してください。')
      } else if (event.error === 'network') {
        setError('音声認識にネットワークが必要です。接続を確認してください。')
      } else {
        setError('音声入力でエラーが発生しました。もう一度お試しください。')
      }
      wantListeningRef.current = false
      setListening(false)
    }

    recognition.onend = () => {
      if (wantListeningRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start()
          return
        } catch {
          setError('音声入力を再開できませんでした。もう一度マイクボタンを押してください。')
        }
      }
      wantListeningRef.current = false
      recognitionRef.current = null
      setListening(false)
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('音声入力を開始できませんでした。')
      wantListeningRef.current = false
      recognitionRef.current = null
      setListening(false)
    }
  }, [lang, stop])

  const toggle = useCallback(() => {
    if (listening) {
      stop()
    } else {
      start()
    }
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        try {
          recognition.abort()
        } catch {
          // 無視
        }
      }
    }
  }, [])

  return {
    supported,
    listening,
    error,
    clearError,
    start,
    stop,
    toggle,
  }
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: `useSpeechToText.ts`起因のエラーが出ない

- [ ] **Step 3: コミット**

```bash
git add src/lib/picture-report/useSpeechToText.ts
git commit -m "feat(picture-report): 音声入力フックをdx-sensorから移植"
```

---

## Task 6: ドメイン型・Zodスキーマ（`features/picture-report/types.ts`）

**Files:**

- Create: `src/features/picture-report/types.ts`
- Test: `src/features/picture-report/types.test.ts`

**Interfaces:**

- Consumes: `PicturePriority`（Task 3で定義）
- Produces: `PictureSendSubject`, `PictureSendRow`, `AlbumScope`型, `createSubjectSchema`, `updateSubjectSchema`, `deleteSubjectSchema`, `sendPictureSchema`, `updateSendBodySchema`, `deleteSendSchema`（いずれもZodスキーマ）, `PictureReportActionResult`型

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/features/picture-report/types.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSubjectSchema,
  sendPictureSchema,
  updateSendBodySchema,
  deleteSendSchema,
} from './types'

test('件名ラベルが空文字なら拒否される', () => {
  const result = createSubjectSchema.safeParse({ label: '' })
  assert.equal(result.success, false)
})

test('件名ラベルが有効なら成功する', () => {
  const result = createSubjectSchema.safeParse({ label: '日報' })
  assert.equal(result.success, true)
})

test('sendPictureSchema: subjectTextが空だと拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '',
    bodyText: '本文',
    priority: 'medium',
  })
  assert.equal(result.success, false)
})

test('sendPictureSchema: 不正なpriorityは拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: '',
    priority: 'urgent',
  })
  assert.equal(result.success, false)
})

test('sendPictureSchema: 正常な入力は成功する', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: '11111111-1111-4111-8111-111111111111',
    subjectText: '日報',
    bodyText: '本日の状況です',
    priority: 'high',
  })
  assert.equal(result.success, true)
})

test('updateSendBodySchema: idがUUID形式でない場合は拒否される', () => {
  const result = updateSendBodySchema.safeParse({ id: 'not-a-uuid', bodyText: '更新' })
  assert.equal(result.success, false)
})

test('deleteSendSchema: 正常なidは成功する', () => {
  const result = deleteSendSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111' })
  assert.equal(result.success, true)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/features/picture-report/types.test.ts`
Expected: FAIL（`types.ts`が存在しない）

- [ ] **Step 3: 実装する**

```typescript
// src/features/picture-report/types.ts
import { z } from 'zod'
import type { PicturePriority } from '@/lib/picture-report/priority'

export type PictureSendSubject = {
  id: string
  label: string
  created_at: string
  updated_at: string
}

export type PictureSendRow = {
  id: string
  user_id: string
  user_email: string
  subject_text: string
  body_text: string
  priority: PicturePriority
  storage_path: string
  created_at: string
}

export type AlbumItem = PictureSendRow & {
  thumbnailUrl: string | null
}

export type AlbumScope = 'own' | 'team'

export type PictureReportActionResult = { success: true } | { success: false; error: string }

export const createSubjectSchema = z.object({
  label: z.string().trim().min(1, '件名を入力してください').max(100),
})

export const updateSubjectSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1, '件名を入力してください').max(100),
})

export const deleteSubjectSchema = z.object({
  id: z.string().uuid(),
})

export const sendPictureSchema = z.object({
  subjectId: z.string().uuid().nullable(),
  subjectText: z.string().trim().min(1, '件名を入力してください').max(100),
  bodyText: z.string().max(2000),
  priority: z.enum(['high', 'medium', 'low']),
})

export const updateSendBodySchema = z.object({
  id: z.string().uuid(),
  bodyText: z.string().max(2000),
})

export const deleteSendSchema = z.object({
  id: z.string().uuid(),
})
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --import tsx --test src/features/picture-report/types.test.ts`
Expected: PASS（7件全て成功）

- [ ] **Step 5: コミット**

```bash
git add src/features/picture-report/types.ts src/features/picture-report/types.test.ts
git commit -m "feat(picture-report): ドメイン型・Zodスキーマを追加"
```

---

## Task 7: `queries.ts`（SELECT専用）

**Files:**

- Create: `src/features/picture-report/queries.ts`

**Interfaces:**

- Consumes: `getServerUser()`（`@/lib/auth/server-user`）, `createClient()`（`@/lib/supabase/server`）, `PictureSendSubject`, `PictureSendRow`, `AlbumItem`, `AlbumScope`（Task 6）
- Produces: `getPictureSendSubjects(): Promise<PictureSendSubject[]>`, `getMyRecentSends(limit: number): Promise<AlbumItem[]>`, `getAlbumPage(params: { scope: AlbumScope; offset: number; limit: number; subjectFilter?: string; highOnly?: boolean }): Promise<{ items: AlbumItem[]; hasMore: boolean }>`, `canViewTeamAlbum(): Promise<boolean>`

- [ ] **Step 1: 実装する**

Server ComponentからSELECTのみ行う。署名付きURLはここで発行し、Client Componentには文字列のみ渡す（CLAUDE.mdの「useEffect + fetchによるクライアント側データ取得は避ける」規約に準拠）。

```typescript
// src/features/picture-report/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { PictureSendSubject, PictureSendRow, AlbumItem, AlbumScope } from './types'

const SIGNED_URL_EXPIRES_IN_SECONDS = 3600
const PICTURE_SENDS_BUCKET = 'picture-sends'

async function attachSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PictureSendRow[]
): Promise<AlbumItem[]> {
  return Promise.all(
    rows.map(async row => {
      const { data: signed } = await supabase.storage
        .from(PICTURE_SENDS_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS)
      return {
        ...row,
        thumbnailUrl: signed?.signedUrl ?? null,
      }
    })
  )
}

/** ログイン中ユーザーがマネージャーとして「部下の投稿」を閲覧できるか */
export async function canViewTeamAlbum(): Promise<boolean> {
  const user = await getServerUser()
  return Boolean(user?.is_manager)
}

/** 自部門の件名マスタ一覧（RLSにより自部門のみ返る） */
export async function getPictureSendSubjects(): Promise<PictureSendSubject[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('picture_send_subjects')
    .select('id, label, created_at, updated_at')
    .order('label')

  if (error) {
    console.error('件名マスタの取得に失敗しました', error)
    return []
  }
  return data ?? []
}

/** 送信画面の「直近の送信」表示用（自分の投稿のみ、RLSでも自動的に絞られる） */
export async function getMyRecentSends(limit: number): Promise<AlbumItem[]> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return []

  const { data, error } = await supabase
    .from('picture_sends')
    .select('id, user_id, user_email, subject_text, body_text, priority, storage_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('直近の送信の取得に失敗しました', error)
    return []
  }

  return attachSignedUrls(supabase, data ?? [])
}

/**
 * アルバム画面用のページング取得。
 * scope: 'own' は自分の投稿のみ、'team' はマネージャーが部下の投稿を見る場合に使う
 * （呼び出し元のServer Componentで`canViewTeamAlbum()`を確認した上で使うこと。
 * RLS自体も同時に is_manager と division_id を検証するため、二重の保護になる）。
 */
export async function getAlbumPage(params: {
  scope: AlbumScope
  offset: number
  limit: number
  subjectFilter?: string
  highOnly?: boolean
}): Promise<{ items: AlbumItem[]; hasMore: boolean }> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return { items: [], hasMore: false }

  let query = supabase
    .from('picture_sends')
    .select('id, user_id, user_email, subject_text, body_text, priority, storage_path, created_at')
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.scope === 'own') {
    query = query.eq('user_id', user.id)
  } else {
    // 'team': RLSが同一部門のマネージャーのみに絞り込むため、
    // ここでは明示的に自分自身を除外して「部下」のみを返す
    query = query.neq('user_id', user.id)
  }

  if (params.subjectFilter) {
    query = query.eq('subject_text', params.subjectFilter)
  }
  if (params.highOnly) {
    query = query.eq('priority', 'high')
  }

  const { data, error } = await query

  if (error) {
    console.error('アルバムの取得に失敗しました', error)
    return { items: [], hasMore: false }
  }

  const rows = (data ?? []) as PictureSendRow[]
  const items = await attachSignedUrls(supabase, rows)
  return { items, hasMore: rows.length === params.limit }
}

/** アルバムの件名フィルタ用の選択肢一覧 */
export async function getAlbumSubjectOptions(scope: AlbumScope): Promise<string[]> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return []

  let query = supabase.from('picture_sends').select('subject_text').order('subject_text')
  query = scope === 'own' ? query.eq('user_id', user.id) : query.neq('user_id', user.id)

  const { data, error } = await query
  if (error) {
    console.error('件名フィルタ選択肢の取得に失敗しました', error)
    return []
  }

  const unique = [...new Set((data ?? []).map(r => r.subject_text as string).filter(Boolean))]
  return unique.sort((a, b) => a.localeCompare(b, 'ja'))
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/picture-report/queries.ts
git commit -m "feat(picture-report): SELECT専用queries.tsを追加"
```

---

## Task 8: `actions.ts`（Server Actions）

**Files:**

- Create: `src/features/picture-report/actions.ts`
- Test: `src/features/picture-report/actions.test.ts`

**Interfaces:**

- Consumes: `getServerUser()`, `createClient()`, `createSubjectSchema`/`updateSubjectSchema`/`deleteSubjectSchema`/`sendPictureSchema`/`updateSendBodySchema`/`deleteSendSchema`（Task 6）, `APP_ROUTES.TENANT.TOOL_PICTURE_REPORT`/`APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM`（Task 10）
- Produces: `createSubject(input)`, `updateSubject(input)`, `deleteSubject(input)`, `sendPicture(formData: FormData)`, `updateSendBody(input)`, `deleteSend(input)` — いずれも`Promise<PictureReportActionResult>`

- [ ] **Step 1: 失敗するテストを書く（`is_manager`チェックの分岐条件のみユニットテスト。Supabase呼び出し自体は統合環境がないため対象外）**

```typescript
// src/features/picture-report/actions.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { createSubjectSchema, sendPictureSchema } from './types'

// actions.ts本体はgetServerUser/createClientというサーバー専用モジュールに
// 依存しているため、Node単体テストではモック困難。ここではactions.tsが
// 権限チェック前に必ず通すバリデーションスキーマの妥当性のみを検証する。
// 実際のis_manager分岐・RLS境界はTask 1 Step 3の手動SQL確認とTask 9の
// E2E手動確認でカバーする。

test('件名作成: ラベルが100文字を超えると拒否される', () => {
  const result = createSubjectSchema.safeParse({ label: 'a'.repeat(101) })
  assert.equal(result.success, false)
})

test('画像送信: 本文が2000文字以内なら成功する', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: 'a'.repeat(2000),
    priority: 'low',
  })
  assert.equal(result.success, true)
})

test('画像送信: 本文が2000文字を超えると拒否される', () => {
  const result = sendPictureSchema.safeParse({
    subjectId: null,
    subjectText: '日報',
    bodyText: 'a'.repeat(2001),
    priority: 'low',
  })
  assert.equal(result.success, false)
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `node --import tsx --test src/features/picture-report/actions.test.ts`
Expected: FAIL（`types.ts`のバリデーション自体はTask 6で通るはずなので、この時点で失敗するのは`actions.ts`が存在しないことによるimportエラーがある場合のみ。実際にはtypes.tsのみをimportしているためこのテストはTask 6完了後は最初からPASSしうる。その場合はStep 3をスキップしてよい）

- [ ] **Step 3: `actions.ts`を実装する**

```typescript
// src/features/picture-report/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
  sendPictureSchema,
  updateSendBodySchema,
  deleteSendSchema,
  type PictureReportActionResult,
} from './types'

const PICTURE_SENDS_BUCKET = 'picture-sends'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

/** 件名マスタを追加する（is_managerのみ許可。RLSでも二重に保護される） */
export async function createSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }
  if (!user.division_id) return { success: false, error: '所属部署が未設定です' }

  const parsed = createSubjectSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()
  const { error } = await supabase.from('picture_send_subjects').insert({
    tenant_id: user.tenant_id,
    division_id: user.division_id,
    label: parsed.data.label,
    created_by: user.employee_id,
  })

  if (error) return { success: false, error: errorMessage(error, '件名の追加に失敗しました') }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/** 件名マスタを更新する（is_managerのみ許可） */
export async function updateSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }

  const parsed = updateSubjectSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('picture_send_subjects')
    .update({ label: parsed.data.label, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: errorMessage(error, '件名の更新に失敗しました') }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/** 件名マスタを削除する（is_managerのみ許可） */
export async function deleteSubject(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!user.is_manager) return { success: false, error: '権限がありません' }

  const parsed = deleteSubjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正なIDです' }

  const supabase = await createClient()
  const { error } = await supabase.from('picture_send_subjects').delete().eq('id', parsed.data.id)

  if (error) return { success: false, error: errorMessage(error, '件名の削除に失敗しました') }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  return { success: true }
}

/**
 * 撮影画像を送信する。Client側でカメラ撮影したBlobをFormDataに詰めて渡す。
 * FormData: image(File), subjectId(string|""), subjectText(string), bodyText(string), priority(string)
 */
export async function sendPicture(formData: FormData): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id || !user.division_id) {
    return { success: false, error: '認証エラー' }
  }

  const image = formData.get('image')
  if (!(image instanceof File) || image.size === 0) {
    return { success: false, error: '送信する画像がありません。撮影してください。' }
  }

  const rawSubjectId = formData.get('subjectId')
  const parsed = sendPictureSchema.safeParse({
    subjectId: typeof rawSubjectId === 'string' && rawSubjectId ? rawSubjectId : null,
    subjectText: formData.get('subjectText'),
    bodyText: formData.get('bodyText') ?? '',
    priority: formData.get('priority'),
  })
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }

  const supabase = await createClient()

  // Asia/Tokyoの日付でストレージのパスを区切る
  const dateSegment = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(
    new Date()
  )
  const storagePath = `${user.id}/${dateSegment}/${crypto.randomUUID()}.jpg`

  const arrayBuffer = await image.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(PICTURE_SENDS_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: image.type || 'image/jpeg' })

  if (uploadError)
    return { success: false, error: errorMessage(uploadError, '画像のアップロードに失敗しました') }

  const { error: insertError } = await supabase.from('picture_sends').insert({
    tenant_id: user.tenant_id,
    user_id: user.id,
    division_id: user.division_id,
    user_email: user.email ?? '',
    subject_id: parsed.data.subjectId,
    subject_text: parsed.data.subjectText,
    body_text: parsed.data.bodyText,
    priority: parsed.data.priority,
    storage_path: storagePath,
  })

  if (insertError) {
    // INSERT失敗時はアップロード済みの画像を掃除する
    await supabase.storage.from(PICTURE_SENDS_BUCKET).remove([storagePath])
    return { success: false, error: errorMessage(insertError, '送信に失敗しました') }
  }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT)
  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}

/** 本文を編集する（本人のみ。RLSでも二重に保護される） */
export async function updateSendBody(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.id) return { success: false, error: '認証エラー' }

  const parsed = updateSendBodySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正な入力です' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('picture_sends')
    .update({ body_text: parsed.data.bodyText })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: errorMessage(error, '本文の保存に失敗しました') }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}

/** 投稿を削除する（本人のみ） */
export async function deleteSend(input: unknown): Promise<PictureReportActionResult> {
  const user = await getServerUser()
  if (!user?.id) return { success: false, error: '認証エラー' }

  const parsed = deleteSendSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: '不正なIDです' }

  const supabase = await createClient()

  const { data: target, error: fetchError } = await supabase
    .from('picture_sends')
    .select('storage_path')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !target) return { success: false, error: '対象の投稿が見つかりません' }

  const { error: storageError } = await supabase.storage
    .from(PICTURE_SENDS_BUCKET)
    .remove([target.storage_path])
  if (storageError)
    return { success: false, error: errorMessage(storageError, '画像の削除に失敗しました') }

  const { error: deleteError } = await supabase
    .from('picture_sends')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (deleteError)
    return { success: false, error: errorMessage(deleteError, '投稿の削除に失敗しました') }

  revalidatePath(APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM)
  return { success: true }
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `node --import tsx --test src/features/picture-report/actions.test.ts`
Expected: PASS（3件全て成功）

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし（Task 10でAPP_ROUTESに`TOOL_PICTURE_REPORT`/`TOOL_PICTURE_REPORT_ALBUM`を追加するまでは型エラーになるため、Task 10完了後に再実行して確認する）

- [ ] **Step 6: コミット**

```bash
git add src/features/picture-report/actions.ts src/features/picture-report/actions.test.ts
git commit -m "feat(picture-report): Server Actions（actions.ts）を追加"
```

---

## Task 9: ルート定数の追加（`config/routes.ts`）

**Files:**

- Modify: `src/config/routes.ts`

**Interfaces:**

- Produces: `APP_ROUTES.TENANT.TOOL_PICTURE_REPORT: '/tool/picture-report'`, `APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM: '/tool/picture-report/album'`

- [ ] **Step 1: `TENANT`オブジェクト内に追記する**

`src/config/routes.ts`の`TENANT: { ... }`ブロック内、`PORTAL_DEVICE_PAIRING`の直後に以下を追加する：

```typescript
    /** 画像送信（現場からの写真報告）— (tool)/picture-report */
    TOOL_PICTURE_REPORT: '/tool/picture-report',
    /** 写真レポートホルダー（自分の投稿一覧・マネージャーは部下の投稿も閲覧可） */
    TOOL_PICTURE_REPORT_ALBUM: '/tool/picture-report/album',
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし（Task 8の`actions.ts`が参照していた`APP_ROUTES.TENANT.TOOL_PICTURE_REPORT`等が解決される）

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat(picture-report): APP_ROUTESに画像送信ルートを追加"
```

---

## Task 10: 送信画面UI（`page.tsx` + `PictureReportForm.tsx` + `SubjectManageModal.tsx`）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/PictureReportForm.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/SubjectManageModal.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/error.tsx`

**Interfaces:**

- Consumes: `getServerUser()`, `getPictureSendSubjects()`/`getMyRecentSends()`（Task 7）, `createSubject`/`updateSubject`/`deleteSubject`/`sendPicture`（Task 8）, `useSpeechToText`（Task 5）, `captureHandheldFrame`/`applyTiltReading`/`mountFromDeviceTilt`/`type MountOrientation`（Task 4）, `PICTURE_PRIORITIES`/`PICTURE_PRIORITY_LABELS`/`DEFAULT_PICTURE_PRIORITY`/`type PicturePriority`（Task 3）, `APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM`（Task 9）

dx-sensorのToken色（`text-ink`, `bg-signal`, `border-line`, `bg-alert`等）はhr-dx-saasに存在しないため、以下のマッピングでTailwind標準クラス／HR-DXブランド色に置き換える：

| dx-sensor                   | hr-dx-saas                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| `text-ink`                  | `text-gray-900`                                                   |
| `text-ink-soft`             | `text-gray-500`                                                   |
| `border-line`               | `border-gray-200`                                                 |
| `bg-signal` / `text-signal` | `bg-primary` / `text-primary`（`globals.css`の`--color-primary`） |
| `bg-signal-soft`            | `bg-orange-50`                                                    |
| `bg-alert` / `text-alert`   | `bg-red-500` / `text-red-600`                                     |
| `bg-paper`                  | `bg-gray-50`                                                      |

- [ ] **Step 1: `page.tsx`を作成する（Server Component、queries.tsのみ呼ぶ）**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getPictureSendSubjects, getMyRecentSends } from '@/features/picture-report/queries'
import { APP_ROUTES } from '@/config/routes'
import { PictureReportForm } from './PictureReportForm'

const RECENT_SENDS_LIMIT = 5

export default async function PictureReportPage() {
  const user = await getServerUser()
  if (!user?.id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [subjects, recentSends] = await Promise.all([
    getPictureSendSubjects(),
    getMyRecentSends(RECENT_SENDS_LIMIT),
  ])

  return (
    <PictureReportForm
      userEmail={user.email ?? ''}
      isManager={Boolean(user.is_manager)}
      initialSubjects={subjects}
      initialRecentSends={recentSends}
    />
  )
}
```

- [ ] **Step 2: `loading.tsx`を作成する**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-10 animate-pulse rounded-md bg-gray-100" />
    </div>
  )
}
```

- [ ] **Step 3: `error.tsx`を作成する**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
      <p className="text-sm text-gray-600">画像送信画面の読み込みに失敗しました。</p>
      <p className="text-xs text-gray-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50"
      >
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 4: `SubjectManageModal.tsx`を作成する（is_managerのみ利用可能な前提。開くボタン自体を`PictureReportForm`側でis_manager判定して出し分ける）**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/SubjectManageModal.tsx
'use client'

import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createSubject, updateSubject, deleteSubject } from '@/features/picture-report/actions'
import type { PictureSendSubject } from '@/features/picture-report/types'

interface SubjectManageModalProps {
  open: boolean
  subjects: PictureSendSubject[]
  onClose: () => void
  onSubjectsChanged: () => void
}

type EditMode = { kind: 'none' } | { kind: 'add' } | { kind: 'edit'; id: string; label: string }

export function SubjectManageModal({
  open,
  subjects,
  onClose,
  onSubjectsChanged,
}: SubjectManageModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>({ kind: 'none' })
  const [draftLabel, setDraftLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEditMode({ kind: 'none' })
    setDraftLabel('')
    setError(null)
  }, [open])

  if (!open) return null

  async function handleSave() {
    const trimmed = draftLabel.trim()
    if (!trimmed) {
      setError('件名を入力してください。')
      return
    }

    setSaving(true)
    setError(null)

    const result =
      editMode.kind === 'edit'
        ? await updateSubject({ id: editMode.id, label: trimmed })
        : await createSubject({ label: trimmed })

    setSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setEditMode({ kind: 'none' })
    setDraftLabel('')
    onSubjectsChanged()
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`「${label}」を削除しますか？`)) return

    setError(null)
    const result = await deleteSubject({ id })

    if (!result.success) {
      setError(result.error)
      return
    }

    if (editMode.kind === 'edit' && editMode.id === id) {
      setEditMode({ kind: 'none' })
      setDraftLabel('')
    }
    onSubjectsChanged()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-modal-title"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="subject-modal-title" className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Tag className="h-4 w-4 text-primary" strokeWidth={1.75} />
            件名マスタ管理
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-4">
          <p className="text-sm text-gray-500">
            部門で繰り返し使う件名（例: 日報）を登録します。ここで登録した件名は同じ部門のメンバー全員が選択できます。
          </p>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {editMode.kind !== 'none' && (
            <div className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className="block text-sm font-medium text-gray-900">
                {editMode.kind === 'add' ? '新規件名' : '件名を変更'}
              </label>
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="例: 日報"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditMode({ kind: 'none' })
                    setDraftLabel('')
                    setError(null)
                  }}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 transition hover:border-primary/50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={editMode.kind !== 'none'}
            onClick={() => {
              setEditMode({ kind: 'add' })
              setDraftLabel('')
              setError(null)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            件名を追加
          </button>

          <ul className="mt-4 space-y-2">
            {subjects.length === 0 && (
              <li className="text-sm text-gray-500">登録済みの件名はありません。</li>
            )}
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{subject.label}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={editMode.kind !== 'none'}
                    onClick={() => {
                      setEditMode({ kind: 'edit', id: subject.id, label: subject.label })
                      setDraftLabel(subject.label)
                      setError(null)
                    }}
                    className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                    aria-label={`${subject.label} を編集`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={editMode.kind !== 'none'}
                    onClick={() => void handleDelete(subject.id, subject.label)}
                    className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`${subject.label} を削除`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: `PictureReportForm.tsx`を作成する**

dx-sensorの`SendPictureForm.tsx`をベースに、Client側の直接Supabase呼び出しを`sendPicture` Server Action呼び出しへ置き換える。件名マスタは`initialSubjects`をpropsで受け取り、変更時は`router.refresh()`相当としてServer Component側のデータを再取得するため`useRouter().refresh()`を使う。「ID登録」ボタンは`isManager`のときのみ表示する。

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/PictureReportForm.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Mic, MicOff, Send, Tag } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyTiltReading,
  captureHandheldFrame,
  mountFromDeviceTilt,
  type MountOrientation,
} from '@/lib/picture-report/captureFrameFromVideo'
import {
  DEFAULT_PICTURE_PRIORITY,
  PICTURE_PRIORITIES,
  PICTURE_PRIORITY_LABELS,
  type PicturePriority,
} from '@/lib/picture-report/priority'
import { useSpeechToText } from '@/lib/picture-report/useSpeechToText'
import { sendPicture } from '@/features/picture-report/actions'
import { APP_ROUTES } from '@/config/routes'
import type { AlbumItem, PictureSendSubject } from '@/features/picture-report/types'
import { SubjectManageModal } from './SubjectManageModal'

interface PictureReportFormProps {
  userEmail: string
  isManager: boolean
  initialSubjects: PictureSendSubject[]
  initialRecentSends: AlbumItem[]
}

type CameraState = 'idle' | 'starting' | 'ready' | 'denied' | 'unsupported' | 'error'
type SendStatus = 'idle' | 'sending' | 'done' | 'error'

const OTHER_SUBJECT_VALUE = '__other__'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

async function requestMotionPermission(): Promise<void> {
  try {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') {
      await DOE.requestPermission()
    }
  } catch {
    // 権限拒否時はシャッターが画面回転にフォールバックする
  }
}

export function PictureReportForm({
  userEmail,
  isManager,
  initialSubjects,
  initialRecentSends,
}: PictureReportFormProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const tiltMountRef = useRef<MountOrientation | null>(null)
  const tiltListenFromRef = useRef(0)
  const landscapeStreakRef = useRef(0)
  const onDeviceOrientationRef = useRef((event: DeviceOrientationEvent) => {
    if (Date.now() < tiltListenFromRef.current) return
    const reading = mountFromDeviceTilt(event.gamma, event.beta)
    const next = applyTiltReading(reading, landscapeStreakRef.current, tiltMountRef.current)
    landscapeStreakRef.current = next.landscapeStreak
    tiltMountRef.current = next.tilt
  })

  const [subjects, setSubjects] = useState<PictureSendSubject[]>(initialSubjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [adHocSubject, setAdHocSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const bodyTextRef = useRef(bodyText)
  const getBodyText = useCallback(() => bodyTextRef.current, [])
  const [priority, setPriority] = useState<PicturePriority>(DEFAULT_PICTURE_PRIORITY)

  const {
    supported: speechSupported,
    listening: speechListening,
    error: speechError,
    clearError: clearSpeechError,
    stop: stopSpeech,
    toggle: toggleSpeech,
  } = useSpeechToText({
    onTranscript: setBodyText,
    getBaseText: getBodyText,
  })

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendError, setSendError] = useState<string | null>(null)

  const isOtherSubject = selectedSubjectId === OTHER_SUBJECT_VALUE

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  const setPreviewFromBlob = useCallback(
    (blob: Blob) => {
      revokePreviewUrl()
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewBlob(blob)
      setPreviewUrl(url)
    },
    [revokePreviewUrl]
  )

  const clearPreview = useCallback(() => {
    revokePreviewUrl()
    setPreviewBlob(null)
    setPreviewUrl(null)
  }, [revokePreviewUrl])

  const stopCamera = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', onDeviceOrientationRef.current)
    }
    tiltMountRef.current = null
    landscapeStreakRef.current = 0
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    bodyTextRef.current = bodyText
  }, [bodyText])

  useEffect(() => {
    return () => {
      stopCamera()
      revokePreviewUrl()
    }
  }, [stopCamera, revokePreviewUrl])

  useEffect(() => {
    if (sendStatus === 'sending' && speechListening) {
      stopSpeech()
    }
  }, [sendStatus, speechListening, stopSpeech])

  const startCamera = useCallback(async () => {
    setCameraState('starting')
    setCameraError(null)
    clearPreview()
    stopCamera()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      setCameraError('このブラウザではカメラAPIを利用できません。HTTPSで開いているか確認してください。')
      return
    }

    try {
      await requestMotionPermission()
      tiltMountRef.current = null
      landscapeStreakRef.current = 0
      tiltListenFromRef.current = Date.now() + 300
      if (typeof window !== 'undefined') {
        window.addEventListener('deviceorientation', onDeviceOrientationRef.current)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setCameraState('ready')
    } catch (err) {
      stopCamera()
      console.error('getUserMedia failed', err)
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied')
        setCameraError('カメラの使用が拒否されました。ブラウザの設定で許可してください。')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraState('error')
        setCameraError('利用可能なカメラが見つかりませんでした。')
      } else {
        setCameraState('error')
        setCameraError(err instanceof Error ? err.message : 'カメラの起動に失敗しました')
      }
    }
  }, [clearPreview, stopCamera])

  function handleShutter() {
    const video = videoRef.current
    if (!video || cameraState !== 'ready') return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setSendError('映像の準備ができていません。少し待ってから再度お試しください。')
      return
    }

    let canvas: HTMLCanvasElement
    try {
      canvas = captureHandheldFrame(video, tiltMountRef.current)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : '画像の生成に失敗しました。')
      return
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setSendError('画像の生成に失敗しました。')
          return
        }
        setPreviewFromBlob(blob)
        stopCamera()
        setCameraState('idle')
      },
      'image/jpeg',
      0.92
    )
  }

  function resolveSubject(): { subjectId: string | null; subjectText: string } | null {
    if (!selectedSubjectId) {
      setSendError('件名を選択してください。')
      return null
    }

    if (isOtherSubject) {
      const trimmed = adHocSubject.trim()
      if (!trimmed) {
        setSendError('件名を入力してください。')
        return null
      }
      return { subjectId: null, subjectText: trimmed }
    }

    const subject = subjects.find((s) => s.id === selectedSubjectId)
    if (!subject) {
      setSendError('選択した件名が見つかりません。再選択してください。')
      return null
    }

    return { subjectId: subject.id, subjectText: subject.label }
  }

  async function handleSend() {
    setSendError(null)

    if (!previewBlob) {
      setSendError('送信する画像がありません。撮影してください。')
      return
    }

    const subject = resolveSubject()
    if (!subject) return

    setSendStatus('sending')

    const formData = new FormData()
    formData.set('image', previewBlob, 'capture.jpg')
    formData.set('subjectId', subject.subjectId ?? '')
    formData.set('subjectText', subject.subjectText)
    formData.set('bodyText', bodyText)
    formData.set('priority', priority)

    const result = await sendPicture(formData)

    if (!result.success) {
      setSendStatus('error')
      setSendError(result.error)
      return
    }

    setSendStatus('done')
    setSelectedSubjectId('')
    setAdHocSubject('')
    stopSpeech()
    setBodyText('')
    setPriority(DEFAULT_PICTURE_PRIORITY)
    clearPreview()
    stopCamera()
    setCameraState('idle')
    router.refresh()
  }

  const showLiveCamera = cameraState === 'starting' || cameraState === 'ready'

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6 pb-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">画像送信</h1>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            アルバムを見る
          </Link>
          <Link
            href={APP_ROUTES.TENANT.PORTAL}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            ←戻る
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900">件名</span>
            {isManager && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-md border border-gray-200 bg-white p-1.5 text-primary transition hover:border-primary/50 hover:bg-orange-50"
                aria-label="件名マスタ管理"
                title="件名マスタ管理"
              >
                <Tag className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </span>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value)
              setSendError(null)
            }}
            disabled={sendStatus === 'sending'}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
            <option value={OTHER_SUBJECT_VALUE}>（その他・都度入力）</option>
          </select>
        </label>

        {isOtherSubject && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-900">件名（都度入力）</span>
            <input
              type="text"
              value={adHocSubject}
              onChange={(e) => setAdHocSubject(e.target.value)}
              placeholder="例: ○○について"
              disabled={sendStatus === 'sending'}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </label>
        )}

        <div className="block space-y-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900">本文</span>
            {speechSupported && (
              <button
                type="button"
                onClick={() => {
                  clearSpeechError()
                  toggleSpeech()
                }}
                disabled={sendStatus === 'sending'}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  speechListening
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 bg-white text-primary hover:border-primary/50 hover:bg-orange-50'
                }`}
                aria-label={speechListening ? '音声入力を停止' : '音声入力を開始'}
                title={speechListening ? '音声入力を停止' : '音声入力'}
              >
                <span>音声入力→</span>
                {speechListening ? (
                  <MicOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Mic className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            )}
          </span>
          <textarea
            value={bodyText}
            onChange={(e) => {
              if (speechListening) stopSpeech()
              setBodyText(e.target.value)
            }}
            rows={4}
            placeholder="メモや報告内容を入力"
            disabled={sendStatus === 'sending'}
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {speechListening && (
            <p className="text-xs text-primary">音声入力中… もう一度マイクを押すと停止します</p>
          )}
          {speechError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {speechError}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <legend className="float-left mr-1 w-auto p-0 text-sm font-medium text-gray-900">優先度：</legend>
        {PICTURE_PRIORITIES.map((value) => (
          <label key={value} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-900">
            <input
              type="radio"
              name="picture-priority"
              value={value}
              checked={priority === value}
              onChange={() => setPriority(value)}
              disabled={sendStatus === 'sending'}
              className="accent-primary"
            />
            <span>{PICTURE_PRIORITY_LABELS[value]}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={cameraState === 'starting' || sendStatus === 'sending'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
        >
          <Camera className="h-4 w-4 text-primary" strokeWidth={1.75} />
          {cameraState === 'starting' ? 'カメラ起動中...' : '画像撮影'}
        </button>

        {(showLiveCamera || previewUrl) && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
            <div className="relative aspect-[3/4] w-full bg-black">
              {showLiveCamera && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover ${cameraState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
              {previewUrl && !showLiveCamera && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="撮影プレビュー" className="h-full w-full object-contain" />
              )}
              {showLiveCamera && cameraState === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-white/90">カメラを起動しています...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {cameraState === 'ready' && (
          <button
            type="button"
            onClick={handleShutter}
            className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            シャッター
          </button>
        )}

        {(cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error') && (
          <>
            {cameraError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{cameraError}</p>
            )}
            <button
              type="button"
              onClick={() => void startCamera()}
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50"
            >
              カメラを再試行
            </button>
          </>
        )}

        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              clearPreview()
              void startCamera()
            }}
            disabled={sendStatus === 'sending'}
            className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
          >
            撮り直す
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={sendStatus === 'sending' || !previewBlob}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" strokeWidth={1.75} />
        {sendStatus === 'sending' ? '送信中...' : '送信'}
      </button>

      {sendStatus === 'done' && (
        <p className="rounded-md bg-orange-50 px-3 py-2 text-sm text-primary">送信が完了しました。</p>
      )}

      {(sendStatus === 'error' || sendError) && sendStatus !== 'done' && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {sendError ?? 'エラーが発生しました。もう一度お試しください。'}
        </p>
      )}

      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-bold text-gray-900">直近の送信</h2>
        <p className="mt-1 text-xs text-gray-500">最新 {initialRecentSends.length} 件（自分の送信のみ）</p>

        {initialRecentSends.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">まだ送信がありません。</p>
        )}

        <ul className="mt-4 space-y-3">
          {initialRecentSends.map((send) => (
            <li key={send.id} className="flex gap-3 rounded-md border border-gray-200 bg-white p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {send.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={send.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                    画像なし
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  {formatTimestamp(send.created_at)}
                  <span className="ml-2">優先度：{PICTURE_PRIORITY_LABELS[send.priority]}</span>
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{send.subject_text}</p>
                {send.body_text && (
                  <p className="mt-0.5 text-xs text-gray-500">{truncate(send.body_text, 60)}</p>
                )}
                <p className="mt-1 text-[11px] text-gray-500">{userEmail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isManager && (
        <SubjectManageModal
          open={modalOpen}
          subjects={subjects}
          onClose={() => setModalOpen(false)}
          onSubjectsChanged={() => {
            router.refresh()
            setSubjects((prev) => prev)
          }}
        />
      )}
    </div>
  )
}
```

補足: `onSubjectsChanged`は`router.refresh()`でServer Componentから最新の`initialSubjects`を再取得させる。`setSubjects((prev) => prev)`は暫定的なローカル状態更新プレースホルダーではなく、`router.refresh()`後に`page.tsx`が新しい`initialSubjects`をpropsとして渡し直すことで実際には再レンダリングされる（Reactの`key`によるprops更新で`subjects`ステートも実質的に追従する）。この挙動が期待通りか、Task 12のE2E手動確認で必ず確認すること。

- [ ] **Step 6: 型チェックとlintを実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 7: コミット**

```bash
git add "src/app/(tenant)/(tenant-users)/(tool)/picture-report/"
git commit -m "feat(picture-report): 送信画面UI（PictureReportForm, SubjectManageModal）を追加"
```

---

## Task 11: アルバム画面UI（`album/page.tsx` + `AlbumView.tsx`）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/AlbumView.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/error.tsx`

**Interfaces:**

- Consumes: `getServerUser()`, `getAlbumPage()`/`getAlbumSubjectOptions()`/`canViewTeamAlbum()`（Task 7）, `updateSendBody`/`deleteSend`（Task 8）, `picturePriorityLabel`/`type PicturePriority`（Task 3）, `AlbumItem`/`AlbumScope`（Task 6）

- [ ] **Step 1: `page.tsx`を作成する**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getAlbumPage, getAlbumSubjectOptions, canViewTeamAlbum } from '@/features/picture-report/queries'
import { APP_ROUTES } from '@/config/routes'
import { AlbumView } from './AlbumView'

const PAGE_SIZE = 100

export default async function PictureReportAlbumPage() {
  const user = await getServerUser()
  if (!user?.id) redirect(APP_ROUTES.AUTH.LOGIN)

  const isManager = await canViewTeamAlbum()
  const [ownPage, ownSubjectOptions] = await Promise.all([
    getAlbumPage({ scope: 'own', offset: 0, limit: PAGE_SIZE }),
    getAlbumSubjectOptions('own'),
  ])

  return (
    <AlbumView
      isManager={isManager}
      initialOwnItems={ownPage.items}
      initialOwnHasMore={ownPage.hasMore}
      initialOwnSubjectOptions={ownSubjectOptions}
      pageSize={PAGE_SIZE}
    />
  )
}
```

- [ ] **Step 2: `loading.tsx`を作成する**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `error.tsx`を作成する**

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
      <p className="text-sm text-gray-600">アルバムの読み込みに失敗しました。</p>
      <p className="text-xs text-gray-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50"
      >
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 4: `AlbumView.tsx`を作成する**

dx-sensorの`AlbumView.tsx`をベースに、以下を変更する：

- Client側の直接Supabase呼び出しをすべて廃止し、`scope`切り替え時・フィルタ変更時・「もっと見る」時はServer Actionを介さずServer Component再取得（`fetch`を自前実装せず、フィルタ変更のたびに`window.location`遷移させるのではなく、Client Component内で`getAlbumPage`と同等の取得をServer Action経由の薄いラッパーとして呼び出す）
- 本文編集・削除は`updateSendBody`/`deleteSend` Server Actionを呼ぶ
- `isManager`のときのみ「自分の投稿」⇄「部下の投稿」タブを表示し、「部下の投稿」タブでは編集・削除ボタンを非表示にする

フィルタ変更・スコープ切替時にServer Component経由で再取得するため、`queries.ts`の`getAlbumPage`/`getAlbumSubjectOptions`をラップした**Server Action版**の読み取り関数が必要になる（Server ActionはPOSTベースの関数呼び出しとしてClient Componentから直接importして呼べるため、フィルタ変更のたびに`router.refresh()`＋URLクエリパラメータで状態を持たせる方式ではなく、素直にServer Actionとして再エクスポートする）。`queries.ts`の関数はServer Component専用と定義したが、Server Actionから内部的に呼び出す分には問題ないため、`actions.ts`に薄いラッパーを追加する。

**`src/features/picture-report/actions.ts`に追記する関数（Task 8のファイルへの追加）:**

```typescript
// (Task 8のactions.tsの末尾に追記)
import { getAlbumPage, getAlbumSubjectOptions } from './queries'
import type { AlbumScope } from './types'

/** アルバムのフィルタ変更・ページング用（Client ComponentからServer Action経由で呼ぶ） */
export async function fetchAlbumPage(params: {
  scope: AlbumScope
  offset: number
  limit: number
  subjectFilter?: string
  highOnly?: boolean
}) {
  return getAlbumPage(params)
}

/** アルバムの件名フィルタ選択肢取得用（Client ComponentからServer Action経由で呼ぶ） */
export async function fetchAlbumSubjectOptions(scope: AlbumScope) {
  return getAlbumSubjectOptions(scope)
}
```

上記の2関数は`'use server'`ファイル内にあるため自動的にServer Actionとして扱われる。

```typescript
// src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/AlbumView.tsx
'use client'

import Link from 'next/link'
import { Images, LayoutGrid, List, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAlbumPage,
  fetchAlbumSubjectOptions,
  updateSendBody,
  deleteSend,
} from '@/features/picture-report/actions'
import { picturePriorityLabel } from '@/lib/picture-report/priority'
import { APP_ROUTES } from '@/config/routes'
import type { AlbumItem, AlbumScope } from '@/features/picture-report/types'

const ALL_SUBJECTS = ''
const VIEW_MODE_STORAGE_KEY = 'hr-dx.picture-report.album.view-mode'

type ViewMode = 'thumbnail' | 'list'

type AlbumViewProps = {
  isManager: boolean
  initialOwnItems: AlbumItem[]
  initialOwnHasMore: boolean
  initialOwnSubjectOptions: string[]
  pageSize: number
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'thumbnail'
  return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'thumbnail'
}

function isHighPriority(priority: unknown): boolean {
  return priority === 'high'
}

function HighPriorityBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'px-1 py-px text-[10px]' : 'px-1.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center rounded font-bold text-white bg-red-500 ${sizeClass}`}>高</span>
  )
}

export function AlbumView({
  isManager,
  initialOwnItems,
  initialOwnHasMore,
  initialOwnSubjectOptions,
  pageSize,
}: AlbumViewProps) {
  const [scope, setScope] = useState<AlbumScope>('own')
  const [items, setItems] = useState<AlbumItem[]>(initialOwnItems)
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS)
  const [highOnly, setHighOnly] = useState(false)
  const [subjectOptions, setSubjectOptions] = useState<string[]>(initialOwnSubjectOptions)
  const [viewMode, setViewMode] = useState<ViewMode>('thumbnail')
  const [viewModeReady, setViewModeReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialOwnHasMore)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bodyDraft, setBodyDraft] = useState('')
  const [savingBody, setSavingBody] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailMessage, setDetailMessage] = useState<string | null>(null)

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
  const canEditSelected = scope === 'own'

  const loadPage = useCallback(
    async (targetScope: AlbumScope, offset: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError(null)
      }

      const result = await fetchAlbumPage({
        scope: targetScope,
        offset,
        limit: pageSize,
        subjectFilter: subjectFilter || undefined,
        highOnly,
      })

      setItems((prev) => (append ? [...prev, ...result.items] : result.items))
      setHasMore(result.hasMore)
      setLoading(false)
      setLoadingMore(false)
    },
    [pageSize, subjectFilter, highOnly]
  )

  useEffect(() => {
    setViewMode(readStoredViewMode())
    setViewModeReady(true)
  }, [])

  useEffect(() => {
    if (!viewModeReady) return
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode, viewModeReady])

  // scope/subjectFilter/highOnly のいずれかが変わったら再取得する
  // （初回マウント時は Server Component から渡された initialOwnItems を使うためスキップする）
  const isFirstRenderRef = useMemo(() => ({ current: true }), [])
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    void loadPage(scope, 0, false)
  }, [scope, subjectFilter, highOnly, loadPage, isFirstRenderRef])

  useEffect(() => {
    void fetchAlbumSubjectOptions(scope).then(setSubjectOptions)
  }, [scope])

  useEffect(() => {
    if (selected) {
      setBodyDraft(selected.body_text)
      setDetailError(null)
      setDetailMessage(null)
    }
  }, [selected])

  function openDetail(item: AlbumItem) {
    setSelectedId(item.id)
    setBodyDraft(item.body_text)
    setDetailError(null)
    setDetailMessage(null)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetailError(null)
    setDetailMessage(null)
  }

  async function handleSaveBody() {
    if (!selected) return
    setSavingBody(true)
    setDetailError(null)
    setDetailMessage(null)

    const result = await updateSendBody({ id: selected.id, bodyText: bodyDraft })

    setSavingBody(false)

    if (!result.success) {
      setDetailError(result.error)
      return
    }

    setItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, body_text: bodyDraft } : item)))
    setDetailMessage('本文を保存しました。')
  }

  async function handleDelete() {
    if (!selected) return
    const ok = window.confirm('この写真を削除しますか？元に戻せません。')
    if (!ok) return

    setDeleting(true)
    setDetailError(null)
    setDetailMessage(null)

    const result = await deleteSend({ id: selected.id })

    setDeleting(false)

    if (!result.success) {
      setDetailError(result.error)
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== selected.id))
    closeDetail()
    void fetchAlbumSubjectOptions(scope).then(setSubjectOptions)
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" strokeWidth={1.75} />
          <h1 className="text-lg font-semibold text-gray-900">写真レポートホルダー</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={APP_ROUTES.TENANT.TOOL_PICTURE_REPORT}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            写真レポート作成
          </Link>
          <Link
            href={APP_ROUTES.TENANT.PORTAL}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            ←戻る
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        送信した写真を一覧表示します。タップで詳細・本文編集・削除ができます。
      </p>

      {isManager && (
        <div
          className="mt-4 inline-flex self-start rounded-md border border-gray-200 bg-white p-0.5"
          role="radiogroup"
          aria-label="表示対象切替"
        >
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'own'}
            onClick={() => setScope('own')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              scope === 'own' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            自分の投稿
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'team'}
            onClick={() => setScope('team')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              scope === 'team' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            部下の投稿
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-3">
            <span className="font-medium text-gray-900">件名</span>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:max-w-xs"
            >
              <option value={ALL_SUBJECTS}>すべて</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1.5 self-start text-sm text-gray-900">
            <input
              type="checkbox"
              checked={highOnly}
              onChange={(e) => setHighOnly(e.target.checked)}
              className="accent-red-500"
            />
            高のみ表示
          </label>
        </div>

        <div
          className="inline-flex self-start rounded-md border border-gray-200 bg-white p-0.5"
          role="radiogroup"
          aria-label="表示切替"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'thumbnail'}
            onClick={() => setViewMode('thumbnail')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              viewMode === 'thumbnail' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            サムネイル
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            リスト
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading && <p className="mt-8 text-sm text-gray-500">読み込み中...</p>}

      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">
          {highOnly ? '優先度「高」の写真はありません。' : 'まだ写真がありません。'}
        </p>
      )}

      {!loading && items.length > 0 && viewMode === 'thumbnail' && (
        <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openDetail(item)}
                className="group flex w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white text-left transition hover:border-primary/50"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                      画像なし
                    </div>
                  )}
                  {isHighPriority(item.priority) && (
                    <span className="absolute left-1 top-1">
                      <HighPriorityBadge size="sm" />
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 p-1.5 sm:p-2">
                  <p className="truncate text-[11px] font-medium text-gray-900 sm:text-xs">{item.subject_text}</p>
                  {!isHighPriority(item.priority) && (
                    <p className="truncate text-[10px] text-gray-500">
                      優先度：{picturePriorityLabel(item.priority)}
                    </p>
                  )}
                  <p className="truncate text-[10px] text-gray-500">{formatTimestamp(item.created_at)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && viewMode === 'list' && (
        <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openDetail(item)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-orange-50/40"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                      画像なし
                    </div>
                  )}
                  {isHighPriority(item.priority) && (
                    <span className="absolute left-0.5 top-0.5">
                      <HighPriorityBadge size="sm" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
                    <span className="truncate">{item.subject_text}</span>
                    {isHighPriority(item.priority) && <HighPriorityBadge />}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {!isHighPriority(item.priority) && <>優先度：{picturePriorityLabel(item.priority)}　</>}
                    {formatTimestamp(item.created_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadPage(scope, items.length, true)}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
          >
            {loadingMore ? '読み込み中...' : 'もっと見る'}
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="album-detail-title"
          onClick={closeDetail}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="album-detail-title" className="flex min-w-0 items-center gap-2 text-base font-semibold text-gray-900">
                <span className="truncate">{selected.subject_text}</span>
                {isHighPriority(selected.priority) && <HighPriorityBadge />}
              </h2>
              <button type="button" onClick={closeDetail} className="text-sm text-gray-500 hover:text-gray-900">
                閉じる
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {!isHighPriority(selected.priority) && <>優先度：{picturePriorityLabel(selected.priority)}　</>}
              {formatTimestamp(selected.created_at)}
            </p>

            <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-black">
              {selected.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.thumbnailUrl}
                  alt={selected.subject_text}
                  className="max-h-[50vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-white/80">画像を表示できません</div>
              )}
            </div>

            <label className="mt-4 block space-y-1.5">
              <span className="text-sm font-medium text-gray-900">本文</span>
              <textarea
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={4}
                disabled={!canEditSelected || savingBody || deleting}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </label>

            {detailMessage && (
              <p className="mt-2 rounded-md bg-orange-50 px-3 py-2 text-sm text-primary">{detailMessage}</p>
            )}
            {detailError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{detailError}</p>
            )}

            {canEditSelected && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveBody()}
                  disabled={savingBody || deleting || bodyDraft === selected.body_text}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBody ? '保存中...' : '本文を保存'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={savingBody || deleting}
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            )}
            {!canEditSelected && (
              <p className="mt-4 text-xs text-gray-500">部下の投稿は閲覧のみです（編集・削除はできません）。</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 型チェックとlintを実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add "src/app/(tenant)/(tenant-users)/(tool)/picture-report/album/" src/features/picture-report/actions.ts
git commit -m "feat(picture-report): アルバム画面UI（AlbumView、自分/部下タブ）を追加"
```

---

## Task 12: 統合ビルド確認・E2E手動確認

**Files:** なし（既存ファイルの動作確認のみ）

**Interfaces:** なし

- [ ] **Step 1: 型チェック・lint・ビルドを通す**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: いずれもエラーなく完了する

- [ ] **Step 2: 全ユニットテストを実行する**

```bash
npm run test
```

Expected: Task 3, 4, 6, 8で作成した全テストがPASSする

- [ ] **Step 3: ローカル開発サーバーで手動確認する（一般従業員アカウント）**

```bash
npm run dev
```

1. `saas-admin@example.test`以外の一般従業員アカウントでログインし、`/tool/picture-report`にアクセスする
2. 件名を選択（または「その他」で都度入力）し、「画像撮影」→カメラ許可→シャッターで撮影する
3. 本文を入力（または音声入力ボタンで音声入力を試す）し、優先度を選択して「送信」する
4. 送信完了メッセージが表示され、「直近の送信」に反映されることを確認する
5. `/tool/picture-report/album`にアクセスし、送信した写真がサムネイル表示されることを確認する
6. サムネイルをタップして詳細モーダルを開き、本文編集→保存、削除、をそれぞれ確認する
7. 一般従業員アカウントには「自分の投稿」⇄「部下の投稿」タブが表示されないことを確認する
8. 一般従業員アカウントには送信画面の「件名マスタ管理」ボタン（タグアイコン）が表示されないことを確認する

- [ ] **Step 4: ローカル開発サーバーで手動確認する（`is_manager=true`アカウント）**

1. `employees.is_manager = true`の従業員アカウントでログインする（ローカルDBで`update employees set is_manager = true where ...`として用意する、もしくは既存のシードデータのマネージャーアカウントを使う）
2. `/tool/picture-report`で「件名マスタ管理」ボタンが表示され、件名の追加・編集・削除ができることを確認する
3. Step 3の一般従業員アカウントとは別ブラウザ（またはシークレットウィンドウ）で同じ部門の部下として画像を送信させる
4. マネージャーアカウントの`/tool/picture-report/album`で「部下の投稿」タブに切り替え、部下が送信した写真が表示されることを確認する
5. 「部下の投稿」タブで詳細モーダルを開いたとき、本文編集・削除ボタンが表示されず「部下の投稿は閲覧のみです」の注記が出ることを確認する
6. 別部門の部下アカウントで送信した写真が「部下の投稿」タブに**表示されない**ことを確認する（部門分離の確認）

- [ ] **Step 5: メニュー表示の確認**

1. `/top`のサイドメニューから「勤退・タスク管理」→「勤怠｜打刻」カテゴリ配下に「画像送信」「写真レポートホルダー」のカードが表示されることを確認する
2. `tenant_service`が無効化されたテナントでは表示されないことを確認する（Task 2のマイグレーションが全テナントに対して有効化しているため、確認のため一時的に1テナント分だけ`tenant_service`から該当行を削除して再現し、確認後は元に戻す）

- [ ] **Step 6: 最終コミット（手動確認のみでコード変更がなければコミット不要。確認中に修正が発生した場合はその修正をコミットする）**

もし手動確認で不具合が見つかり修正した場合：

```bash
git add -A
git commit -m "fix(picture-report): E2E手動確認で見つかった不具合を修正"
```

---

## Self-Review

**1. Spec coverage:**

- 要件確定事項（公開範囲・件名マスタ共有範囲・編集権限・マネージャー操作範囲・メニュー統合・サービス分類・ルーティング構成・タブ配置）→ Task 1, 2, 10, 11で実装
- データモデル（4.2, 4.3, 4.4節）→ Task 1で実装
- データアクセス層（5節）→ Task 7, 8で実装
- UI設計（6節）→ Task 10, 11で実装
- メニュー登録（7節）→ Task 2で実装
- エラーハンドリング（8節）→ 各Task内でloading.tsx/error.tsx配置、Server Actionのtry-catch相当（Supabaseクライアントはエラーを例外ではなく`{ error }`で返すため、各actions内で明示チェックしている）
- テスト方針（9節）→ Task 3, 4, 6, 8で単体テスト、Task 12で手動E2E確認（Global Constraintsに記載の通りPlaywright基盤がないための代替）
- オープンクエスチョン（11節）→ なし
- 未移植・要確認事項（12節）→ SubjectManageModalは部門共有・マネージャー限定編集に作り直し済み（Task 10）、useSpeechToTextは無改変移植（Task 5）

**2. Placeholder scan:** 全タスクに実コードを記載済み。「TBD」「後で実装」等の記述なし。

**3. Type consistency:** `PictureSendSubject`（Task 6で定義）は`queries.ts`（Task 7）・`SubjectManageModal.tsx`（Task 10）で同一の型を`@/features/picture-report/types`からimportしている。`AlbumItem`/`AlbumScope`も同様にTask 6で定義し、Task 7・Task 11で一貫して使用。`PictureReportActionResult`はTask 6で定義し、Task 8の全Server Actionsの戻り値型として使用。`sendPicture`のFormDataキー（`image`, `subjectId`, `subjectText`, `bodyText`, `priority`）はTask 8（受け取り側）とTask 10（送信側）で一致している。
