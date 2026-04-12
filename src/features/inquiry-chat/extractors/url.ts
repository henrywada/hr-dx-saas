import { Buffer } from 'node:buffer'
import dns from 'node:dns/promises'
import { load } from 'cheerio'

/** プライベート・ローカル向け IPv4 を拒否（SSRF 対策） */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1') return true
  if (lower.startsWith('fe80:')) return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.split(':').pop()
    if (v4 && /^\d+\.\d+\.\d+\.\d+$/.test(v4)) return isPrivateIpv4(v4)
  }
  return false
}

async function assertFetchTargetSafe(urlStr: string): Promise<void> {
  const u = new URL(urlStr)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('http または https の URL のみ取り込めます')
  }
  const host = u.hostname
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('このホストには接続できません')
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateIpv4(host)) throw new Error('このアドレスには接続できません')
    return
  }

  const lookups = await dns.lookup(host, { all: true, verbatim: true })
  for (const l of lookups) {
    if (l.family === 4) {
      if (isPrivateIpv4(l.address)) throw new Error('このアドレスには接続できません')
    } else if (l.family === 6) {
      if (isPrivateIpv6(l.address)) throw new Error('このアドレスには接続できません')
    }
  }
}

function htmlToText(html: string): string {
  const $ = load(html)
  $('script, style, noscript, svg, iframe').remove()
  const text = $('body').length ? $('body').text() : $.text()
  return text.replace(/\s+/g, ' ').trim()
}

const MAX_BYTES = 5_000_000
const MAX_REDIRECTS = 6

/**
 * 公開 URL から本文テキストを取得（リダイレクト各ホップで SSRF チェック）
 */
export async function extractTextFromUrl(initialUrl: string): Promise<{ text: string; finalUrl: string }> {
  let url = initialUrl

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    await assertFetchTargetSafe(url)

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': 'HR-DX-InquiryRAG/1.0',
      },
      signal: AbortSignal.timeout(25_000),
    })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error('リダイレクトが不正です')
      url = new URL(loc, url).href
      continue
    }

    if (!res.ok) {
      throw new Error(`ページを取得できませんでした (HTTP ${res.status})`)
    }

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) {
      throw new Error('ページが大きすぎます（上限 5MB）')
    }

    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    const raw = Buffer.from(buf).toString('utf8')

    if (ctype.includes('html') || raw.trimStart().toLowerCase().startsWith('<!doctype html')) {
      return { text: htmlToText(raw), finalUrl: url }
    }

    return { text: raw.trim(), finalUrl: url }
  }

  throw new Error('リダイレクトが多すぎます')
}
