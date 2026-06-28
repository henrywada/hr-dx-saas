# 悩み・相談窓口 v2: 宛先選択・Claimロック設計

> 前提: `docs/superpowers/specs/2026-06-27-consultation-desk-design.md`（v1、既にmainにマージ済み）を置き換える追加設計。
> v1で実装済みの「対応者から見て匿名」の表示層マスク（`sanitizeConsultationForViewer`/`sanitizeReplyForViewer`）はそのまま維持する。

## 1. 背景・問題

v1では5ロール（hr, hr_manager, company_doctor, company_nurse, hsc）全員が全相談を無条件に閲覧できる共有キュー方式だった。これは、メンタルヘルス相談のような医療機密性の高い内容が人事にも見えてしまうという実害があり、本プロジェクトの既存パターン（ストレスチェックの `sc_results_select_hr_consented`：人事は本人同意がない限り結果を見られない、産業医・保健師は常時アクセス可）と矛盾していた。v2では相談者自身が宛先を選択し、対応者が明示的にclaim（対応宣言）した後は1対1のスレッドに限定する。

## 2. 入力フロー（相談者側）

1. **匿名希望**: 「匿名を希望する」/「匿名を希望しない」の二択（チェックボックスではなく明示選択。v1の `is_anonymous` boolean は維持、UIのみ変更）
2. **カテゴリ**: 既存5種（harassment / mental_health / workload / interpersonal / other）を維持
3. **宛先**: まず大分類を選択
   - 「産業医・保健師」→ `target_type = 'medical_staff'`（company_doctor・company_nurseの誰でも対応可、産業医/保健師間でのさらなる絞り込みはしない）
   - 「その他」→ さらに以下から1つ選択
     - 人事 → `target_type = 'hr'`
     - 人事責任者 → `target_type = 'hr_manager'`
     - 上司 → `target_type = 'manager'` + `target_employee_id` で具体的な1名を指名
     - 安全衛生委員 → `target_type = 'hsc'`
     - 誰でもいい → `target_type = 'other_any'`（hr / hr_manager / 上司全員 / hsc の誰でも対応可）

### 「上司」の指名方法

自分の直属上司に固定しない（直属上司だと匿名性が実質失われるため）。`employees WHERE tenant_id = 自分のtenant AND is_manager = true` の一覧から、相談者が**任意の1名**を指名する。`employees_select_same_tenant` の既存RLSにより、この一覧取得に新規ポリシーは不要。

## 3. 対応フロー（スタッフ側）

1. 対象ロール（または `target_employee_id` に指名された本人）の画面に、未claimの相談が「未対応」として表示される
2. 誰か1人が「対応します」ボタンを押す → **アトミックなclaim操作**
   - `UPDATE consultations SET claimed_by = :me, claimed_at = now() WHERE id = :id AND claimed_by IS NULL`
   - 更新行数が0件なら「既に他の方が対応中です」エラーを返す（楽観的ロック、競合解消）
3. claim成功後、その相談の**本文・返信スレッド全体**が、相談者本人とclaimした1名にのみ見える。同じ宛先グループの他メンバーも含め、それ以外には完全に非表示になる（v1の「未対応一覧に表示されたままだが返信だけ見えない」ではなく、claim後は一覧からも消える）
4. 返信（`replyToConsultation`）は claim 後のみ可能。claim前のreply投稿は拒否する

## 4. データモデル変更

```sql
ALTER TABLE public.consultations
  ADD COLUMN target_type TEXT NOT NULL DEFAULT 'other_any'
    CHECK (target_type IN ('medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any')),
  ADD COLUMN target_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_by UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_at TIMESTAMPTZ;

-- target_type='manager' のときのみ target_employee_id が必須、他では NULL
ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_target_employee_id_check
    CHECK (
      (target_type = 'manager' AND target_employee_id IS NOT NULL)
      OR (target_type <> 'manager' AND target_employee_id IS NULL)
    );
```

## 5. RLS 全面差し替え

v1の `consultations_select_staff` / `consultations_update_staff` を削除し、以下に置き換える。

**宛先判定とclaim状態を組み合わせた可視性ロジック：**

