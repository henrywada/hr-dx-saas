/** 文末の句読点・疑問符 */
const PUNCT = /[？?！!。、,.・「」『』（）()【】\[\]…]/g

/** 助詞で区切って業務上の名詞句を取り出す */
const PARTICLE = /[はがをにでともへのやや]/g

/** 質問文の末尾に付きやすい述語。長いものから順に落とす */
const TRAILING_PREDICATES = [
  'できないか',
  'できるか',
  'できない',
  'できる',
  'される',
  'させる',
  'する',
  'なる',
  'よいか',
  'よい',
  'して',
]

/** 検索語に残さない指示語・疑問語 */
const STOP_WORDS = new Set([
  'この',
  'その',
  'あの',
  'これ',
  'それ',
  'あれ',
  '誰',
  '何',
  'いつ',
  'どこ',
  'どの',
  'どう',
  'なぜ',
  '場合',
  'とき',
])

const LEADING_DEMONSTRATIVE = /^(この|その|あの)/

/**
 * 人事・経営者が入力する業務質問から、法令検索APIに渡す語を取り出す。
 * 条文番号や通達名を知らない前提なので、現場の処理に出てくる名詞句を残す。
 */
export function extractSearchKeyword(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return ''

  // 「できる」の「で」を助詞として切らないよう、述語を先に落とす
  let prepared = trimmed.replace(PUNCT, ' ').replace(/\s+/g, '').trim()
  for (const pred of TRAILING_PREDICATES) {
    if (prepared.endsWith(pred) && prepared.length > pred.length) {
      prepared = prepared.slice(0, -pred.length)
      break
    }
  }

  const tokens = prepared
    .split(PARTICLE)
    .map(normalizeToken)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t) && !/^(何|誰|いつ|どう)/.test(t))

  return tokens.join(' ') || trimmed.replace(PUNCT, '').trim()
}

function normalizeToken(raw: string): string {
  let token = raw.replace(/\s+/g, '').trim()
  token = token.replace(LEADING_DEMONSTRATIVE, '')
  for (const pred of TRAILING_PREDICATES) {
    if (token.endsWith(pred) && token.length > pred.length) {
      token = token.slice(0, -pred.length)
      break
    }
  }
  return token
}

/** 検索APIのANDを壊す現場語・汎用語 */
const GENERIC_SEARCH_TOKENS = new Set([
  '社内',
  '対象者',
  '共有',
  '実施',
  '計算',
  'できるか',
  'きるか',
  '上限',
  '限度額',
  '税金',
  '課税',
  '処理',
  '残業上限',
  '非課税限度額',
  '取らせる',
  '産休中',
])

/** 現場の呼び方 → 法令名に含まれる語 */
const LAW_TITLE_ALIASES: Record<string, string> = {
  契約社員: '労働契約',
  雇止め: '労働契約',
  有期雇用: '労働契約',
  有期契約: '労働契約',
  派遣社員: '労働者派遣',
  派遣: '労働者派遣',
  育休: '育児休業',
  内部通報: '公益通報',
}

/** 現場の呼び方 → 通達・裁決事例が実際にヒットする語 */
const SEARCH_ALIASES: Record<string, string> = {
  ...LAW_TITLE_ALIASES,
  損金算入: '損金',
  出張手当: '旅費',
  産休: '産前産後',
  産休中: '産前産後',
}

/**
 * e-Gov の法令名検索に渡す語を返す。
 * 法令名は「個人情報」「育児休業」のように短い語で部分一致するため、
 * 質問文を空白つなぎにしたまま渡すと 0 件になる。
 */
export function extractLawTitleKeywords(query: string): string[] {
  return pickKeywords(query, LAW_TITLE_ALIASES, GENERIC_SEARCH_TOKENS)
}

/**
 * 裁決事例・厚労省通達・安衛通達向けの検索語。
 * これらのAPIは空白区切りを AND にするため、質問文をそのまま渡すと 0 件になる。
 * 先頭が実際の検索に使う代表語。
 */
export function extractKeywordCandidates(query: string): string[] {
  return pickKeywords(query, SEARCH_ALIASES, GENERIC_SEARCH_TOKENS)
}

function pickKeywords(
  query: string,
  aliases: Record<string, string>,
  genericTokens: Set<string>
): string[] {
  const extracted = extractSearchKeyword(query)
  const tokens = extracted.split(/\s+/).filter(Boolean)
  const keywords = new Set<string>()
  const haystack = `${query} ${extracted}`
  const aliasValues = new Set(Object.values(aliases))

  for (const [alias, mapped] of Object.entries(aliases)) {
    if (haystack.includes(alias)) keywords.add(mapped)
  }

  for (const token of tokens) {
    if (genericTokens.has(token)) continue
    if (aliases[token]) continue
    keywords.add(token)
  }

  if (keywords.size === 0 && tokens[0]) keywords.add(tokens[0])

  return [...keywords].sort((a, b) => {
    const boost = (k: string) => (aliasValues.has(k) ? 10 : 0)
    return b.length + boost(b) - (a.length + boost(a))
  })
}
