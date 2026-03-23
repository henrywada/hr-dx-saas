'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { APP_ROUTES } from '@/config/routes';
import { sendMail, formatExpiryDate } from '@/lib/mail/send';

const ADM_PATH = APP_ROUTES.TENANT.ADMIN;

// メールリンクの有効期間: 2週間（336時間）
const INVITE_EXPIRY_HOURS = 336;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendInviteEmailToEmployee(supabase: any, email: string, userId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // GoTrue をバイパス: RPC でリカバリートークンを生成
  const { data: token, error: tokenError } = await supabase.rpc('generate_recovery_token', {
    p_user_id: userId,
    p_expiry_hours: INVITE_EXPIRY_HOURS,
  });

  if (tokenError) {
    throw new Error(`リカバリートークン生成失敗: ${tokenError.message}`);
  }

  const actionLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const expiryFormatted = formatExpiryDate(INVITE_EXPIRY_HOURS * 3600);

  await sendMail({
    to: email,
    subject: 'パスワード設定',
    html: `<p>hr-dxシステムへパスワードを設定してください。パスワード設定は<a href="${actionLink}">ここ</a>。</p>
<p>このメールの有効期限は${expiryFormatted}までです。</p>`,
  });

  console.log(`招待メール送信完了: ${email}（有効期限: ${expiryFormatted}）`);
}

// =====================================================
// Division Actions
// =====================================================

export async function createDivision(data: {
  name: string;
  code?: string;
  layer?: number;
  parent_id?: string | null;
  tenant_id: string;
}) {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('divisions')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('createDivision error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true, data: result };
}

export async function updateDivision(id: string, updates: {
  name?: string;
  code?: string;
  layer?: number;
  parent_id?: string | null;
}) {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('divisions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateDivision error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true, data: result };
}

export async function deleteDivision(id: string) {
  const supabase = await createClient();

  // まず所属従業員のdivision_idをnullに設定
  await supabase
    .from('employees')
    .update({ division_id: null })
    .eq('division_id', id);

  const { error } = await supabase
    .from('divisions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteDivision error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true };
}

// =====================================================
// Employee Actions
// =====================================================

export async function createEmployee(data: {
  name: string;
  email?: string;
  employee_no?: string;
  division_id?: string | null;
  active_status?: string;
  is_manager?: boolean;
  app_role_id?: string | null;
  job_title?: string;
  sex?: string;
  start_date?: string;
  tenant_id: string;
}) {
  const supabaseAdmin = createAdminClient();

  // tenants.max_employees を超える登録は不可
  const supabase = await createClient();
  const [{ data: tenant, error: tenantError }, { count, error: countError }] = await Promise.all([
    supabase
      .from('tenants')
      .select('max_employees')
      .eq('id', data.tenant_id)
      .maybeSingle(),
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', data.tenant_id),
  ]);

  if (tenantError) {
    console.error('createEmployee tenant fetch error:', tenantError);
    return { success: false, error: 'テナント上限の取得に失敗しました。' };
  }
  if (countError) {
    console.error('createEmployee employee count error:', countError);
    return { success: false, error: '登録済み従業員数の取得に失敗しました。' };
  }

  const limit = typeof tenant?.max_employees === 'number' ? tenant.max_employees : 0;
  const registered = typeof count === 'number' ? count : 0;
  if (registered >= limit) {
    return {
      success: false,
      error: `従業員の登録上限（${limit}名）に達しています。不要な従業員を削除してから再度お試しください。`,
    };
  }

  let user_id: string | null = null;

  if (data.email) {
    // GoTrue をバイパス: RPC で auth.users に直接ユーザーを作成
    const tempPassword = `Temp_${Math.random().toString(36).slice(2, 10)}!`;
    const { data: newUserId, error: authError } = await supabaseAdmin.rpc('create_auth_user', {
      p_email: data.email,
      p_password: tempPassword,
    });

    if (authError) {
      console.error('ユーザー作成エラー:', authError);
      return { success: false, error: `ユーザー作成失敗: ${authError.message}` };
    }
    user_id = newUserId as string;
  }

  const payload: Record<string, unknown> = { ...data };
  delete payload.email; // DBには存在しないカラムを削除
  if (user_id) {
    payload.user_id = user_id;
    payload.active_status = payload.active_status ?? '承認済';
  }

  const { data: result, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();

  if (error) {
    // ロールバック: 作成した auth ユーザーを削除
    if (user_id) {
      await supabaseAdmin.rpc('delete_auth_user', { p_user_id: user_id });
    }
    console.error('createEmployee error:', error);
    return { success: false, error: error.message };
  }

  // 招待メール送信
  if (data.email && user_id) {
    try {
      await sendInviteEmailToEmployee(supabaseAdmin, data.email, user_id);
    } catch (emailError) {
      console.warn('招待メールの送信に失敗しました:', emailError);
    }
  }

  revalidatePath(`${ADM_PATH}/employees`);
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true, data: result };
}

export async function updateEmployee(id: string, updates: {
  name?: string;
  employee_no?: string;
  division_id?: string | null;
  active_status?: string;
  is_manager?: boolean;
  app_role_id?: string | null;
  job_title?: string;
  sex?: string;
  start_date?: string;
}) {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateEmployee error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/employees`);
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true, data: result };
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteEmployee error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/employees`);
  revalidatePath(`${ADM_PATH}/divisions`);
  return { success: true };
}

// =====================================================
// 所属変更（割当・異動）
// =====================================================

export async function assignEmployeeToDivision(
  employeeId: string,
  divisionId: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('employees')
    .update({ division_id: divisionId })
    .eq('id', employeeId);

  if (error) {
    console.error('assignEmployeeToDivision error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(`${ADM_PATH}/divisions`);
  revalidatePath(`${ADM_PATH}/employees`);
  return { success: true };
}

// =====================================================
// 従業員への招待メール再送
// =====================================================

export async function resendEmployeeInviteEmail(employeeId: string) {
  const supabase = await createClient();

  // employees から user_id を取得
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .select('user_id, name')
    .eq('id', employeeId)
    .single();

  if (empError || !emp?.user_id) {
    return { success: false, error: '従業員またはユーザーIDが見つかりません' };
  }

  const supabaseAdmin = createAdminClient();

  // auth.users からメールアドレスを取得（RPC経由）
  const { data: email, error: emailError } = await supabaseAdmin.rpc('get_auth_user_email', {
    p_user_id: emp.user_id,
  });

  if (emailError || !email) {
    return { success: false, error: `メールアドレスの取得に失敗: ${emailError?.message}` };
  }

  try {
    await sendInviteEmailToEmployee(supabaseAdmin, email, emp.user_id);
    return { success: true };
  } catch (err) {
    console.error('招待メール再送エラー:', err);
    return { success: false, error: err instanceof Error ? err.message : '不明なエラー' };
  }
}