```sql
DROP POLICY "consultations_select_staff" ON public.consultations;
DROP POLICY "consultations_update_staff" ON public.consultations;

CREATE POLICY "consultations_select_target_unclaimed" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  );

CREATE POLICY "consultations_select_claimed_by_me" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by = current_employee_id()
  );

-- claim操作専用の更新ポリシー：未claimの行を、宛先に該当する者だけが claimed_by=自分 に更新できる
-- WITH CHECK で claimed_by が自分自身になることのみ許可し、他人へのclaim代行や奪取を禁止
CREATE POLICY "consultations_claim" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  )
  WITH CHECK (claimed_by = current_employee_id());
```

`consultations_select_self`（相談者本人）と `consultations_insert_self` は v1のまま維持する。

`consultation_replies` のRLSも、claim前は誰も読み書きできないように変更する：

```sql
DROP POLICY "consultation_replies_select" ON public.consultation_replies;
DROP POLICY "consultation_replies_insert" ON public.consultation_replies;

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND c.claimed_by IS NOT NULL
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );
```

## 6. アプリケーション層

### 新規 Server Action: `claimConsultation`

```typescript
export async function claimConsultation(consultationId: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .update({ claimed_by: user.employee_id, claimed_at: new Date().toISOString() })
    .eq('id', consultationId)
    .is('claimed_by', null)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('既に他の方が対応中です')
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(consultationId))
}
```

更新行数（`data.length`）でclaim成否を判定する。RLSの `consultations_claim` ポリシーが「未claim＋宛先一致」のみ更新対象にするため、競合時は単純に0件更新となり、安全にエラーを返せる。

### `replyToConsultation` の変更

claim前のreplyを拒否するため、既存の「owner-or-staff」チェックを「claimed_by が設定されている AND (本人 or claimed_by=自分)」に変更する。

### 新規 query: `getEligibleManagers`

```typescript
export async function getEligibleManagers(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('is_manager', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('getEligibleManagers error:', error)
    return []
  }
  return data || []
}
```

`employees_select_same_tenant` の既存RLSにより自テナント内のみ取得される。

### UI変更

- `ConsultationForm.tsx`: 匿名トグルをラジオボタン化、宛先選択（2段階：大分類→詳細、「上司」選択時は `getEligibleManagers()` の結果からのドロップダウンを追加表示）
- `ConsultationQueueTable.tsx` / 対応者向けキューページ: claim前は「対応します」ボタンを表示、claim後は通常のリンクで詳細へ
- `ConsultationThreadView.tsx`: claim前の状態（自分が対象だが誰もclaimしていない）の場合は本文表示＋「対応します」ボタンのみ、返信フォームは非表示

## 7. 既存実装からの主な差分まとめ

| 項目            | v1（mainに実装済み）             | v2（本設計）                                                                                      |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| 可視性          | 5ロール全員が全件閲覧可          | 宛先＋claim状態で限定                                                                             |
| 対応開始        | 暗黙（最初の返信で誰でも対応可） | 明示的「対応します」ボタン、アトミックclaim                                                       |
| claim後の可視性 | （概念なし）                     | 相談者＋claimした1名のみ、それ以外は本文も含め完全非表示                                          |
| 上司            | 対象外（v1で除外）               | 「その他」内の選択肢として復活。is_manager=trueの中から相談者が任意に指名（直属上司に固定しない） |
| 匿名UI          | チェックボックス                 | 「希望する/希望しない」の明示二択                                                                 |

## 8. スコープ外（v2でも対応しない）

- claim済み相談の再割り当て（担当者の休暇等への対応） — 将来の拡張
- 産業医・保健師間のさらなる絞り込み — 現状は医療職全体で1グループ
- 安全衛生委員が複数名いる場合の更なる細分化

## 9. 自己レビュー結果

- プレースホルダー・TODO: なし
- 内部矛盾: target_type='manager'のときのみtarget_employee_id必須、というCHECK制約で一貫性を保証
- スコープ: 既存テーブルへのALTER + RLS全面差し替え + 1新規Server Action + 1新規queryで完結。単一の実装計画に収まる規模
- 曖味性: 「誰でもいい」の範囲（産業医・保健師を除く4区分）、claim後の可視性（本文含め完全非表示）はユーザーとの対話で確定済み
