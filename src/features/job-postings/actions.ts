'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import {
  InsertJobPosting,
  JobPosting,
  Candidate,
  CandidateStage,
  CreateCandidateInput,
  UpdateCandidateInput,
  BrandingPromptInput,
  JobPostingAiVariant,
  TenantBrandingInfo,
  GenerateVariantsResult,
  MediaType,
} from './types'
import { generateHelloWorkCSV } from '@/lib/csv-export'
import { generateGeminiContent, GEMINI_PRO_MODEL, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'

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

  let systemPrompt =
    'あなたは優秀な採用広報コピーライターです。現場のメモから、求職者を惹きつけSEOに強いHTML形式の求人票（description）と、必須項目を抽出・生成してください。'

  const t = tenant as {
    business_description?: string | null
    mission_vision?: string | null
    culture_and_benefits?: string | null
  } | null
  if (t && (t.business_description || t.mission_vision || t.culture_and_benefits)) {
    systemPrompt += `\nあなたは以下の企業情報を持つ企業の採用広報です。この情報を自然に織り交ぜて、求職者を惹きつける求人票を作成してください。
【事業内容】: ${t.business_description || ''}
【ビジョン】: ${t.mission_vision || ''}
【社風・魅力】: ${t.culture_and_benefits || ''}`
  }

  // 3. Gemini API を用いて求人票を生成
  // responseMimeType=application/json で JSON 出力を強制し、スキーマはプロンプトで明示する
  systemPrompt += `

【出力形式】以下のキーを持つ JSON オブジェクトのみを出力してください（前後の説明文やコードフェンスは不要）:
{
  "title": "求人タイトル(string)",
  "description": "HTML形式の求人詳細文(string)",
  "employment_type": "FULL_TIME | PART_TIME | CONTRACTOR のいずれか",
  "salary_min": 数値 または null,
  "salary_max": 数値 または null,
  "salary_unit": "YEAR | MONTH | HOUR のいずれか",
  "address_region": "都道府県名のみ（例: 東京都）",
  "address_locality": "市区町村名のみ（例: 渋谷区）"
}`

  const content = await generateGeminiContent({
    model: GEMINI_PRO_MODEL,
    system: systemPrompt,
    prompt: memo,
    json: true,
  })

  // 4. AIレスポンスのパース
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

export async function updateJobPosting(
  jobId: string,
  data: { title: string; description: string }
) {
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

export async function updateJobPostingStatus(
  jobId: string,
  status: 'draft' | 'published' | 'closed'
) {
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

// ============================================================
// 採用ファネルダッシュボード用 Server Actions（P1-A）
// ============================================================

/** 候補者を新規登録する */
export async function createCandidate(input: CreateCandidateInput): Promise<{ id: string }> {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。ログインし直してください。')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      tenant_id: serverUser.tenant_id,
      job_posting_id: input.job_posting_id ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      stage: input.stage ?? 'applied',
      assigned_to: input.assigned_to ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createCandidate error:', error)
    throw new Error('候補者の登録に失敗しました。')
  }

  revalidatePath('/adm/funnel')
  return { id: data.id as string }
}

/** 候補者のファネルステージを更新する（DB トリガーが last_action_at を自動更新） */
export async function updateCandidateStage(
  candidateId: string,
  stage: CandidateStage
): Promise<void> {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。ログインし直してください。')
  }

  const supabase = await createClient()

  // RLS により自テナントの候補者のみ更新可能
  const { error } = await supabase.from('candidates').update({ stage }).eq('id', candidateId)

  if (error) {
    console.error('updateCandidateStage error:', error)
    throw new Error('ステージの更新に失敗しました。')
  }

  revalidatePath('/adm/funnel')
}

/**
 * ステージでフィルタした候補者一覧を取得する（Client Component からの呼び出し用 Server Action）
 * queries.ts の getCandidatesByStage は Server Component 専用のため、こちらを使う。
 */
export async function fetchCandidatesByStage(stage: CandidateStage): Promise<Candidate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidates')
    .select(
      '*, job_posting:job_postings(id, title), assignee:employees!candidates_assigned_to_fkey(id, name)'
    )
    .eq('stage', stage)
    .order('last_action_at', { ascending: true })

  if (error) {
    console.error('fetchCandidatesByStage error:', error)
    throw new Error('候補者一覧の取得に失敗しました。')
  }

  return (data ?? []) as Candidate[]
}

/** 候補者の基本情報（担当者・メモ等）を更新する */
export async function updateCandidate(
  candidateId: string,
  input: UpdateCandidateInput
): Promise<void> {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。ログインし直してください。')
  }

  const supabase = await createClient()

  // RLS により自テナントの候補者のみ更新可能
  const { error } = await supabase.from('candidates').update(input).eq('id', candidateId)

  if (error) {
    console.error('updateCandidate error:', error)
    throw new Error('候補者情報の更新に失敗しました。')
  }

  revalidatePath('/adm/funnel')
}

// ── NEW-3 採用ブランディング支援 ──────────────────────────────────────────

