import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// アラート対象日数（当日=0、7日前=7、30日前=30）
const ALERT_DAYS = [30, 7, 0]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date()
    let totalSent = 0

    for (const days of ALERT_DAYS) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + days)
      const targetStr = targetDate.toISOString().split('T')[0]

      const { data: expiringItems, error } = await supabase
        .from('employee_qualifications')
        .select(`
          id, expiry_date, cert_number,
          employee:employees(id, name, tenant_id, tenants(id, name)),
          qualification:qualifications(name, issuing_body)
        `)
        .eq('expiry_date', targetStr)

      if (error) throw error
      if (!expiringItems || expiringItems.length === 0) continue

      for (const item of expiringItems) {
        const emp = item.employee as any
        const qual = item.qualification as any

        const subject = days === 0
          ? `【資格期限】本日期限：${qual?.name}`
          : `【資格期限】${days}日後に期限：${qual?.name}`

        const body = `${emp?.name} 様の資格が期限を迎えます。\n\n資格名：${qual?.name}\n発行機関：${qual?.issuing_body ?? '不明'}\n有効期限：${item.expiry_date}\n証明書番号：${item.cert_number ?? '未登録'}`

        // テナント管理者にメール送信
        const { data: admins } = await supabase
          .from('employees')
          .select('auth_user_id')
          .eq('tenant_id', emp?.tenant_id)
          .eq('is_manager', true)

        for (const admin of admins ?? []) {
          if (!admin.auth_user_id) continue
          const { data: authUser } = await supabase.auth.admin.getUserById(admin.auth_user_id)
          if (!authUser?.user?.email) continue

          // send-email Edge Function 経由でメール送信
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ to: authUser.user.email, subject, text: body }),
          })
          totalSent++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
