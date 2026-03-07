'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { APP_ROUTES } from '@/config/routes';
import { sendMail, formatExpiryDate } from '@/lib/mail/send';

const ADM_PATH = APP_ROUTES.TENANT.ADMIN;

const OTP_EXPIRY_SECONDS = 604800;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendInviteEmailToEmployee(supabase: any, email: string) {
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (linkError) {
    throw new Error(`リンク生成失敗: ${linkError.message}`);
  }

  const actionLink = linkData?.properties?.action_link;
  if (!actionLink) {
    throw new Error('パスワード設定リンクの取得に失敗しました');
  }

  const expiryFormatted = formatExpiryDate(OTP_EXPIRY_SECONDS);

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

  let user_id = null;
  if (data.email) {
    const tempPassword = generateTempPassword();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: data.is_manager ? 'manager' : 'member',
        tenant_id: data.tenant_id,
      },
    });

    if (authError) {
      console.error('ユーザー作成エラー:', authError);
      return { success: false, error: `ユーザー作成失敗: ${authError.message}` };
    }
    user_id = authData.user.id;
  }

  const payload: Record<string, unknown> = { ...data };
  delete payload.email; // DBには存在しないカラムを削除
  if (user_id) {
    payload.user_id = user_id;
  }

  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (user_id) await supabaseAdmin.auth.admin.deleteUser(user_id);
    console.error('createEmployee error:', error);
    return { success: false, error: error.message };
  }

  if (data.email) {
    try {
      await sendInviteEmailToEmployee(supabaseAdmin, data.email);
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
