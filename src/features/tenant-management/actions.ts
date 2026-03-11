'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendMail, formatExpiryDate } from '@/lib/mail/send';
import type { TenantActionResult, TenantFormData, TenantUpdateData } from './types';

const REVALIDATE_PATH = '/saas_adm/tenants';

// config.toml の otp_expiry と一致させる（604800秒 = 1週間）
const OTP_EXPIRY_SECONDS = 604800;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = any;

/**
 * 招待メール送信の共通処理
 * GoTrue JWT問題を回避するため、RPC関数でリカバリートークンを生成し、
 * nodemailer（Inbucket SMTP）経由で有効期限付きのカスタムメールを送信する。
 */
async function sendInviteEmailToManager(supabase: SupabaseAdmin, email: string, userId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // RPC関数でリカバリートークンを生成（GoTrue バイパス）
  const { data: recoveryToken, error: tokenError } = await supabase.rpc(
    'generate_recovery_token',
    { p_user_id: userId, p_expiry_hours: 168 }
  );

  if (tokenError || !recoveryToken) {
    throw new Error('リカバリートークン生成失敗: ' + (tokenError?.message || 'トークンが返されませんでした'));
  }

  const actionLink = appUrl + '/reset-password?token=' + recoveryToken + '&email=' + encodeURIComponent(email);

  // 有効期限を計算
  const expiryFormatted = formatExpiryDate(OTP_EXPIRY_SECONDS);

  // カスタムメール送信
  await sendMail({
    to: email,
    subject: 'パスワード設定',
    html: '<p>hr-dxシステムへパスワードを設定してください。パスワード設定は<a href="' + actionLink + '">ここ</a>。</p>\n<p>このメールの有効期限は' + expiryFormatted + 'までです。</p>',
  });

  console.log('招待メール送信完了: ' + email + '（有効期限: ' + expiryFormatted + '）');
}

/**
 * テナント新規登録
 *
 * 処理フロー:
 * 1. tenants テーブルへ挿入
 * 2. RPC関数で auth.users へ直接登録（GoTrue JWT問題を回避）
 * 3. employees テーブルへ責任者を登録
 * 4. 招待メール送信
 */
export async function createTenant(formData: TenantFormData): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    // ========== Step 1: tenants テーブルへ挿入 ==========
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: formData.name,
        paid_amount: formData.paid_amount,
        employee_count: formData.employee_count,
        plan_type: formData.plan_type,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('テナント作成エラー:', tenantError);
      return { success: false, error: 'テナント作成失敗: ' + tenantError.message };
    }

    // ========== Step 2: RPC関数で auth ユーザーを直接作成（GoTrue バイパス） ==========
    console.log('Step 2: [RPC] ユーザー作成開始 -', formData.manager_email);
    const tempPassword = generateTempPassword();

    const { data: userId, error: rpcError } = await supabase.rpc(
      'create_auth_user',
      {
        p_email: formData.manager_email,
        p_password: tempPassword,
      }
    );

    if (rpcError || !userId) {
      // テナントを作成済みなのでロールバック
      await supabase.from('tenants').delete().eq('id', tenant.id);
      console.error('ユーザー作成エラー:', rpcError);
      return { success: false, error: '責任者ユーザー作成失敗: ' + (rpcError?.message || 'ユーザーIDが返されませんでした') };
    }

    console.log('Step 2 完了: userId =', userId);

    // ========== Step 3: employees テーブルへ責任者登録 ==========
    // app_role テーブルから 'hr' ロールの ID を取得
    const { data: hrRole } = await supabase
      .from('app_role')
      .select('id')
      .eq('app_role', 'hr')
      .single();

    const { error: empError } = await supabase
      .from('employees')
      .insert({
        user_id: userId,
        tenant_id: tenant.id,
        name: formData.manager_name,
        is_manager: true,
        active_status: 'active',
        app_role_id: hrRole?.id || null,
      });

    if (empError) {
      // ロールバック: ユーザーとテナントを削除
      await supabase.rpc('delete_auth_user', { p_user_id: userId });
      await supabase.from('tenants').delete().eq('id', tenant.id);
      console.error('従業員作成エラー:', empError);
      return { success: false, error: '責任者従業員レコード作成失敗: ' + empError.message };
    }

    // ========== Step 4: 招待メール送信 ==========
    try {
      await sendInviteEmailToManager(supabase, formData.manager_email, userId);
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.warn('招待メールの送信に失敗しました（テナントとユーザーは作成済み）:', errorMessage);
    }

    console.log('一時パスワード（開発用）:', tempPassword);

    revalidatePath(REVALIDATE_PATH);
    return {
      success: true,
      data: {
        tenant,
        userId,
      },
    };
  } catch (error) {
    console.error('テナント作成 予期せぬエラー:', error);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}

