'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { sendMail, formatExpiryDate } from '@/lib/mail/send'
import { createLifecycleInstance, ensureOffboardingInstance } from '@/features/lifecycle/actions'
import { toJSTDateString } from '@/lib/datetime'

const ADM_PATH = APP_ROUTES.TENANT.ADMIN

type TenantActionCtx =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; tenantId: string }
  | { ok: false; error: string }

/** Server Action 用: ログインユーザのテナントコンテキスト */
async function requireTenantActionContext(): Promise<TenantActionCtx> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }
  return { ok: true, supabase: await createClient(), tenantId: user.tenant_id }
}

async function assertDivisionInTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  divisionId: string,
  tenantId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('divisions')
    .select('id')
    .eq('id', divisionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return !!data
}

async function assertEmployeeInTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  tenantId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return !!data
}

// メールリンクの有効期間: 2週間（336時間）
const INVITE_EXPIRY_HOURS = 336

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendInviteEmailToEmployee(supabase: any, email: string, userId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // GoTrue をバイパス: RPC でリカバリートークンを生成
  const { data: token, error: tokenError } = await supabase.rpc('generate_recovery_token', {
    p_user_id: userId,
    p_expiry_hours: INVITE_EXPIRY_HOURS,
  })

  if (tokenError) {
    throw new Error(`リカバリートークン生成失敗: ${tokenError.message}`)
  }

  const actionLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  const expiryFormatted = formatExpiryDate(INVITE_EXPIRY_HOURS * 3600)

  await sendMail({
    to: email,
    subject: 'パスワード設定',
    html: `<p>hr-dxシステムへパスワードを設定してください。パスワード設定は<a href="${actionLink}">ここ</a>。</p>
<p>このメールの有効期限は${expiryFormatted}までです。</p>`,
  })

  console.log(`招待メール送信完了: ${email}（有効期限: ${expiryFormatted}）`)
}

// =====================================================
// Division Actions
// =====================================================

