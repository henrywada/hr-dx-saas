'use server';

// createServerClient を createClient に変更
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AuthSession } from '@/types/auth';
import { getRedirectPath } from './helpers';
import { writeAuditLog } from '@/lib/log/actions';
import {
  getMyouTenantIds,
  isTenantAllowedForAudience,
  type LoginAudience,
} from './tenant-audience';
import { isHostAudienceConsistent } from './host';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * ログイン処理（Server Action）
 */
export async function signInAction(
  email: string,
  password: string,
  audience: LoginAudience = 'default'
) {
  // Host ヘッダーと画面種別の整合をサーバー側で検証（不一致ならセッションを作らず拒否）
  const host = (await headers()).get('host');
  if (!isHostAudienceConsistent(host, audience)) {
    return { success: false, error: 'このログイン画面からはご利用いただけません。' };
  }

  // ここも createClient() に変更
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    let errorMessage = error.message;
    if (errorMessage === 'Invalid login credentials') {
      errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
    } else if (/fetch failed/i.test(errorMessage)) {
      // 接続拒否・URL/ポート不一致などでネイティブ fetch が失敗したとき
      errorMessage =
        '認証サーバーに接続できません。ローカルでは `supabase start` を実行し、.env の NEXT_PUBLIC_SUPABASE_URL が `supabase status` の API URL（supabase/config.toml のポート）と一致しているか確認してください。';
    }
    return { success: false, error: errorMessage };
  }

  if (data.session) {
    // テナントは employees のみから決定する（user_metadata は本人が書き換え可能なため使わない）
    const resolved = await resolveTenantId(supabase, data.user);
    const tenant_id = resolved.tenantId ?? undefined;

    // app_role はリダイレクト先判定用に取得
    let appRole: string | undefined;
    const { data: employee } = await supabase
      .from('employees')
      .select('app_role:app_role_id(app_role)')
      .eq('user_id', data.user.id)
      .maybeSingle();
    const ar = employee?.app_role as { app_role?: string } | null | undefined;
    if (ar?.app_role) appRole = ar.app_role;

    // 画面種別とテナントの整合チェック（不許可ならセッションを破棄して拒否）
    // myou は判定不能（failed）でも fail closed。default は従来どおり許可（middleware が再判定）
    const isDenied =
      audience === 'myou' && resolved.failed
        ? true
        : !resolved.failed &&
          !isTenantAllowedForAudience(audience, resolved.tenantId, getMyouTenantIds());
    if (isDenied) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error('[signInAction] signOut 失敗:', signOutError.message);
      return {
        success: false,
        error:
          audience === 'myou'
            ? 'このアカウントはこのログイン画面からはご利用いただけません。'
            : 'このアカウントはこのログイン画面からはご利用いただけません。お客様専用のログイン画面（https://myou.hr-dx.jp）からログインしてください。',
      };
    }

    const session: AuthSession = {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || '',
        role: data.user.user_metadata?.role || 'member',
        tenant_id,
        appRole,
      },
    };

    // アクセスログにログイン成功を記録
    await writeAuditLog({
      action: 'LOGIN_SUCCESS',
      path: audience === 'myou' ? '/login-myou' : '/login',
    });

    // リダイレクト先の判定
    const redirectPath = getRedirectPath(session);
    redirect(redirectPath);
  }

  return { success: true };
}

/**
 * パスワードリセット要求処理（Server Action）
 */
export async function resetPasswordAction(email: string, audience: LoginAudience = 'default') {
  // Host ヘッダーと画面種別の整合をサーバー側で検証
  const host = (await headers()).get('host');
  if (!isHostAudienceConsistent(host, audience)) {
    return { success: false, error: 'このページからはご利用いただけません。' };
  }

  const supabase = await createClient();

  // Host ヘッダーは信用せず、audience から固定のベース URL を選ぶ
  const baseUrl =
    audience === 'myou'
      ? process.env.MYOU_SITE_URL || 'https://myou.hr-dx.jp'
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const path = audience === 'myou' ? '/reset-password-myou' : '/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}${path}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}