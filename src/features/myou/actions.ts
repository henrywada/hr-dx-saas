'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

import { toJSTDateString, toJSTISOString } from '@/lib/datetime';
import { sendExpirationAlertEmail } from '@/lib/mail';
import { getServerUser } from '@/lib/auth/server-user';

// myou_* テーブルは型定義に含まれないため any でラップ
async function getSupabase() {
  return (await createClient()) as any;
}

/**
 * 施工会社（myou_companies）の一覧を取得する
 */
export async function getCompanies() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    console.warn('getCompanies: No tenant_id found for current user');
    return [];
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('myou_companies')
    .select('id, name, email_address, created_at, tenant_id')
    .eq('tenant_id', user.tenant_id)
    .order('name');

  if (error) {
    console.error('Error fetching companies:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return [];
  }
  // スキーマは id/name、コンポーネントは company_id/company_name を期待するためマッピング
  return (data || []).map((row) => ({
    company_id: row.id,
    company_name: row.name,
    email_address: row.email_address ?? undefined,
  }));
}

/**
 * 有効期限が近い製品（30日以内）の一覧を取得する
 * 施工会社情報もJOINする
 */
export async function getExpiringProducts() {
  const user = await getServerUser();
  if (!user?.tenant_id) return [];

  const supabase = await getSupabase();
  
  // 今日の日付から30日後の日付を計算
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  const { data, error } = await supabase
    .from('myou_products')
    .select(`
      serial_number,
      expiration_date,
      status,
      current_company_id,
      myou_companies (
        id,
        name,
        email_address
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'delivered')
    .gte('expiration_date', today.toISOString().split('T')[0])
    .lte('expiration_date', thirtyDaysLater.toISOString().split('T')[0])
    .order('expiration_date', { ascending: true });

  if (error) {
    console.error('Error fetching expiring products:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return [];
  }
  
  return data || [];
}

/** アラートログの型 */
export type AlertLogRow = {
  id: string;
  company_id: string;
  sent_at: string;
  target_serials: string[];
  status: string;
  error_message: string | null;
  myou_companies: { name: string } | null;
};

/**
 * アラート送信履歴を取得する
 */
export async function getAlertLogs(): Promise<AlertLogRow[]> {
  const user = await getServerUser();
  if (!user?.tenant_id) return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('myou_alert_logs')
    .select(`
      *,
      myou_companies (
        name
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching alert logs:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return [];
  }
  return (data || []) as AlertLogRow[];
}

/**
 * 施工会社に手動でアラートメールを送信し、ログを記録する
 */
export async function sendManualAlert(companyId: string) {
  const user = await getServerUser();
  if (!user?.tenant_id) return { success: false, error: '認証エラー' };

  const supabase = await getSupabase();
  // ... (省略箇所があるため慎重に置換します)
  
  // 1. 対象の製品と会社情報を取得
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  const { data: products, error: productError } = await supabase
    .from('myou_products')
    .select('serial_number, expiration_date')
    .eq('current_company_id', companyId)
    .eq('status', 'delivered')
    .gte('expiration_date', today.toISOString().split('T')[0])
    .lte('expiration_date', thirtyDaysLater.toISOString().split('T')[0]);

  if (productError || !products || products.length === 0) {
    return { success: false, error: '対象の期限間近製品が見つかりませんでした。' };
  }

  const { data: company, error: companyError } = await supabase
    .from('myou_companies')
    .select('name, email_address')
    .eq('id', companyId)
    .single();

  if (companyError || !company || !company.email_address) {
    return { success: false, error: '送信先のメールアドレスが登録されていません。' };
  }

  // 2. メール送信実行
  const mailResult = await sendExpirationAlertEmail(
    company.email_address,
    company.name,
    products.map(p => ({
      serial_number: p.serial_number,
      expiration_date: p.expiration_date
    }))
  );

  // 3. ログの記録
  const { error: logError } = await supabase
    .from('myou_alert_logs')
    .insert({
      company_id: companyId,
      target_serials: products.map(p => p.serial_number),
      status: mailResult.success ? 'success' : 'error',
      error_message: mailResult.success ? null : mailResult.error
    });

  if (logError) {
    console.error('Error logging alert:', logError);
  }

  revalidatePath('/myou/expiration-alerts');
  
  if (mailResult.success) {
    return { success: true };
  } else {
    return { success: false, error: mailResult.error };
  }
}

/**
 * 特定の製品（シリアル番号）の流通履歴を取得する
 */
export async function getProductTrace(serialNumber: string) {
  const supabase = await getSupabase();

  // 1. 製品基本情報を取得
  const { data: product, error: productError } = await supabase
    .from('myou_products')
    .select('*')
    .eq('serial_number', serialNumber)
    .single();

  if (productError || !product) {
    console.error('Product not found:', serialNumber, productError);
    return null;
  }

  // 2. 流通履歴（納入ログ）を取得
  const { data: logs, error: logsError } = await supabase
    .from('myou_delivery_logs')
    .select(`
      *,
      myou_companies (
        name
      )
    `)
    .eq('serial_number', serialNumber)
    .order('delivery_date', { ascending: false });

  if (logsError) {
    console.error('Error fetching delivery logs:', logsError);
  }

  return {
    product,
    history: logs || []
  };
}

/**
 * 納入登録を実行する
 * 1. myou_products テーブルへの登録・更新 (upsert)
 * 2. myou_delivery_logs テーブルへの履歴挿入
 */
export async function registerDelivery(formData: {
  serial_number: string;
  expiration_date: string;
  company_id: string;
}) {
  const user = await getServerUser();
  if (!user?.tenant_id) return { success: false, error: '認証エラー' };

  const supabase = await getSupabase();

  // 1. 製品情報の登録・更新
  const { error: productError } = await supabase
    .from('myou_products')
    .upsert({
      serial_number: formData.serial_number,
      expiration_date: formData.expiration_date,
      status: 'delivered',
      last_delivery_at: toJSTISOString(),
      current_company_id: formData.company_id,
      tenant_id: user.tenant_id // 明示的に tenant_id を指定
    }, {
      onConflict: 'serial_number'
    });

  if (productError) {
    console.error('Error upserting product:', productError);
    return { success: false, error: '製品情報の登録に失敗しました。' };
  }

  // 2. 納入ログの記録
  const { error: logError } = await supabase
    .from('myou_delivery_logs')
    .insert({
      serial_number: formData.serial_number,
      company_id: formData.company_id,
      delivery_date: toJSTDateString(),
      registered_at: toJSTISOString(),
      tenant_id: user.tenant_id // 明示的に tenant_id を指定
    });

  if (logError) {
    console.error('Error inserting delivery log:', logError);
    // 製品登録は成功しているがログに失敗したケース
    return { success: true, warning: '製品は登録されましたが、履歴の記録に失敗しました。' };
  }

  // キャッシュの更新
  revalidatePath('/myou/delivery-scan');

  return { success: true };
}

/**
 * 施工会社の情報を登録・更新する (保守用)
 */
export async function upsertCompany(formData: {
  id?: string;
  name: string;
  email_address: string;
}) {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    return { success: false, error: 'ユーザー情報を取得できませんでした。再ログインをお試しください。' };
  }

  const supabase = await getSupabase();

  const companyData = {
    name: formData.name,
    email_address: formData.email_address,
    tenant_id: user.tenant_id,
  };

  let result;
  if (formData.id) {
    // 更新
    result = await supabase
      .from('myou_companies')
      .update(companyData)
      .eq('id', formData.id)
      .eq('tenant_id', user.tenant_id);
  } else {
    // 新規作成
    result = await supabase
      .from('myou_companies')
      .insert(companyData);
  }

  if (result.error) {
    console.error('Error upserting company:', {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code
    });
    return { success: false, error: '施工会社の保存に失敗しました。' };
  }

  revalidatePath('/myou/companies');
  revalidatePath('/myou/delivery-scan');
  revalidatePath('/myou/expiration-alerts');
  
  return { success: true };
}

/**
 * 施工会社を削除する (保守用)
 */
export async function deleteCompany(id: string) {
  const user = await getServerUser();
  if (!user?.tenant_id) return { success: false, error: '認証エラー' };

  const supabase = await getSupabase();

  const { error } = await supabase
    .from('myou_companies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id);

  if (error) {
    console.error('Error deleting company:', error);
    return { success: false, error: '施工会社の削除に失敗しました。' };
  }

  revalidatePath('/myou/companies');
  revalidatePath('/myou/delivery-scan');

  return { success: true };
}
