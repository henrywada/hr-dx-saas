// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// 変更例
console.log("Hello from Functions! (First Cycle Test)")

Deno.serve(async (req) => {
  // 1. リクエストからSupabaseクライアントを作成（Auth情報を自動継承）
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // 2. ユーザー認証のチェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  // 3. テナントIDの取得（セキュリティの中核）
  // ※ Step 2で作ったDB関数 'get_my_tenant_id' を呼び出す
  const { data: tenantId, error: tenantError } = await supabase.rpc('get_my_tenant_id')
  
  if (tenantError || !tenantId) {
    return new Response(
      JSON.stringify({ error: 'Tenant context not found' }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  }

  // --- ここからビジネスロジック (優先順位Aの実装場所) ---
  
  // 例: 単純なデータ返却
  const data = {
    message: `Hello ${user.email}`,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
  }

  // ---------------------------------------------------

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})