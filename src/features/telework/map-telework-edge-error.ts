/** telework-device-approve / telework-start 等の JSON `error` コードをユーザー向け文言へ */
export function userMessageFromTeleworkEdgeCode(code: string): string {
  switch (code) {
    case 'missing_device_identifier':
      return '端末識別子がありません。このページを再読み込みしてから再度お試しください。'
    case 'no_approved_device_for_this_browser':
      return 'このブラウザに対応する承認済み端末がありません。端末登録と人事承認を確認してください。'
    case 'device_rejected':
      return 'この端末の登録は却下されています。'
    case 'device_not_approved':
      return '端末がまだ承認されていません。承認後に再度お試しください。'
    case 'session_already_open':
      return 'すでに進行中のセッションがあります。先に作業を終了してください。'
    case 'session_already_recorded_today':
      return '本日のテレワークはすでに記録済みです。1 日 1 回まで開始できます。'
    case 'today_session_check_failed':
      return '本日の記録状況を確認できませんでした。しばらくしてから再度お試しください。'
    case 'invalid_signature':
    case 'signature_mismatch':
      return '端末認証に失敗しました。端末の秘密鍵の取得状況を確認してください。'
    case 'timestamp_out_of_range':
      return '端末の時刻がずれすぎています。PC の時刻を確認してください。'
    case 'device_secret_missing':
    case 'device_secret_decrypt_failed':
      return '端末の秘密鍵が未設定です。端末登録・承認・秘密鍵取得を確認してください。'
    case 'encrypt_failed':
      return '端末秘密鍵の暗号化に失敗しました。Supabase のプロジェクトで Edge Function 用シークレット TELEWORK_DEVICE_ENCRYPTION_KEY（openssl rand -base64 32 相当）を設定し、関数を再デプロイしてください。'
    case 'forbidden_not_hr':
      return '人事（hr / hr_manager）のみ承認・拒否できます。'
    case 'device_not_found':
      return '対象の端末が見つかりません。一覧を更新してから再度お試しください。'
    case 'tenant_mismatch':
      return '別テナントの端末です。操作できません。'
    case 'already_approved':
      return 'この端末はすでに承認済みです。'
    case 'update_failed':
    case 'device_not_found_or_tenant_mismatch':
      return 'データベースの更新に失敗しました。しばらくしてから再度お試しください。'
    case 'unauthorized':
      return 'ログインの有効期限が切れています。再ログインしてください。'
    case 'tenant_unknown':
      return 'テナント情報を取得できませんでした。人事に連絡してください。'
    case 'server_misconfigured':
      return 'サーバー設定が不正です。管理者に連絡してください。'
    default:
      return code
  }
}
