/**
 * 移行 CSV のバイト列をテキストにする。
 * UTF-16 LE/BE（BOM 付き）、UTF-8、CP932 を自動判定する。
 */
import { stripBom } from '@/features/attendance/work-time-csv-parse'

export function decodeCsvBytes(bytes: ArrayBuffer): { text: string; encoding: string } {
  const buf = new Uint8Array(bytes)
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { text: stripBom(new TextDecoder('utf-16le').decode(bytes)), encoding: 'utf-16le' }
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return { text: stripBom(new TextDecoder('utf-16be').decode(bytes)), encoding: 'utf-16be' }
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: stripBom(new TextDecoder('utf-8').decode(bytes)), encoding: 'utf-8' }
  }

  const utf8Text = stripBom(new TextDecoder('utf-8').decode(bytes))
  let sjisText = utf8Text
  try {
    sjisText = stripBom(new TextDecoder('shift-jis').decode(bytes))
  } catch {
    // shift-jis 非対応環境
  }
  const utf8Bad = (utf8Text.match(/\uFFFD/g) || []).length
  const sjisBad = (sjisText.match(/\uFFFD/g) || []).length
  if (sjisBad < utf8Bad) return { text: sjisText, encoding: 'shift_jis' }
  return { text: utf8Text, encoding: 'utf-8' }
}

/** 先頭行の TAB / カンマ数で区切りを決める */
export function detectDelimiter(text: string): ',' | '\t' {
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  const tabs = (first.match(/\t/g) || []).length
  const commas = (first.match(/,/g) || []).length
  return tabs > commas ? '\t' : ','
}
