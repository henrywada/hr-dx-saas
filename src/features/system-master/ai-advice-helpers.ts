export const MAX_TITLE_LENGTH = 25
export const MAX_DESCRIPTION_LENGTH = 100

/**
 * 生成結果の文字数を仕様の上限内に防御的に切り詰める（LLMが制約を超える場合の保険）。
 */
export function truncateAiAdvice(data: { title: string; description: string }): {
  title: string
  description: string
} {
  return {
    title: data.title.slice(0, MAX_TITLE_LENGTH),
    description: data.description.slice(0, MAX_DESCRIPTION_LENGTH),
  }
}
