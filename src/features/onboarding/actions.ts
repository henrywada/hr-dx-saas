'use server'

import * as cheerio from 'cheerio'
import { generateGeminiContent, GEMINI_PRO_MODEL } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { toJSTISOString } from '@/lib/datetime'
import { getServerUser } from '@/lib/auth/server-user'

export async function analyzeCompanyUrl(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove unnecessary tags
    $('script, style, noscript, nav, footer, iframe, svg, img').remove()

    let text = $('body').text()
    // Trim extra whitespaces and newlines
    text = text.replace(/\s+/g, ' ').trim()

    // Limit to 10000 characters to avoid exceeding token limits
    if (text.length > 10000) {
      text = text.substring(0, 10000)
    }

    const systemPrompt = `与えられたWebサイトのテキスト情報を元に、会社情報を抽出してください。無い情報は空文字を返してください。事業内容は魅力的になるように最大300文字程度で要約してください。

【出力形式】以下のキーを持つ JSON オブジェクトのみを出力してください（前後の説明文やコードフェンスは不要。該当情報が無いキーは空文字 "" にする）:
{
  "companyName": "会社名",
  "businessDescription": "事業内容を300文字程度で魅力的に要約",
  "missionVision": "理念やビジョン",
  "cultureAndBenefits": "社風、働く環境、福利厚生など抽出できる範囲で"
}`

    const resultString = await generateGeminiContent({
      model: GEMINI_PRO_MODEL,
      system: systemPrompt,
      prompt: `以下のテキストから会社情報を抽出して:\n\n${text}`,
      json: true,
    })

    const resultObj = JSON.parse(resultString)
    return { success: true, data: resultObj }
  } catch (error) {
    console.error('Error analyzing company URL:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function saveCompanyProfile(data: {
  companyName: string
  businessDescription: string
  missionVision: string
  cultureAndBenefits: string
}) {
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('テナント情報が見つかりません。')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('tenants')
    .update({
      company_name: data.companyName,
      business_description: data.businessDescription,
      mission_vision: data.missionVision,
      culture_and_benefits: data.cultureAndBenefits,
      onboarding_completed_at: toJSTISOString(),
    })
    .eq('id', serverUser.tenant_id)

  if (error) {
    console.error('Update tenant profile error:', error)
    throw new Error('会社プロフィールの保存に失敗しました。')
  }

  // 修正: サーバーアクション内での redirect は NEXT_REDIRECT エラーを引き起こすことがあるため
  // クライアント側に success を返して、クライアント側で遷移させます。
  return { success: true }
}
