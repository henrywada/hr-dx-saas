'use server'

import { z } from 'zod'

import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { getGeminiClient } from '@/lib/ai/gemini'

import { buildAnswerPrompt, parseAnswer } from './answer'
import { requestAnswer, type AnswerClient } from './answer-llm'
import { INFO_BANK_NO_ANSWER_TEXT } from './constants'
import { consumeAskQuota } from './rate-limit'
import { createSearchDeps, runSearch } from './search'
import type { InfoBankAnswer } from './types'

const MAX_QUESTION_LENGTH = 300

const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, '質問を入力してください')
    .max(MAX_QUESTION_LENGTH, `質問は${MAX_QUESTION_LENGTH}文字以内です`),
  mode: z.enum(['auto', 'text', 'rag']).default('auto'),
})

export type AskResult = { ok: true; data: InfoBankAnswer } | { ok: false; error: string }

/**
 * 社内資料だけを根拠に質問へ回答する。
 * 検索は呼び出しユーザーの権限（RLS）で行い、ヒットが無ければ LLM を呼ばず固定文言を返す。
 */
export async function askInfoBankAction(input: {
  question: string
  mode?: 'auto' | 'text' | 'rag'
}): Promise<AskResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { ok: false, error: 'ログイン情報が無効です' }

  const parsed = askSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? '入力を確認してください' }
  const { question, mode } = parsed.data

  try {
    const supabase = await createClient()

    // 検索・埋め込み・回答生成のいずれよりも先に枠を消費する（Gemini のコスト暴走対策）
    const quota = await consumeAskQuota((fn, args) => supabase.rpc(fn, args))
    if (quota.ok === false) return { ok: false, error: quota.error }

    const { hits, modeUsed } = await runSearch(createSearchDeps(supabase), { question, mode })

    if (hits.length === 0) {
      return {
        ok: true,
        data: { answerable: false, answer: INFO_BANK_NO_ANSWER_TEXT, citations: [], modeUsed },
      }
    }

    const { system, prompt } = buildAnswerPrompt(question, hits)
    const raw = await requestAnswer(getGeminiClient() as unknown as AnswerClient, {
      system,
      prompt,
    })
    return { ok: true, data: parseAnswer(raw, hits, modeUsed) }
  } catch (e) {
    console.error('[info-bank] askInfoBankAction', e instanceof Error ? e.message : e)
    return { ok: false, error: '回答の取得に失敗しました。時間をおいてもう一度お試しください' }
  }
}