/** 求人票の差別化ポイントを生成（gemini-2.5-flash でコスト最適化） */
export async function generateDifferentiationPoints(input: BrandingPromptInput): Promise<{
  points: string[]
  summary: string
}> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const prompt = `あなたは採用ブランディングの専門家です。
以下の求人情報を分析し、他社との差別化ポイントを抽出してください。

求人職種: ${input.jobTitle}
業界: ${input.industry ?? '不明'}
設立年: ${input.foundingYear ? `${input.foundingYear}年` : '不明'}
採用強み（自社申告）: ${input.recruitmentStrengths ?? 'なし'}

差別化ポイントを5つ、箇条書きで出力してください。
その後、それらをまとめた一言サマリー（50字以内）を出力してください。

出力形式:
{
  "points": ["ポイント1", "ポイント2", "ポイント3", "ポイント4", "ポイント5"],
  "summary": "サマリー文"
}`

  const content = await generateGeminiContent({
    model: GEMINI_FLASH_MODEL,
    prompt,
    json: true,
    temperature: 0.7,
  })

  const parsed = JSON.parse(content) as { points: string[]; summary: string }
  return parsed
}

/** 媒体別求人票バリアントを生成して DB に保存（gemini-2.5-pro で品質優先） */
export async function generateBrandedVariants(
  input: BrandingPromptInput,
  differentiationPoints: string[],
  jobPostingId?: string
): Promise<GenerateVariantsResult> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const mediaPrompts: Record<MediaType, string> = {
    indeed: `Indeed向け（シンプルで明確な表現、検索ヒット率重視、給与・勤務条件を前面に、300字程度）`,
    linkedin: `LinkedIn向け（プロフェッショナル訴求、キャリア成長・企業文化を強調、400字程度）`,
    hellowork: `ハローワーク向け（公的な文体、必須要件を明示、福利厚生を詳述、300字程度）`,
    company_site: `自社採用サイト向け（企業ブランドを最大活用、ビジョン・カルチャー重視、500字程度）`,
  }

  const pointsText = differentiationPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')

  const generateForMedia = async (media: MediaType): Promise<JobPostingAiVariant | null> => {
    const prompt = `あなたは採用ブランディングの専門家です。
以下の情報をもとに、${mediaPrompts[media]}求人票を日本語で作成してください。

元の求人票:
職種: ${input.jobTitle}
内容: ${input.jobDescription}

会社情報:
社名: ${input.companyName}
業界: ${input.industry ?? '不明'}
設立: ${input.foundingYear ? `${input.foundingYear}年` : '不明'}

差別化ポイント:
${pointsText}

出力形式（JSON）:
{
  "title": "求人タイトル（40字以内）",
  "description": "求人説明文"
}`

    let content: string
    try {
      content = await generateGeminiContent({
        model: GEMINI_PRO_MODEL,
        prompt,
        json: true,
        temperature: 0.8,
      })
    } catch {
      return null
    }

    const generated = JSON.parse(content) as { title: string; description: string }

    const { data, error } = await supabase
      .from('job_posting_ai_variants')
      .insert({
        tenant_id: user.tenant_id,
        job_posting_id: jobPostingId ?? null,
        media_type: media,
        title: generated.title,
        description: generated.description,
        differentiation_points: pointsText,
        prompt_snapshot: JSON.parse(JSON.stringify(input)),
      })
      .select()
      .single()

    if (error) return null
    return data as JobPostingAiVariant
  }

  const results = await Promise.all(input.targetMedia.map(generateForMedia))
  const variants = results.filter((v): v is JobPostingAiVariant => v !== null)

  if (jobPostingId) revalidatePath(`/adm/job-branding/${jobPostingId}`)
  revalidatePath('/adm/job-branding')

  return { variants }
}

/** バリアントを求人票に適用（is_applied を true にし、job_postings を更新） */
export async function applyVariantToJobPosting(variantId: string): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { data: variant, error: fetchError } = await supabase
    .from('job_posting_ai_variants')
    .select('*')
    .eq('id', variantId)
    .single()

  if (fetchError || !variant) throw new Error('バリアントが見つかりません。')

  await supabase
    .from('job_posting_ai_variants')
    .update({ is_applied: true, applied_at: new Date().toISOString() })
    .eq('id', variantId)

  if (variant.job_posting_id) {
    await supabase
      .from('job_postings')
      .update({ title: variant.title, description: variant.description })
      .eq('id', variant.job_posting_id)

    revalidatePath(`/adm/job-branding/${variant.job_posting_id}`)
    revalidatePath(`/adm/job-positions/${variant.job_posting_id}`)
  }

  revalidatePath('/adm/job-branding')
}

/** テナントのブランディング補足情報を更新 */
export async function updateTenantBrandingInfo(info: TenantBrandingInfo): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()

  const { error } = await supabase
    .from('tenants')
    .update({
      industry: info.industry,
      founding_year: info.founding_year,
      recruitment_strengths: info.recruitment_strengths,
    })
    .eq('id', user.tenant_id)

  if (error) throw new Error('ブランディング情報の更新に失敗しました。')

  revalidatePath('/adm/job-branding')
}