/**
 * 招待メール再送信
 */
export async function resendInviteEmail(tenantId: string, managerEmail?: string | null): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    // テナントの責任者（is_manager=true）を取得
    const { data: manager, error: empError } = await supabase
      .from('employees')
      .select('user_id, name')
      .eq('tenant_id', tenantId)
      .eq('is_manager', true)
      .single();

    if (empError || !manager?.user_id) {
      return { success: false, error: '責任者情報が見つかりません: ' + (empError?.message || 'user_idなし') };
    }

    // RPC経由でメールアドレスを取得
    let email = managerEmail;
    if (!email) {
      const { data: userEmail, error: emailError } = await supabase.rpc('get_auth_user_email', {
        p_user_id: manager.user_id,
      });
      if (emailError || !userEmail) {
        return { success: false, error: 'メールアドレスの取得に失敗しました' };
      }
      email = userEmail;
    }

    await sendInviteEmailToManager(supabase, email, manager.user_id);

    console.log('招待メール再送完了:', email);
    return { success: true };
  } catch (error) {
    console.error('招待メール再送 予期せぬエラー:', error);
    return { success: false, error: 'メール送信に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー') };
  }
}


/**
 * テナント情報更新
 */
export async function updateTenant(
  tenantId: string,
  updateData: TenantUpdateData
): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        name: updateData.name,
        paid_amount: updateData.paid_amount,
        employee_count: updateData.employee_count,
        plan_type: updateData.plan_type,
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('テナント更新エラー:', error);
      return { success: false, error: 'テナント更新失敗: ' + error.message };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data };
  } catch (error) {
    console.error('テナント更新 予期せぬエラー:', error);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}

/**
 * テナント削除（RPC関数でauthユーザーも削除）
 */
export async function deleteTenant(tenantId: string): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    // 1. テナントに紐づく従業員を取得
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id')
      .eq('tenant_id', tenantId);

    // 2. tenant_service の削除
    const { error: tsError } = await supabase
      .from('tenant_service')
      .delete()
      .eq('tenant_id', tenantId);

    if (tsError) {
      console.error('テナントサービス削除エラー:', tsError);
      return { success: false, error: 'テナントサービス削除失敗: ' + tsError.message };
    }

    // 3. employees の削除
    const { error: empError } = await supabase
      .from('employees')
      .delete()
      .eq('tenant_id', tenantId);

    if (empError) {
      console.error('従業員削除エラー:', empError);
      return { success: false, error: '従業員削除失敗: ' + empError.message };
    }

    // 4. divisions の削除
    const { error: divError } = await supabase
      .from('divisions')
      .delete()
      .eq('tenant_id', tenantId);

    if (divError) {
      console.error('組織削除エラー:', divError);
    }

    // 5. tenants の削除
    const { error: tenantError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (tenantError) {
      console.error('テナント削除エラー:', tenantError);
      return { success: false, error: 'テナント削除失敗: ' + tenantError.message };
    }

    // 6. auth.users の削除（RPC関数経由でGoTrueバイパス）
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        if (emp.user_id) {
          const { error: delErr } = await supabase.rpc('delete_auth_user', { p_user_id: emp.user_id });
          if (delErr) {
            console.warn('ユーザー削除警告 (' + emp.user_id + '):', delErr);
          }
        }
      }
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error('テナント削除 予期せぬエラー:', error);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}

/**
 * 一時パスワード生成
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
