/**
 * 1on1 記録の AI 要約プロンプト生成。
 *
 * 外部 LLM（Gemini）へ送信されるため、**個人を識別できる情報を含めてはいけない**。
 * 1on1 記録には健康状態・私生活・人間関係の相談が含まれうるので、氏名や社員番号を
 * 添えると「要配慮個人情報を特定の個人と紐付けた形で第三者へ提供する」ことになる。
 *
 * 要約結果は one_on_one_sessions（employee_id 紐付け）に保存され、誰の記録かは
 * アプリ側で確定する。したがって氏名は要約の品質に一切寄与しない。
 *
 * この方針を回帰させないため summary-prompt.test.ts で検証している。
 * 引数を増やす際は、それが外部送信して良い情報かを必ず確認すること。
 */

export interface OneOnOneSummaryPromptInput {
  /** セッションのテーマ（管理者が入力した自由文） */
  theme: string | null
  /** 実施日時の表示用ラベル（JST） */
  conductedLabel: string
  /** 1on1 の記録本文（管理者が入力した自由文） */
  notes: string
}

export const ONE_ON_ONE_SUMMARY_SYSTEM_PROMPT =
  'あなたは日本の人事向け1on1記録アシスタントです。事実のみを簡潔な日本語で要約し、箇条書き3〜5点と次アクション1行を含めてください。'

export function buildOneOnOneSummaryPrompt(input: OneOnOneSummaryPromptInput): string {
  return [
    '以下の1on1記録を要約してください。',
    '',
    `テーマ: ${input.theme ?? ''}`,
    `実施日: ${input.conductedLabel}`,
    '',
    '記録:',
    input.notes,
  ].join('\n')
}
