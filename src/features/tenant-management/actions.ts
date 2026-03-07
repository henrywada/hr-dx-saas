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
 *
 * generateLink でパスワード設定リンクを生成し、
 * nodemailer（Inbucket SMTP）経由で有効期限付きのカスタムメールを送信する。
 */
async function sendInviteEmailToManager(supabase: SupabaseAdmin, email: string) {
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;

  // リカバリーリンクを生成（メールは送信しない）
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

  // 有効期限を計算
  const expiryFormatted = formatExpiryDate(OTP_EXPIRY_SECONDS);

  // カスタムメール送信
  await sendMail({
    to: email,
    subject: 'パスワード設定',
    html: `<p>hr-dxシステムへパスワードを設定してください。パスワード設定は<a href="${actionLink}">ここ</a>。</p>
<p>このメールの有効期限は${expiryFormatted}までです。</p>`,
  });

  console.log(`招待メール送信完了: ${email}（有効期限: ${expiryFormatted}）`);
}

/**
 * テナント新規登録
 * 
 * 処理フロー:
 * 1. tenants テーブルへ挿入（テナント名, 金額, 最高ユーザ数）
 * 2. auth.users へ責任者メールアドレスを登録（email_confirm: true で認証済み状態）
 * 3. employees テーブルへ責任者を登録（is_manager=true）
 * 4. 招待メール送信（パスワード設定URL付き, 有効期限1週間）
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
      return { success: false, error: `テナント作成失敗: ${tenantError.message}` };
    }

    // ========== Step 2: auth.users へ責任者登録（認証済み状態） ==========
    // email_confirm: true で「認知済」の状態にする（システム認証不要）
    const tempPassword = generateTempPassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.manager_email,
      password: tempPassword,
      email_confirm: true, // 管理者により認証済みなのでシステムでの認証は不要
      user_metadata: {
        name: formData.manager_name,
        role: 'admin',
        tenant_id: tenant.id,
      },
    });

    if (authError) {
      // テナントを作成済みなのでロールバック
      await supabase.from('tenants').delete().eq('id', tenant.id);
      console.error('ユーザー作成エラー:', authError);
      return { success: false, error: `責任者ユーザー作成失敗: ${authError.message}` };
    }

    const userId = authData.user.id;

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
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('tenants').delete().eq('id', tenant.id);
      console.error('従業員作成エラー:', empError);
      return { success: false, error: `責任者従業員レコード作成失敗: ${empError.message}` };
    }

    // ========== Step 4: 招待メール送信（パスワード設定URL + 有効期限付き） ==========
    try {
      await sendInviteEmailToManager(supabase, formData.manager_email);
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.warn('招待メールの送信に失敗しました（テナントとユーザーは作成済み）:', errorMessage);
      // SMTP設定が未完了でもテナントの作成自体は成功とみなす
    }

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
 * 
 * パスワード設定URLのメールを再送し、有効期限をリセットする。
 * メールに届かなかった人、有効期限切れの人向け。
 */
export async function resendInviteEmail(managerEmail: string): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    if (!managerEmail) {
      return { success: false, error: '責任者のメールアドレスが設定されていません' };
    }

    await sendInviteEmailToManager(supabase, managerEmail);

    console.log('招待メール再送完了:', managerEmail);
    return { success: true };
  } catch (error) {
    console.error('招待メール再送 予期せぬエラー:', error);
    return { success: false, error: `メール送信に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` };
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
      return { success: false, error: `テナント更新失敗: ${error.message}` };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data };
  } catch (error) {
    console.error('テナント更新 予期せぬエラー:', error);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}

/**
 * テナント削除
 * 
 * 関連データ（employees, tenant_service, ユーザー）も削除する
 */
export async function deleteTenant(tenantId: string): Promise<TenantActionResult> {
  const supabase = createAdminClient();

  try {
    // 1. テナントに紐づく従業員を取得（auth.users の削除のため）
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
      return { success: false, error: `テナントサービス削除失敗: ${tsError.message}` };
    }

    // 3. employees の削除
    const { error: empError } = await supabase
      .from('employees')
      .delete()
      .eq('tenant_id', tenantId);

    if (empError) {
      console.error('従業員削除エラー:', empError);
      return { success: false, error: `従業員削除失敗: ${empError.message}` };
    }

    // 4. divisions の削除
    const { error: divError } = await supabase
      .from('divisions')
      .delete()
      .eq('tenant_id', tenantId);

    if (divError) {
      console.error('組織削除エラー:', divError);
      // divisions の削除失敗は警告のみ（存在しない場合もある）
    }

    // 5. tenants の削除
    const { error: tenantError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (tenantError) {
      console.error('テナント削除エラー:', tenantError);
      return { success: false, error: `テナント削除失敗: ${tenantError.message}` };
    }

    // 6. auth.users の削除（従業員に紐づくユーザー）
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        if (emp.user_id) {
          const { error: authDelError } = await supabase.auth.admin.deleteUser(emp.user_id);
          if (authDelError) {
            console.warn(`ユーザー削除警告 (${emp.user_id}):`, authDelError);
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
 * 一時パスワード生成（ユーザー作成時に使用、招待メール経由でリセットされる）
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
