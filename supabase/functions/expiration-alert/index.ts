import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 期限間近の製品を抽出（30日以内）
    const today = new Date()
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(today.getDate() + 30)

    const { data: products, error: productError } = await supabaseClient
      .from('myou_products')
      .select(`
        serial_number,
        expiration_date,
        current_company_id,
        myou_companies (
          id,
          name,
          email_address
        )
      `)
      .eq('status', 'delivered')
      .gte('expiration_date', today.toISOString().split('T')[0])
      .lte('expiration_date', thirtyDaysLater.toISOString().split('T')[0])

    if (productError) throw productError

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: 'No expiring products found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. 会社ごとにグループ化
    const targetCompanies = products.reduce((acc: any, p: any) => {
      const companyId = p.current_company_id
      if (!acc[companyId]) {
        acc[companyId] = {
          name: p.myou_companies.name,
          email: p.myou_companies.email_address,
          products: []
        }
      }
      acc[companyId].products.push(p)
      return acc
    }, {})

    // 3. 各会社への通知ロジック (ここでは本来メールAPIを叩く)
    // 今回は記録を残すのみにするか、外部メールサービス(Resend/SendGrid等)があればそちらを呼ぶ
    const results = []
    for (const companyId in targetCompanies) {
      const company = targetCompanies[companyId]
      if (company.email) {
        // 通知ログを記録
        const { error: logError } = await supabaseClient
          .from('myou_alert_logs')
          .insert({
            company_id: companyId,
            target_serials: company.products.map((p: any) => p.serial_number),
            status: 'success' // 本来はメール送信結果
          })
        
        results.push({ company: company.name, status: logError ? 'log_failed' : 'success' })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
