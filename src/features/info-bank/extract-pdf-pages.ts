import type { Buffer } from 'node:buffer'

import type { PageText } from './locate-page'

/** PDF をページ単位のテキストにする（出典のページ特定用。取り込みの抽出とは別に、表示時だけ使う） */
export async function extractPdfPages(buffer: Buffer): Promise<PageText[]> {
  // Node.js には DOMMatrix が無いため CanvasFactory を渡す（inquiry-chat/extractors/pdf.ts と同じ理由）
  const { CanvasFactory } = await import('pdf-parse/worker')
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    CanvasFactory,
  })
  try {
    const result = await parser.getText()
    return result.pages.map(p => ({ num: p.num, text: p.text }))
  } finally {
    await parser.destroy()
  }
}