export async function createDivision(data: {
  name: string
  code?: string
  layer?: number
  parent_id?: string | null
  tenant_id: string
}) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  if (data.tenant_id !== ctx.tenantId) {
    return { success: false, error: '他テナントの部署は作成できません。' }
  }
  if (data.parent_id) {
    const parentOk = await assertDivisionInTenant(ctx.supabase, data.parent_id, ctx.tenantId)
    if (!parentOk) {
      return { success: false, error: '親部署が自テナントに存在しません。' }
    }
  }

  const { data: result, error } = await ctx.supabase.from('divisions').insert(data).select().single()

  if (error) {
    console.error('createDivision error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/divisions`)
  return { success: true, data: result }
}

export async function updateDivision(
  id: string,
  updates: {
    name?: string
    code?: string
    layer?: number
    parent_id?: string | null
  }
) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertDivisionInTenant(ctx.supabase, id, ctx.tenantId)
  if (!owned) return { success: false, error: '部署が見つからないか、操作権限がありません。' }
  if (updates.parent_id) {
    const parentOk = await assertDivisionInTenant(ctx.supabase, updates.parent_id, ctx.tenantId)
    if (!parentOk) {
      return { success: false, error: '親部署が自テナントに存在しません。' }
    }
  }

  const { data: result, error } = await ctx.supabase
    .from('divisions')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) {
    console.error('updateDivision error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/divisions`)
  return { success: true, data: result }
}

export async function deleteDivision(id: string) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertDivisionInTenant(ctx.supabase, id, ctx.tenantId)
  if (!owned) return { success: false, error: '部署が見つからないか、操作権限がありません。' }

  const { error } = await (
    ctx.supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('delete_division_safe', {
    p_division_id: id,
    p_tenant_id: ctx.tenantId,
  })

  if (error) {
    console.error('deleteDivision error:', error)
    if (error.message.includes('child_divisions_exist')) {
      return { success: false, error: '子部署があるため削除できません。先に子部署を移動または削除してください。' }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/divisions`)
  return { success: true }
}

// =====================================================
// Employee Actions
// =====================================================

export async function createEmployee(data: {
  name: string
  email?: string
  employee_no?: string
  division_id?: string | null
  active_status?: string
  is_manager?: boolean
  app_role_id?: string | null
  job_title?: string
  sex?: string
  start_date?: string
  tenant_id: string
}) {
  if (data.tenant_id) {
    const ctx = await requireTenantActionContext()
    if (ctx.ok === false) return { success: false, error: ctx.error }
    if (data.tenant_id !== ctx.tenantId) {
      return { success: false, error: '他テナントの従業員は登録できません。' }
    }
    if (data.division_id) {
      const divOk = await assertDivisionInTenant(ctx.supabase, data.division_id, ctx.tenantId)
      if (!divOk) {
        return { success: false, error: '所属部署が自テナントに存在しません。' }
      }
    }
  }

  const supabaseAdmin = createAdminClient()

  // tenants.max_employees を超える登録は不可
  const supabase = await createClient()
  const [{ data: tenant, error: tenantError }, { count, error: countError }] = await Promise.all([
    supabase.from('tenants').select('max_employees').eq('id', data.tenant_id).maybeSingle(),
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', data.tenant_id),
  ])

  if (tenantError) {
    console.error('createEmployee tenant fetch error:', tenantError)
    return { success: false, error: 'テナント上限の取得に失敗しました。' }
  }
  if (countError) {
    console.error('createEmployee employee count error:', countError)
    return { success: false, error: '登録済み従業員数の取得に失敗しました。' }
  }

  // DB の check_max_employees と同様、上限は数値が取れたときのみ適用（NULL は未設定＝チェックしない）
  const maxEmployees = tenant?.max_employees
  const hasFiniteLimit = typeof maxEmployees === 'number' && Number.isFinite(maxEmployees)
  if (hasFiniteLimit) {
    const limit = maxEmployees
    const registered = typeof count === 'number' ? count : 0
    if (registered >= limit) {
      const error =
        limit === 0
          ? '従業員の登録上限が0名に設定されているため、新規登録できません。システム管理者に上限の変更を依頼してください。'
          : `従業員の登録上限（${limit}名）に達しています。不要な従業員を削除してから再度お試しください。`
      return { success: false, error }
    }
  }

  let user_id: string | null = null

  if (data.email) {
    // GoTrue をバイパス: RPC で auth.users に直接ユーザーを作成
    const tempPassword = `Temp_${Math.random().toString(36).slice(2, 10)}!`
    const { data: newUserId, error: authError } = await supabaseAdmin.rpc('create_auth_user', {
      p_email: data.email,
      p_password: tempPassword,
    })

    if (authError) {
      console.error('ユーザー作成エラー:', authError)
      return { success: false, error: `ユーザー作成失敗: ${authError.message}` }
    }
    user_id = newUserId as string
  }

  const payload: Record<string, unknown> = { ...data }
  delete payload.email // DBには存在しないカラムを削除
  if (user_id) {
    payload.user_id = user_id
    payload.active_status = payload.active_status ?? '承認済'
  }

  const { data: result, error } = await supabase.from('employees').insert(payload).select().single()

  if (error) {
    // ロールバック: 作成した auth ユーザーを削除
    if (user_id) {
      await supabaseAdmin.rpc('delete_auth_user', { p_user_id: user_id })
    }
    console.error('createEmployee error:', error)
    return { success: false, error: error.message }
  }

  // 招待メール送信
  if (data.email && user_id) {
    try {
      await sendInviteEmailToEmployee(supabaseAdmin, data.email, user_id)
    } catch (emailError) {
      console.warn('招待メールの送信に失敗しました:', emailError)
    }
  }

  // 入社フローを自動生成する（start_dateが設定されている場合のみ。
  // 失敗しても従業員登録自体は失敗させない＝あくまで補助的な処理）
  if (result?.id && data.start_date) {
    try {
      await createLifecycleInstance({
        employeeId: result.id,
        lifecycleType: 'onboarding',
        scheduledDate: data.start_date,
      })
    } catch (e) {
      console.warn('入社フローの自動生成に失敗しました:', e)
    }
  }

  revalidatePath(`${ADM_PATH}/employees`)
  revalidatePath(`${ADM_PATH}/divisions`)
  return { success: true, data: result }
}

export async function updateEmployee(
  id: string,
  updates: {
    name?: string
    employee_no?: string
    division_id?: string | null
    active_status?: string
    is_manager?: boolean
    app_role_id?: string | null
    job_title?: string
    sex?: string
    start_date?: string
  }
) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertEmployeeInTenant(ctx.supabase, id, ctx.tenantId)
  if (!owned) return { success: false, error: '従業員が見つからないか、操作権限がありません。' }
  if (updates.division_id) {
    const divOk = await assertDivisionInTenant(ctx.supabase, updates.division_id, ctx.tenantId)
    if (!divOk) {
      return { success: false, error: '所属部署が自テナントに存在しません。' }
    }
  }

  // 退職ステータスへの変更を検知するため、更新前の active_status を取得
  let previousActiveStatus: string | null = null
  if (updates.active_status === 'inactive') {
    const { data: before } = await ctx.supabase
      .from('employees')
      .select('active_status')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()
    previousActiveStatus = before?.active_status ?? null
  }

  const { data: result, error } = await ctx.supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) {
    console.error('updateEmployee error:', error)
    return { success: false, error: error.message }
  }

  // 退職（inactive）への変更時に退社フローを自動開始（失敗しても従業員更新は成功扱い）
  if (
    updates.active_status === 'inactive' &&
    previousActiveStatus !== 'inactive' &&
    result?.id
  ) {
    try {
      await ensureOffboardingInstance(result.id, toJSTDateString())
    } catch (e) {
      console.warn('退社フローの自動生成に失敗しました:', e)
    }
  }

  revalidatePath(`${ADM_PATH}/employees`)
  revalidatePath(`${ADM_PATH}/divisions`)
  revalidatePath('/adm/lifecycle')
  return { success: true, data: result }
}

export async function deleteEmployee(id: string) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertEmployeeInTenant(ctx.supabase, id, ctx.tenantId)
  if (!owned) return { success: false, error: '従業員が見つからないか、操作権限がありません。' }

  const { error } = await ctx.supabase
    .from('employees')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    console.error('deleteEmployee error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/employees`)
  revalidatePath(`${ADM_PATH}/divisions`)
  return { success: true }
}

// =====================================================
// 所属変更（割当・異動）
// =====================================================

export async function assignEmployeeToDivision(employeeId: string, divisionId: string | null) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertEmployeeInTenant(ctx.supabase, employeeId, ctx.tenantId)
  if (!owned) return { success: false, error: '従業員が見つからないか、操作権限がありません。' }
  if (divisionId) {
    const divOk = await assertDivisionInTenant(ctx.supabase, divisionId, ctx.tenantId)
    if (!divOk) return { success: false, error: '部署が自テナントに存在しません。' }
  }

  const { error } = await ctx.supabase
    .from('employees')
    .update({ division_id: divisionId })
    .eq('id', employeeId)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    console.error('assignEmployeeToDivision error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/divisions`)
  revalidatePath(`${ADM_PATH}/employees`)
  return { success: true }
}

// =====================================================
// 従業員への招待メール再送
// =====================================================

export async function resendEmployeeInviteEmail(employeeId: string) {
  const ctx = await requireTenantActionContext()
  if (ctx.ok === false) return { success: false, error: ctx.error }
  const owned = await assertEmployeeInTenant(ctx.supabase, employeeId, ctx.tenantId)
  if (!owned) return { success: false, error: '従業員が見つからないか、操作権限がありません。' }

  const { data: emp, error: empError } = await ctx.supabase
    .from('employees')
    .select('user_id, name')
    .eq('id', employeeId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (empError || !emp?.user_id) {
    return { success: false, error: '従業員またはユーザーIDが見つかりません' }
  }

  const supabaseAdmin = createAdminClient()

  // auth.users からメールアドレスを取得（RPC経由）
  const { data: email, error: emailError } = await supabaseAdmin.rpc('get_auth_user_email', {
    p_user_id: emp.user_id,
  })

  if (emailError || !email) {
    return { success: false, error: `メールアドレスの取得に失敗: ${emailError?.message}` }
  }

  try {
    await sendInviteEmailToEmployee(supabaseAdmin, email, emp.user_id)
    return { success: true }
  } catch (err) {
    console.error('招待メール再送エラー:', err)
    return { success: false, error: err instanceof Error ? err.message : '不明なエラー' }
  }
}
