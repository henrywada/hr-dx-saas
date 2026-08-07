import { createHash } from 'node:crypto'
import * as cheerio from 'cheerio'

/**
 * 助成金本文の正規化・ハッシュ・正規化キー生成（純粋関数群）。
 *
 * 助成金ごとに正規化キー（出典URL + タイトル正規化のハッシュ）を付与して重複排除し、
 * 本文ハッシュの差分で更新を検知する。
 */

/** 連続する空白（改行含む）を1つの半角スペースに畳み、前後を trim する */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** HTML 文字列からテキストを抽出する。J-グランツの detail は HTML のため本文化に用いる */
export function htmlToText(html: string): string {
  if (html.trim() === '') return ''
  return normalizeWhitespace(cheerio.load(html).text())
}

/** 本文テキストの sha256（hex）。更新検知に用いる */
export function computeBodyHash(text: string): string {
  return createHash('sha256').update(normalizeWhitespace(text), 'utf8').digest('hex')
}

/**
 * 正規化キー: 出典URL + 正規化タイトルから決定的に生成する sha256（hex）。
 * URL の末尾スラッシュ揺れやタイトルの空白揺れを吸収し、重複排除の安定キーにする。
 */
export function buildNormalizedKey(externalUrl: string, title: string): string {
  const normalizedUrl = externalUrl.trim().replace(/\/+$/, '').toLowerCase()
  const normalizedTitle = normalizeWhitespace(title)
  return createHash('sha256').update(`${normalizedUrl}\n${normalizedTitle}`, 'utf8').digest('hex')
}
