import type { NotionInfoItem, NotionQueryPage } from './types'

type NotionProperty = Record<string, unknown>

/** rich_text / title の plain_text を連結する */
export function normalizeRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as NotionProperty
  const segments = (p.rich_text ?? p.title) as Array<{ plain_text?: string }> | undefined
  if (!Array.isArray(segments)) return ''
  return segments.map(s => s.plain_text ?? '').join('')
}

/** HTML の br を改行に変換し、残りのタグを除去する（innerHTML は使わない） */
export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

/** プロパティから文字列値を取得する */
function readText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as NotionProperty
  switch (p.type) {
    case 'title':
    case 'rich_text':
      return normalizeRichText(prop)
    case 'url':
      return typeof p.url === 'string' ? p.url : ''
    case 'number':
      return p.number != null ? String(p.number) : ''
    case 'select':
      return (p.select as { name?: string } | null)?.name ?? ''
    case 'multi_select':
      return ((p.multi_select as Array<{ name?: string }>) ?? [])
        .map(s => s.name ?? '')
        .join(', ')
    default:
      return ''
  }
}

/** date プロパティの start 値を取得する */
function readDate(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as NotionProperty
  if (p.type !== 'date') return null
  const date = p.date as { start?: string } | null
  return date?.start ?? null
}

/** タイトル: 「タイトル」プロパティを優先し、無ければ最初の title 型プロパティ */
function resolveTitle(properties: Record<string, unknown>): string {
  if ('タイトル' in properties) {
    const t = readText(properties['タイトル'])
    if (t) return t
  }
  for (const prop of Object.values(properties)) {
    if (prop && typeof prop === 'object' && (prop as NotionProperty).type === 'title') {
      const t = readText(prop)
      if (t) return t
    }
  }
  return ''
}

/** 助成金額: number なら文字列化、rich_text ならそのまま */
function resolveAmount(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const p = prop as NotionProperty
  if (p.type === 'number') {
    return p.number != null ? String(p.number) : null
  }
  const text = readText(prop)
  return text || null
}

/** 区分: select の name または rich_text */
function resolveCategory(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null
  const text = readText(prop)
  return text || null
}

/** Notion ページを NotionInfoItem にマッピングする */
export function mapNotionPage(page: NotionQueryPage): NotionInfoItem {
  const { id, properties } = page

  const summaryRaw = readText(properties['要約'])
  const bodyRaw = readText(properties['ページの本文（詳細）'])

  return {
    id,
    collectedAt: readDate(properties['収集日時']),
    title: resolveTitle(properties),
    summary: summaryRaw,
    url: readText(properties['URL']) || null,
    body: stripUnsafeHtml(bodyRaw),
    amount: resolveAmount(properties['助成金額']),
    openDate: readDate(properties['募集開始日']),
    deadline: readDate(properties['募集期限']),
    category: resolveCategory(properties['区分']),
  }
}
