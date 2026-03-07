import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// revalidate every hour, or dynamically
export const revalidate = 3600

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params

  if (!tenantId) {
    return new NextResponse('Tenant ID is required', { status: 400 })
  }

  // アグリゲーター向けの公開エンドポイントなのでAdminClientなどで取得も可能だが、
  // RLSは status='published' に開放されているため、ここでは安全にAdminClientで絞り込み取得
  const supabase = createAdminClient()

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')

  if (error || !jobs) {
    return new NextResponse('Failed to fetch jobs', { status: 500 })
  }

  // Indeed やスタンバイ等の仕様に基づいたXMLフィード（簡易版）
  // ※実際の仕様に合わせて要素は調整が必要です
  const xmlHeader = `<?xml version="1.0" encoding="utf-8"?>\n<source>\n  <publisher>Smart HR App</publisher>\n  <publisherurl>https://example.com</publisherurl>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let xmlBody = ''
  for (const job of jobs) {
    const jobUrl = `${baseUrl}/jobs/${tenantId}/${job.id}`

    xmlBody += `  <job>
    <title><![CDATA[${job.title || ''}]]></title>
    <date><![CDATA[${new Date(job.updated_at).toUTCString()}]]></date>
    <referencenumber><![CDATA[${job.id}]]></referencenumber>
    <url><![CDATA[${jobUrl}]]></url>
    <company><![CDATA[募集企業]]></company>
    <city><![CDATA[${job.address_locality || ''}]]></city>
    <state><![CDATA[${job.address_region || ''}]]></state>
    <country><![CDATA[JP]]></country>
    <postalcode><![CDATA[${job.postal_code || ''}]]></postalcode>
    <description><![CDATA[${job.description || ''}]]></description>
    <salary><![CDATA[${job.salary_min || ''} 〜 ${job.salary_max || ''}]]></salary>
    <jobtype><![CDATA[${job.employment_type || ''}]]></jobtype>
  </job>\n`
  }

  const xmlFooter = `</source>`

  const xml = xmlHeader + xmlBody + xmlFooter

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    }
  })
}
