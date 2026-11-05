import { INFO_BANK_MAX_TERMS } from './constants'

const MIN_TERM_LENGTH = 2

/** 質問文の定型句（漢字を含むため区切り文字だけでは落ちないもの） */
const STOP_PHRASES = /教えて(ください|下さい)?|知りたい|お願い(します)?/g

/** 漢字・カタカナ（長音含む）・英数字の連続を語とみなす */
const TERM_PATTERN = /[\p{Script=Han}\p{Script=Katakana}ー々A-Za-z0-9]+/gu

/**
 * 質問からテキスト検索用のキーワードを取り出す。
 * ひらがなと句読点を区切りとして、漢字・カタカナ・英数字の連続を語にする。
 * 語が 1 つも取れない質問（ひらがなのみ等）は、記号を除いた全文を 1 語として返す。
 */
export function extractQueryTerms(question: string): string[] {
  const normalized = question.normalize('NFKC').replace(STOP_PHRASES, ' ')

  const terms: string[] = []
  for (const match of normalized.matchAll(TERM_PATTERN)) {
    const term = match[0]
    if (term.length >= MIN_TERM_LENGTH && !terms.includes(term)) {
      terms.push(term)
    }
  }
  if (terms.length > 0) return terms.slice(0, INFO_BANK_MAX_TERMS)

  const whole = normalized.replace(/[\s\p{P}\p{S}]/gu, '')
  return whole ? [whole] : []
}
