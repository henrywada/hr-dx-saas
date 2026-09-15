// src/lib/line/establishSupabaseSession.ts
// LINE IDトークン検証後にSupabaseセッションを確立するユーティリティ。
// adminClient: auth.admin.generateLink 用（createAdminClient() を渡す）
// sessionClient: Cookie付き verifyOtp 用（createClient() を渡す）

type GenerateLinkClient = {
  auth: {
    admin: {
      generateLink: (params: { type: 'magiclink'; email: string }) => Promise<{
        data: { properties?: { hashed_token?: string } | null } | null
        error: { message: string } | null
      }>
    }
  }
}

type VerifyOtpClient = {
  auth: {
    verifyOtp: (params: {
      type: 'magiclink'
      token_hash: string
    }) => Promise<{ error: { message: string } | null }>
  }
}

export async function establishSupabaseSession(params: {
  adminClient: GenerateLinkClient
  sessionClient: VerifyOtpClient
  email: string
}): Promise<void> {
  const { adminClient, sessionClient, email } = params

  // マジックリンク用のトークンを生成する（adminClient = Service Role）
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  const hashedToken = data?.properties?.hashed_token
  if (error || !hashedToken) {
    console.error('establishSupabaseSession: generateLink 失敗', error)
    throw new Error('failed to generate session link')
  }

  // Cookie セッションを確立する（sessionClient = createClient() で Cookie が自動付与される）
  const { error: verifyError } = await sessionClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  })

  if (verifyError) {
    console.error('establishSupabaseSession: verifyOtp 失敗', verifyError)
    throw new Error(`failed to verify session link: ${verifyError.message}`)
  }
}
