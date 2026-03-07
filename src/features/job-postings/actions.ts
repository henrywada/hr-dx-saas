'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { InsertJobPosting, JobPosting } from './types'
import { generateHelloWorkCSV } from '@/lib/csv-export'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function createJobPostingDraft(
  data: Partial<Omit<InsertJobPosting, 'tenant_id' | 'status'>>
) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。ログインし直してください。')
  }

  const supabase = await createClient()

  // 下書きとして保存
  const payload = {
    ...data,
    tenant_id: serverUser.tenant_id,
    status: 'draft',
  }

  const { data: result, error } = await supabase
    .from('job_postings')
    .insert([payload])
    .select('id')
    .single()

  if (error) {
    console.error('createJobPostingDraft error:', error)
    throw new Error('求人下書きの保存に失敗しました。')
  }

  // 求人一覧等のキャッシュをリフレッシュ (パスは仕様に合わせて調整してください)
  revalidatePath('/adm/job-postings')
  
  return { success: true, id: result.id as string }
}

export async function generateJobPostingFromMemo(jobId: string, memo: string) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。ログインし直してください。')
  }

  if (!memo || memo.trim() === '') {
    throw new Error('現場のメモ (raw_memo) が入力されていません。')
  }

  const supabase = await createClient()

  // 1. 入力された raw_memo を一旦 DB に保存
  const { error: updateMemoError } = await supabase
    .from('job_postings')
    .update({ raw_memo: memo })
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id)

  if (updateMemoError) {
    console.error('Update memo error:', updateMemoError)
    throw new Error('メモの保存に失敗しました。')
  }

  // 2. テナント情報（自社の魅力など）を取得
  const { data: tenant } = await supabase
    .from('tenants')
    .select('business_description, mission_vision, culture_and_benefits')
    .eq('id', serverUser.tenant_id)
    .single()

  let systemPrompt = 'あなたは優秀な採用広報コピーライターです。現場のメモから、求職者を惹きつけSEOに強いHTML形式の求人票（description）と、必須項目を抽出・生成してください。'
  
  const t = tenant as { business_description?: string | null; mission_vision?: string | null; culture_and_benefits?: string | null } | null;
  if (t && (t.business_description || t.mission_vision || t.culture_and_benefits)) {
    systemPrompt += `\nあなたは以下の企業情報を持つ企業の採用広報です。この情報を自然に織り交ぜて、求職者を惹きつける求人票を作成してください。
【事業内容】: ${t.business_description || ''}
【ビジョン】: ${t.mission_vision || ''}
【社風・魅力】: ${t.culture_and_benefits || ''}`
  }

  // 3. OpenAI API を用いて求人票を生成
  // Structured Outputs の json_schema を使用して出力を強制
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // または gpt-4o-mini
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: memo
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "job_posting_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string", description: "HTML形式の求人詳細文" },
            employment_type: { 
              type: "string", 
              enum: ["FULL_TIME", "PART_TIME", "CONTRACTOR"] 
            },
            salary_min: { type: ["number", "null"] },
            salary_max: { type: ["number", "null"] },
            salary_unit: { 
              type: "string", 
              enum: ["YEAR", "MONTH", "HOUR"] 
            },
            address_region: { type: "string", description: "都道府県名のみ（例: 東京都）" },
            address_locality: { type: "string", description: "市区町村名のみ（例: 渋谷区）" }
          },
          required: [
            "title", 
            "description", 
            "employment_type", 
            "salary_min", 
            "salary_max", 
            "salary_unit", 
            "address_region", 
            "address_locality"
          ],
          additionalProperties: false
        }
      }
    }
  })

  // 4. AIレスポンスのパース
  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('AIからのレスポンスが空でした。')
  }

  let generatedData
  try {
    generatedData = JSON.parse(content)
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    throw new Error('AI生成結果の解析に失敗しました。')
  }

  // 5. DB該当レコードのUPDATE
  const { error: updateError } = await supabase
    .from('job_postings')
    .update({
      title: generatedData.title,
      description: generatedData.description,
      employment_type: generatedData.employment_type,
      salary_min: generatedData.salary_min,
      salary_max: generatedData.salary_max,
      salary_unit: generatedData.salary_unit,
      address_region: generatedData.address_region,
      address_locality: generatedData.address_locality,
    })
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id) // セキュリティ対策：別テナントの更新を防ぐ

  if (updateError) {
    console.error('Update error:', updateError)
    throw new Error('生成された求人票の保存に失敗しました。')
  }

  // 6. Next.js キャッシュのリフレッシュ
  // ※ UI側で構成されるパス（例: /adm/job-postings, /biz/hr/... など）に合わせる
  revalidatePath('/adm/job-postings')

  return { success: true, data: generatedData }
}

export async function updateJobPosting(jobId: string, data: { title: string; description: string }) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('job_postings')
    .update({
      title: data.title,
      description: data.description,
    })
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id)

  if (error) {
    console.error('Update job posting error:', error)
    throw new Error('求人票の保存に失敗しました。')
  }

  revalidatePath('/adm/job-postings')
  return { success: true }
}

export async function updateJobPostingStatus(jobId: string, status: 'draft' | 'published' | 'closed') {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('job_postings')
    .update({ status })
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id)

  if (error) {
    console.error('Update job status error:', error)
    throw new Error('ステータスの更新に失敗しました。')
  }

  revalidatePath('/adm/job-postings')
  revalidatePath('/adm/job-positions')
  return { success: true }
}

export async function exportJobsForHelloWork(jobIds: string[]) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('tenant_id', serverUser.tenant_id)
    .in('id', jobIds)

  if (error || !jobs) {
    console.error('Export jobs error:', error)
    throw new Error('求人データの取得に失敗しました。')
  }

  const csvString = generateHelloWorkCSV(jobs as JobPosting[])
  return { success: true, data: csvString }
}

export async function deleteJobPosting(jobId: string) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id)

  if (error) {
    console.error('Delete job posting error:', error)
    throw new Error('求人票の削除に失敗しました。')
  }

  revalidatePath('/adm/job-postings')
  revalidatePath('/adm/job-positions')
  revalidatePath('/adm/hellowork')
  return { success: true }
}

export async function updateJobPostingMemo(jobId: string, memo: string) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('job_postings')
    .update({ raw_memo: memo })
    .eq('id', jobId)
    .eq('tenant_id', serverUser.tenant_id)

  if (error) {
    console.error('Update memo error:', error)
    throw new Error('メモの保存に失敗しました。')
  }

  return { success: true }
}
